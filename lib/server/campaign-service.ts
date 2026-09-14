import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { campaigns, campaignRecords, users, creditLedger } from '@/lib/db/schema';
import { CampaignType, LedgerType } from '@/lib/db/enums';
import type { CampaignRow } from '@/lib/db/schema';

/** Active campaign for a type (enabled and within its time window), or null. */
export async function getActiveCampaign(type: CampaignType): Promise<CampaignRow | null> {
  const db = getDb();
  const now = sql`now()`;
  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.type, type),
        eq(campaigns.enabled, true),
        sql`${campaigns.startsAt} <= ${now}`,
        sql`${campaigns.endsAt} IS NULL OR ${campaigns.endsAt} >= ${now}`,
      ),
    )
    .orderBy(sql`${campaigns.createdAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

export async function listCampaigns(): Promise<CampaignRow[]> {
  const db = getDb();
  return db.select().from(campaigns).orderBy(sql`${campaigns.type} ASC, ${campaigns.createdAt} DESC`);
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const db = getDb();
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function upsertCampaign(input: {
  id?: string;
  type: CampaignType;
  name: string;
  rewardCents: number;
  startsAt: Date;
  endsAt: Date | null;
  enabled: boolean;
  perUserLimit: number;
  totalBudgetCents: number | null;
}): Promise<CampaignRow> {
  const db = getDb();
  if (input.id) {
    const rows = await db
      .update(campaigns)
      .set({
        type: input.type,
        name: input.name,
        rewardCents: input.rewardCents,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        enabled: input.enabled,
        perUserLimit: input.perUserLimit,
        totalBudgetCents: input.totalBudgetCents,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, input.id))
      .returning();
    return rows[0];
  }
  const rows = await db
    .insert(campaigns)
    .values({
      type: input.type,
      name: input.name,
      rewardCents: input.rewardCents,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      enabled: input.enabled,
      perUserLimit: input.perUserLimit,
      totalBudgetCents: input.totalBudgetCents,
    })
    .returning();
  return rows[0];
}

/**
 * Atomically claim a campaign reward for a user. Returns the reward in cents,
 * or null if the user is not eligible (no active campaign, already claimed,
 * budget exhausted). All checks + credit happen in one transaction.
 */
export async function claimCampaign(
  type: CampaignType,
  userId: string,
  meta: Record<string, unknown> = {},
): Promise<number | null> {
  const campaign = await getActiveCampaign(type);
  if (!campaign) return null;

  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      // Lock the campaign row to serialize concurrent claims against the budget.
      const locked = await tx
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, campaign.id))
        .for('update');
      const c = locked[0];
      if (!c || !c.enabled) return null;

      // Per-user limit.
      const claimed = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(campaignRecords)
        .where(and(eq(campaignRecords.campaignId, c.id), eq(campaignRecords.userId, userId)));
      if (claimed[0].count >= c.perUserLimit) return null;

      // Total budget guard.
      if (c.totalBudgetCents != null) {
        const remaining = c.totalBudgetCents - c.consumedBudgetCents;
        if (remaining < c.rewardCents) return null;
      }

      const reward = c.rewardCents;

      // Insert claim record (unique constraint prevents double-claim races).
      await tx.insert(campaignRecords).values({
        campaignId: c.id,
        userId,
        rewardCents: reward,
        meta,
      });

      // Consume budget.
      await tx
        .update(campaigns)
        .set({ consumedBudgetCents: sql`consumed_budget_cents + ${reward}`, updatedAt: new Date() })
        .where(eq(campaigns.id, c.id));

      // Credit user balance + ledger entry.
      const updated = await tx
        .update(users)
        .set({ balanceCents: sql`balance_cents + ${BigInt(reward)}`, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({ balanceCents: users.balanceCents });
      const balanceAfter = Number(updated[0]?.balanceCents ?? 0);

      await tx.insert(creditLedger).values({
        userId,
        type: LedgerType.Campaign,
        amountCents: BigInt(reward),
        balanceAfterCents: BigInt(balanceAfter),
        refType: 'campaign',
        refId: c.id,
        note: c.name,
      });

      return reward;
    });
  } catch {
    // Unique violation (concurrent double-claim) — treat as not eligible.
    return null;
  }
}
