/**
 * Pricing & cost engine — pure functions, no I/O.
 *
 * Guarantees
 * ----------
 * 1. DB CHECK constraints enforce sell >= cost at storage time.
 * 2. Service layer enforces sell >= cost * (1 + minMarkup%) as a business guardrail.
 * 3. Balance is debited with CEIL to the cent, so fractional-cent rounding never
 *    turns a profitable request into a loss.
 * 4. RMB-priced models are converted to USD at billing time using a buffered
 *    forex rate (rounded UP) so exchange-rate swings never create a loss.
 */

import { Currency } from '@/lib/db/enums';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/** USD prices per 1,000,000 tokens. */
export interface PriceSet {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface ModelPricingInput {
  inputCostPer1m: number;
  outputCostPer1m: number;
  cacheReadCostPer1m: number;
  cacheWriteCostPer1m: number;
  markupPercent: number;
  /** Amortized infrastructure surcharge ($/1M tokens), e.g. servers & domains. */
  infraSurchargePer1m?: number;
}

export const PER_MILLION = 1_000_000;

export function costFor(usage: TokenUsage, price: PriceSet): number {
  return (
    ((usage.inputTokens || 0) * price.input +
      (usage.outputTokens || 0) * price.output +
      (usage.cacheReadTokens || 0) * price.cacheRead +
      (usage.cacheWriteTokens || 0) * price.cacheWrite) /
    PER_MILLION
  );
}

export function costSetOf(input: {
  inputCostPer1m: number | string;
  outputCostPer1m: number | string;
  cacheReadCostPer1m: number | string;
  cacheWriteCostPer1m: number | string;
}): PriceSet {
  return {
    input: Number(input.inputCostPer1m),
    output: Number(input.outputCostPer1m),
    cacheRead: Number(input.cacheReadCostPer1m),
    cacheWrite: Number(input.cacheWriteCostPer1m),
  };
}

export function sellSetOf(input: {
  sellInputPer1m: number | string;
  sellOutputPer1m: number | string;
  sellCacheReadPer1m: number | string;
  sellCacheWritePer1m: number | string;
}): PriceSet {
  return {
    input: Number(input.sellInputPer1m),
    output: Number(input.sellOutputPer1m),
    cacheRead: Number(input.sellCacheReadPer1m),
    cacheWrite: Number(input.sellCacheWritePer1m),
  };
}

export function retailSetOf(input: {
  retailInputPer1m: number | string;
  retailOutputPer1m: number | string;
}): Pick<PriceSet, 'input' | 'output'> {
  return { input: Number(input.retailInputPer1m), output: Number(input.retailOutputPer1m) };
}

// ---------------------------------------------------------------------------
// Forex — convert native-currency prices to USD (the billing currency)
// ---------------------------------------------------------------------------

/**
 * Effective RMB-per-USD divisor, reduced by the safety buffer.
 * A smaller divisor → larger USD amount → cost is over-estimated, which is
 * the safe direction (we never under-charge relative to our RMB cost).
 */
export function effectiveForexDivisor(rateRmbPerUsd: number, bufferPercent: number): number {
  const r = rateRmbPerUsd > 0 ? rateRmbPerUsd : 1;
  const b = bufferPercent > 0 ? bufferPercent / 100 : 0;
  return r * (1 - b);
}

/**
 * Convert a native-currency per-1M price to USD.
 * - USD: identity.
 * - RMB: amount / (rate * (1 - buffer)), rounded UP to 6 dp.
 *
 * Rounding up on conversion guarantees the USD figure is never below the
 * true converted value, protecting the margin against rounding loss.
 */
export function convertToUsd(amount: number, currency: Currency, rateRmbPerUsd: number, bufferPercent: number): number {
  if (currency === Currency.USD || amount === 0) return amount;
  const divisor = effectiveForexDivisor(rateRmbPerUsd, bufferPercent);
  return Math.ceil((amount / divisor) * 1e6) / 1e6;
}

/** Convert a full native-currency PriceSet to USD. */
export function toUsdPriceSet(
  set: PriceSet,
  currency: Currency,
  rateRmbPerUsd: number,
  bufferPercent: number,
): PriceSet {
  if (currency === Currency.USD) return set;
  return {
    input: convertToUsd(set.input, currency, rateRmbPerUsd, bufferPercent),
    output: convertToUsd(set.output, currency, rateRmbPerUsd, bufferPercent),
    cacheRead: convertToUsd(set.cacheRead, currency, rateRmbPerUsd, bufferPercent),
    cacheWrite: convertToUsd(set.cacheWrite, currency, rateRmbPerUsd, bufferPercent),
  };
}

/** Round up to 6 decimal places (1M-token price precision). */
function round6(value: number): number {
  return Math.ceil(value * 1e6) / 1e6;
}

/**
 * Amortized infrastructure surcharge in USD per 1M tokens:
 * monthly infra cost (servers, domains…) spread over the forecast monthly
 * token consumption. Every token carries an equal share.
 */
export function infraSurchargePer1m(infraCostPerMonthUsd: number, forecastMonthlyTokensM: number): number {
  if (!forecastMonthlyTokensM || forecastMonthlyTokensM <= 0) return 0;
  return infraCostPerMonthUsd / forecastMonthlyTokensM;
}

/** Add the infra surcharge to every tier of a cost set. */
export function addSurcharge(cost: PriceSet, per1m: number): PriceSet {
  return {
    input: cost.input + per1m,
    output: cost.output + per1m,
    cacheRead: cost.cacheRead + per1m,
    cacheWrite: cost.cacheWrite + per1m,
  };
}

/**
 * Recommended sell prices from (cost + infra surcharge) × (1 + markup).
 * Rounded UP so the realized margin is never below the target.
 */
export function recommendSellPrices(input: ModelPricingInput): PriceSet {
  const factor = 1 + (input.markupPercent || 0) / 100;
  const c = addSurcharge(
    {
      input: input.inputCostPer1m,
      output: input.outputCostPer1m,
      cacheRead: input.cacheReadCostPer1m,
      cacheWrite: input.cacheWriteCostPer1m,
    },
    input.infraSurchargePer1m ?? 0,
  );
  return {
    input: round6(c.input * factor),
    output: round6(c.output * factor),
    cacheRead: round6(c.cacheRead * factor),
    cacheWrite: round6(c.cacheWrite * factor),
  };
}

export function marginPct(cost: number, sell: number): number {
  if (cost <= 0) return sell > 0 ? 100 : 0;
  return ((sell - cost) / cost) * 100;
}

/** Blended input+output margin for admin tables. */
export function blendedMarginPct(cost: PriceSet, sell: PriceSet): number {
  const c = cost.input + cost.output;
  const s = sell.input + sell.output;
  return marginPct(c, s);
}

export function savingsPct(retail: number, sell: number): number {
  if (retail <= 0) return 0;
  return Math.max(0, ((retail - sell) / retail) * 100);
}

export interface PricingViolation {
  field: string;
  message: string;
}

/**
 * Validate that sell prices clear BOTH the cost floor and the business margin
 * floor. Returns a list of violations (empty array = valid).
 */
export function validatePricing(
  cost: PriceSet,
  sell: PriceSet,
  minMarkupPercent: number,
): PricingViolation[] {
  const violations: PricingViolation[] = [];
  const fields: Array<{ key: keyof PriceSet; label: string }> = [
    { key: 'input', label: 'Input' },
    { key: 'output', label: 'Output' },
    { key: 'cacheRead', label: 'Cache read' },
    { key: 'cacheWrite', label: 'Cache write' },
  ];

  for (const { key, label } of fields) {
    const c = cost[key];
    const s = sell[key];
    if (s < c) {
      violations.push({
        field: key,
        message: `${label} sell price ($${s}) is below cost ($${c}) — this would lose money.`,
      });
    } else if (c > 0) {
      const floor = round6(c * (1 + minMarkupPercent / 100));
      if (s < floor) {
        violations.push({
          field: key,
          message: `${label} sell price yields less than the ${minMarkupPercent}% minimum margin (at least $${floor}).`,
        });
      }
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Money formatting
// ---------------------------------------------------------------------------

export function formatUsd(cents: number | bigint, opts: { fractionDigits?: number } = {}): string {
  const value = Number(cents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.fractionDigits ?? 2,
    maximumFractionDigits: opts.fractionDigits ?? 2,
  }).format(value);
}

export function formatUsdValue(usd: number, fractionDigits = 4): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(usd);
}

export function formatPricePerM(usd: number): string {
  if (usd === 0) return '—';
  return `$${usd.toFixed(usd < 0.01 ? 4 : 2)}`;
}

/** Format a per-1M price in an arbitrary native currency symbol ($ / ¥). */
export function formatPricePerMIn(value: number, symbol: string): string {
  if (value === 0) return '—';
  return `${symbol}${value.toFixed(value < 0.01 ? 4 : 2)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Settle a request: exact USD amounts → exact cent amounts on the usage record
 * (4 dp) and whole-cent debit charged to the balance.
 */
export function settleCharge(costUsd: number, chargeUsd: number) {
  const costCents = round4(costUsd * 100);
  const chargeCents = round4(chargeUsd * 100);
  // Ceiling to the cent guarantees rounding never flips into a loss.
  const debitCents = BigInt(Math.max(0, Math.ceil(chargeUsd * 100 - 1e-9)));
  return { costCents: costCents.toFixed(4), chargeCents: chargeCents.toFixed(4), debitCents };
}

function round4(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** Rough token estimate for pre-flight balance checks (~4 chars/token). */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}
