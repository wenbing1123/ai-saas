import type { TokenUsage } from '@/lib/server/pricing';

/**
 * Normalize upstream token reports into the platform's four-bucket shape:
 *   input (uncached) | output | cacheRead | cacheWrite
 *
 * OpenAI-family usage:
 *   { prompt_tokens, completion_tokens, prompt_tokens_details: { cached_tokens } }
 * DeepSeek:
 *   { prompt_tokens, completion_tokens, prompt_cache_hit_tokens, prompt_cache_miss_tokens }
 * Anthropic:
 *   { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }
 */
export function normalizeOpenAiUsage(usage: Record<string, unknown> | undefined | null): TokenUsage {
  if (!usage) return { inputTokens: 0, outputTokens: 0 };
  const prompt = Number(usage.prompt_tokens ?? 0);
  const completion = Number(usage.completion_tokens ?? 0);
  const details = (usage.prompt_tokens_details ?? {}) as Record<string, unknown>;

  const cacheHit = Number(
    (usage as Record<string, unknown>).prompt_cache_hit_tokens ?? details.cached_tokens ?? 0,
  );
  const cacheMiss = Number((usage as Record<string, unknown>).prompt_cache_miss_tokens ?? NaN);

  return {
    // DeepSeek reports miss explicitly; OpenAI prompt includes the cached part.
    inputTokens: Number.isFinite(cacheMiss) && cacheHit > 0 ? cacheMiss : Math.max(0, prompt - cacheHit),
    outputTokens: completion,
    cacheReadTokens: cacheHit,
    cacheWriteTokens: 0,
  };
}

export function normalizeAnthropicUsage(
  start: Record<string, unknown> | null,
  delta: Record<string, unknown> | null,
): TokenUsage {
  const startUsage = (start?.usage ?? {}) as Record<string, unknown>;
  const deltaUsage = (delta?.usage ?? {}) as Record<string, unknown>;
  return {
    inputTokens: Number(startUsage.input_tokens ?? 0),
    outputTokens: Number(deltaUsage.output_tokens ?? 0),
    cacheReadTokens: Number(startUsage.cache_read_input_tokens ?? 0),
    cacheWriteTokens: Number(startUsage.cache_creation_input_tokens ?? 0),
  };
}

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

export function mergeUsage(acc: TokenUsage, next: Partial<TokenUsage>): TokenUsage {
  return {
    inputTokens: acc.inputTokens + (next.inputTokens ?? 0),
    outputTokens: Math.max(acc.outputTokens, next.outputTokens ?? 0),
    cacheReadTokens: Math.max(acc.cacheReadTokens ?? 0, next.cacheReadTokens ?? 0),
    cacheWriteTokens: Math.max(acc.cacheWriteTokens ?? 0, next.cacheWriteTokens ?? 0),
  };
}

/** Best-effort pre-flight token estimate from a request body (~4 chars/token). */
export function estimatePromptTokens(body: Record<string, unknown>): number {
  let chars = 0;
  const walk = (value: unknown): void => {
    if (typeof value === 'string') chars += value.length;
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };

  if (typeof body.system === 'string' || Array.isArray(body.system)) walk(body.system);
  if (Array.isArray(body.messages)) walk(body.messages);
  if (typeof body.prompt === 'string') chars += body.prompt.length;
  return Math.ceil(chars / 4);
}
