import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users, creditLedger, subscriptions, plans, roles, userRoles } from '@/lib/db/schema';
import { mapUser, mapSubscription } from './mappers';
import { assignUserRoles, getRoleCodesByUser } from './rbac';
import type { User, Subscription } from '@/lib/types';
import { UserStatus, RoleStatus, LedgerType } from '@/lib/db/enums';
import { hashPassword } from '@/lib/server/crypto';

const live = eq(users.deleted, 0);

/** Map user rows + batch-load their role codes in one extra query. */
async function attachRoles(list: { id: string }[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (list.length === 0) return map;
  const db = getDb();
  const rows = await db
    .select({ userId: userRoles.userId, code: roles.code })
    .from(userRoles)
    .innerJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.deleted, 0)))
    .where(and(eq(userRoles.deleted, 0), eq(roles.status, RoleStatus.Active), inUserId(list.map((u) => u.id))));
  for (const r of rows) {
    const codes = map.get(r.userId) ?? [];
    codes.push(r.code);
    map.set(r.userId, codes);
  }
  return map;
}

function inUserId(ids: string[]) {
  return sql`${userRoles.userId} IN (${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )})`;
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  roleCodes?: string[];
}): Promise<User> {
  const db = getDb();
  const rows = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase().trim(),
      passwordHash: hashPassword(input.password),
      name: input.name.trim(),
    })
    .returning();
  const userRow = rows[0];
  // Every account gets the regular user role; callers may grant more.
  await assignUserRoles(userRow.id, input.roleCodes ?? ['user']);
  const roleCodes = await getRoleCodesByUser(userRow.id);
  return mapUser(userRow, roleCodes);
}

/** Includes password hash — authentication only. */
export async function findAuthUserByEmail(email: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), live))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = getDb();
  const rows = await db.select().from(users).where(and(eq(users.id, id), live)).limit(1);
  if (rows.length === 0) return null;
  const roleCodes = await getRoleCodesByUser(id);
  return mapUser(rows[0], roleCodes);
}

export async function listUsers(input: { q?: string; limit?: number; offset?: number } = {}) {
  const db = getDb();
  const { q, limit = 20, offset = 0 } = input;
  const qFilters: SQL[] = [live];
  if (q) qFilters.push(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))!);
  const where = and(...qFilters);

  const [rows, totalRows] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<string>`count(*)::int` }).from(users).where(where),
  ]);
  const roleMap = await attachRoles(rows);
  return {
    users: rows.map((row) => mapUser(row, roleMap.get(row.id) ?? [])),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

export async function setUserStatus(id: string, status: UserStatus) {
  const db = getDb();
  await db
    .update(users)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(users.id, id), live));
}

export async function changeUserPassword(id: string, newPassword: string) {
  const db = getDb();
  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() })
    .where(and(eq(users.id, id), live));
}

/**
 * Atomic balance adjustment with ledger entry. Positive = credit, negative = debit.
 * Returns the resulting balance (cents).
 */
export async function adjustBalance(
  userId: string,
  amountCents: number,
  meta: { type: LedgerType; note?: string; refType?: string; refId?: string },
): Promise<number> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({ balanceCents: sql`balance_cents + ${BigInt(amountCents)}`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), live))
      .returning({ balanceCents: users.balanceCents });

    if (updated.length === 0) throw new Error('User not found');
    const balanceAfter = Number(updated[0].balanceCents);

    await tx.insert(creditLedger).values({
      userId,
      type: meta.type,
      amountCents: BigInt(amountCents),
      balanceAfterCents: BigInt(balanceAfter),
      refType: meta.refType,
      refId: meta.refId,
      note: meta.note,
    });
    return balanceAfter;
  });
}

/** Latest non-expired package entitlement (rate limit tier). */
export async function getActiveEntitlement(userId: string): Promise<Subscription | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(subscriptions)
    .innerJoin(
      plans,
      and(eq(subscriptions.planId, plans.id), eq(plans.deleted, 0)),
    )
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.deleted, 0),
        sql`${subscriptions.expireAt} > now()`,
      ),
    )
    .orderBy(desc(subscriptions.expireAt))
    .limit(1);
  return rows[0] ? mapSubscription(rows[0].biz_subscription) : null;
}

export async function getUserStats(): Promise<{
  total: number;
  active: number;
  suspended: number;
  outstandingCreditCents: number;
}> {
  const db = getDb();
  const rows = await db.execute<{
    total: number;
    active: number;
    suspended: number;
    credit: string;
  }>(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = ${UserStatus.Active})::int AS active,
      count(*) FILTER (WHERE status = ${UserStatus.Suspended})::int AS suspended,
      coalesce(sum(balance_cents) FILTER (WHERE balance_cents > 0), 0)::float AS credit
    FROM sys_user
    WHERE deleted = 0
  `);
  const r = rows[0]!;
  return {
    total: Number(r.total),
    active: Number(r.active),
    suspended: Number(r.suspended),
    outstandingCreditCents: Number(r.credit),
  };
}

export async function listLedger(userId: string, limit = 30) {
  const db = getDb();
  const rows = await db
    .select()
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), eq(creditLedger.deleted, 0)))
    .orderBy(desc(creditLedger.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: Number(r.amountCents),
    balanceAfterCents: Number(r.balanceAfterCents),
    note: r.note,
    createdAt: r.createdAt,
  }));
}
