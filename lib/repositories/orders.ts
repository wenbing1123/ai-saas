import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { orders, plans, subscriptions, users, creditLedger } from '@/lib/db/schema';
import { mapOrder } from './mappers';
import type { Order, Plan, User } from '@/lib/types';
import { OrderStatus, PaymentChannel, LedgerType } from '@/lib/db/enums';

function genOrderNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NB-${ymd}-${rand}`;
}

export async function createOrder(
  user: User,
  plan: Plan,
  paymentChannel: PaymentChannel = PaymentChannel.Manual,
): Promise<Order> {
  const db = getDb();
  const rows = await db
    .insert(orders)
    .values({
      orderNo: genOrderNo(),
      userId: user.id,
      planId: plan.id,
      amountCents: BigInt(plan.priceCents),
      creditCents: BigInt(plan.creditCents),
      currency: user.currency,
      paymentChannel,
    })
    .returning();
  return mapOrder(rows[0]);
}

export async function listOrders(userId?: string, limit = 50) {
  const db = getDb();
  const rows = await db
    .select({ order: orders, planName: plans.name, planSlug: plans.slug })
    .from(orders)
    .innerJoin(plans, and(eq(orders.planId, plans.id), eq(plans.deleted, 0)))
    .where(
      and(
        eq(orders.deleted, 0),
        ...(userId ? [eq(orders.userId, userId)] : []),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...mapOrder(r.order), planName: r.planName, planSlug: r.planSlug }));
}

export async function getOrderById(id: string) {
  const db = getDb();
  const rows = await db
    .select({ order: orders, plan: plans })
    .from(orders)
    .innerJoin(plans, and(eq(orders.planId, plans.id), eq(plans.deleted, 0)))
    .where(and(eq(orders.id, id), eq(orders.deleted, 0)))
    .limit(1);
  return rows[0] ? { order: mapOrder(rows[0].order), plan: rows[0].plan } : null;
}

/**
 * Mark an order paid and settle its effects atomically:
 *   order → paid, balance += credit, package window extended,
 *   subscription row written, purchase ledger entry.
 * Idempotent: a second call on an already-paid order is a no-op.
 */
export async function markOrderPaid(orderId: string, paymentRef?: string): Promise<Order | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.deleted, 0)))
      .for('update');
    if (locked.length === 0) return null;
    const orderRow = locked[0];
    if (orderRow.status === OrderStatus.Paid) return mapOrder(orderRow);

    const planRows = await tx
      .select()
      .from(plans)
      .where(and(eq(plans.id, orderRow.planId), eq(plans.deleted, 0)));
    const plan = planRows[0];
    if (!plan) throw new Error('Plan not found');

    const now = new Date();
    // Extend from the later of "now" and the user's current entitlement end.
    const periodEndRows = await tx.execute<{ period_end: Date }>(sql`
      SELECT greatest(coalesce(${users.packageExpireAt}::timestamptz, now()), now())
               + (${plan.validDays} * interval '1 day') AS period_end
      FROM sys_user WHERE id = ${orderRow.userId}::uuid AND deleted = 0 FOR UPDATE
    `);
    // drizzle configures postgres-js to return timestamps as strings; revive to Date.
    const periodEnd = new Date(periodEndRows[0]!.period_end);

    const updatedOrder = await tx
      .update(orders)
      .set({
        status: OrderStatus.Paid,
        paidAt: now,
        periodStart: now,
        periodEnd,
        paymentRef: paymentRef ?? orderRow.paymentRef,
      })
      .where(eq(orders.id, orderId))
      .returning();

    const balanceRows = await tx
      .update(users)
      .set({
        balanceCents: sql`balance_cents + ${orderRow.creditCents}`,
        packageExpireAt: periodEnd,
        updatedAt: now,
      })
      .where(and(eq(users.id, orderRow.userId), eq(users.deleted, 0)))
      .returning({ balanceCents: users.balanceCents });

    await tx.insert(subscriptions).values({
      userId: orderRow.userId,
      planId: plan.id,
      orderId: orderRow.id,
      rateLimitRpm: plan.rateLimitRpm,
      maxConcurrency: plan.maxConcurrency,
      allowedModelIds: plan.allowedModelIds,
      startedAt: now,
      expireAt: periodEnd,
    });

    await tx.insert(creditLedger).values({
      userId: orderRow.userId,
      type: LedgerType.Purchase,
      amountCents: BigInt(orderRow.creditCents),
      balanceAfterCents: BigInt(balanceRows[0]!.balanceCents),
      refType: 'order',
      refId: orderRow.id,
      note: `Purchased ${plan.name}`,
    });

    return mapOrder(updatedOrder[0]);
  });
}

/**
 * Mark an order refunded. Reverses the credit grant (balance -= creditCents,
 * may go negative) and writes a refund ledger entry. Idempotent.
 */
export async function markOrderRefunded(orderId: string, amountCents?: number): Promise<Order | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const locked = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.deleted, 0)))
      .for('update');
    if (locked.length === 0) return null;
    const orderRow = locked[0];
    if (orderRow.status !== OrderStatus.Paid) return mapOrder(orderRow);

    const refundCents = BigInt(amountCents ?? Number(orderRow.amountCents));
    const now = new Date();

    const updatedOrder = await tx
      .update(orders)
      .set({
        status: OrderStatus.Refunded,
        refundedAt: now,
        refundedAmountCents: refundCents,
      })
      .where(eq(orders.id, orderId))
      .returning();

    // Reverse the credit grant. Balance may go negative if it was already spent.
    const balanceRows = await tx
      .update(users)
      .set({ balanceCents: sql`balance_cents - ${orderRow.creditCents}`, updatedAt: now })
      .where(and(eq(users.id, orderRow.userId), eq(users.deleted, 0)))
      .returning({ balanceCents: users.balanceCents });

    await tx.insert(creditLedger).values({
      userId: orderRow.userId,
      type: LedgerType.Refund,
      amountCents: BigInt(-Number(orderRow.creditCents)),
      balanceAfterCents: BigInt(balanceRows[0]!.balanceCents),
      refType: 'order',
      refId: orderRow.id,
      note: `Refunded order ${orderRow.orderNo}`,
    });

    return mapOrder(updatedOrder[0]);
  });
}

export async function getPaidRevenue(since: Date): Promise<{ orders: number; amountCents: number; creditCents: number }> {
  const db = getDb();
  const rows = await db.execute<{ orders: number; amount: string; credit: string }>(sql`
    SELECT
      count(*)::int AS orders,
      coalesce(sum(amount_cents), 0)::float AS amount,
      coalesce(sum(credit_cents), 0)::float AS credit
    FROM biz_order
    WHERE deleted = 0 AND status = ${OrderStatus.Paid} AND paid_at >= ${since.toISOString()}::timestamptz
  `);
  return {
    orders: Number(rows[0]?.orders ?? 0),
    amountCents: Number(rows[0]?.amount ?? 0),
    creditCents: Number(rows[0]?.credit ?? 0),
  };
}
