import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { usageRecords, creditLedger, users } from '@/lib/db/schema';
import { Provider, UsageStatus, LedgerType } from '@/lib/db/enums';

export interface SettleInput {
  userId: string;
  tokenId: string | null;
  modelId: string;
  provider: Provider;
  requestId: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Exact upstream cost, cents (4dp as string). */
  costCents: string;
  /** Exact customer charge, cents (4dp as string). */
  chargeCents: string;
  /** Whole cents to debit from the balance (CEIL of charge). */
  debitCents: bigint;
  latencyMs: number;
  statusCode: number | null;
  status: UsageStatus;
  errorMessage: string | null;
}
export interface SettleResult {
  usageId: string;
  balanceAfterCents: number;
  debitCents: bigint;
}

/**
 * Settle one gateway request in a single transaction:
 *   usage row + atomic balance decrement + ledger entry.
 *
 * Post-paid model: the request already ran upstream, so even if the debit takes
 * the balance slightly negative (bounded to one request), the cost is still
 * recorded and the next request is blocked at the door until balance is topped
 * up. This is why pre-flight checks + low balance floors exist at the gateway.
 */
export async function settleUsage(input: SettleInput): Promise<SettleResult> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const usageRows = await tx.insert(usageRecords).values(input).returning({ id: usageRecords.id });

    // Conditional update keeps the operation safe if the user vanished.
    const balanceRows = await tx
      .update(users)
      .set({
        balanceCents: sql`balance_cents - ${input.debitCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, input.userId), eq(users.deleted, 0)))
      .returning({ balanceCents: users.balanceCents });

    const balanceAfter = balanceRows[0] ? Number(balanceRows[0].balanceCents) : 0;

    if (input.debitCents > 0n) {
      await tx.insert(creditLedger).values({
        userId: input.userId,
        type: LedgerType.Usage,
        amountCents: -input.debitCents,
        balanceAfterCents: BigInt(balanceAfter),
        refType: 'usage',
        refId: usageRows[0].id,
        note: `${input.modelId} · ${input.inputTokens} in / ${input.outputTokens} out tokens`,
      });
    }

    return { usageId: usageRows[0].id, balanceAfterCents: balanceAfter, debitCents: input.debitCents };
  });
}
