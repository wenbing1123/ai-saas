import { getRedis, prefixedKey, rateLimit } from '@/lib/redis/client';
import { redisKeys } from '@/lib/redis/keys';
import { authenticateApiKey, extractApiKey, type AuthError } from '@/lib/server/gateway-auth';
import { getEnabledCatalog, getModelByPublicId } from '@/lib/repositories/models';
import { getActiveEntitlement } from '@/lib/repositories/users';
import { getSettings } from '@/lib/repositories/settings';
import { settleUsage } from '@/lib/repositories/billing';
import { insertUsage } from '@/lib/repositories/usage';
import { touchTokenUsage } from '@/lib/repositories/tokens';
import { resolveUpstream } from './provider';
import {
  normalizeOpenAiUsage,
  normalizeAnthropicUsage,
  estimatePromptTokens,
  emptyUsage,
  mergeUsage,
} from './usage';
import { costFor, costSetOf, sellSetOf, settleCharge } from '@/lib/server/pricing';
import type { Model } from '@/lib/types';
import {
  Protocol,
  Provider,
  UsageStatus,
  PROVIDER_LABELS,
  PROTOCOL_LABELS,
} from '@/lib/db/enums';
import type { TokenUsage } from '@/lib/server/pricing';

// ---------------------------------------------------------------------------
// Error responses (protocol-native shapes)
// ---------------------------------------------------------------------------

const STATUS_BY_AUTH_ERROR: Record<AuthError['error'], number> = {
  missing_key: 401,
  invalid_key: 401,
  revoked_key: 401,
  expired_key: 401,
  user_suspended: 403,
  server_error: 500,
};

function gatewayError(protocol: Protocol, status: number, type: string, message: string, requestId: string) {
  const body =
    protocol === Protocol.Anthropic
      ? { type: 'error', error: { type, message } }
      : { error: { message, type, code: type.toUpperCase(), param: null as string | null } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });
}

async function recordBlocked(
  params: { userId: string; tokenId: string | null; modelId: string; provider: Provider },
  statusCode: number,
  message: string,
  requestId: string,
) {
  try {
    await insertUsage({
      ...params,
      requestId,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      costCents: '0',
      chargeCents: '0',
      debitCents: 0n,
      latencyMs: 0,
      statusCode,
      status: UsageStatus.Blocked,
      errorMessage: message,
    });
  } catch (err) {
    console.error('[gateway] failed to record blocked request', err);
  }
}

// ---------------------------------------------------------------------------
// Rate limit / concurrency guards (fail-open if Redis is briefly unreachable)
// ---------------------------------------------------------------------------

async function enforceRpm(tokenId: string, rpm: number): Promise<{ blocked: boolean; remaining: number }> {
  try {
    const result = await withTimeout(
      rateLimit.check(`gw:${tokenId}`, rpm, 60),
      250,
    );
    return { blocked: !result.allowed, remaining: result.remaining };
  } catch {
    return { blocked: false, remaining: rpm };
  }
}

async function acquireConcurrency(userId: string, max: number): Promise<boolean> {
  try {
    const redis = getRedis();
    const key = prefixedKey(redisKeys.gatewayConcurrency(userId));
    const current = await withTimeout(redis.incr(key), 250);
    if (current === 1) await redis.expire(key, 120);
    if (current > max) {
      await redis.decr(key);
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function releaseConcurrency(userId: string) {
  try {
    const redis = getRedis();
    await withTimeout(redis.decr(prefixedKey(redisKeys.gatewayConcurrency(userId))), 250);
  } catch {
    /* best effort */
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('redis-timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// SSE teeing & usage extraction
// ---------------------------------------------------------------------------

function teeStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (chunk: Uint8Array) => void,
  onDone: () => Promise<void>,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let settled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (!settled) {
          settled = true;
          await onDone();
        }
        controller.close();
        return;
      }
      try {
        onChunk(value);
      } catch (err) {
        console.error('[gateway] sse parse error', err);
      }
      controller.enqueue(value);
    },
    async cancel(reason) {
      if (!settled) {
        settled = true;
        await onDone().catch(() => {});
      }
      await reader.cancel(reason);
    },
  });
}

function createOpenAiSseCollector(): { onChunk: (c: Uint8Array) => void; getUsage: () => TokenUsage } {
  const decoder = new TextDecoder();
  let buffer = '';
  let reported: TokenUsage | null = null;
  let fallbackChars = 0;

  const onChunk = (chunk: Uint8Array) => {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload) as Record<string, unknown>;
        const usage = obj.usage as Record<string, unknown> | undefined;
        if (usage) reported = normalizeOpenAiUsage(usage);
        const choices = obj.choices as Array<{ delta?: { content?: string } }> | undefined;
        const content = choices?.[0]?.delta?.content;
        if (typeof content === 'string') fallbackChars += content.length;
      } catch {
        /* partial frame */
      }
    }
  };

  return {
    onChunk,
    getUsage: () => {
      if (reported && (reported.inputTokens || reported.cacheReadTokens)) return reported;
      // Upstream ignored include_usage: estimate both sides from streamed text.
      const est = { inputTokens: reported?.inputTokens ?? 0, outputTokens: Math.ceil(fallbackChars / 4), cacheReadTokens: reported?.cacheReadTokens ?? 0, cacheWriteTokens: 0 };
      return est;
    },
  };
}

function createAnthropicSseCollector(): { onChunk: (c: Uint8Array) => void; getUsage: () => TokenUsage } {
  const decoder = new TextDecoder();
  let buffer = '';
  let start: Record<string, unknown> | null = null;
  let delta: Record<string, unknown> | null = null;
  let fallbackChars = 0;

  const onChunk = (chunk: Uint8Array) => {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const obj = JSON.parse(payload) as Record<string, unknown>;
        if (obj.type === 'message_start') start = obj;
        if (obj.type === 'message_delta') delta = obj;
        if (obj.type === 'content_block_delta') {
          const part = obj.delta as { text?: string } | undefined;
          if (typeof part?.text === 'string') fallbackChars += part.text.length;
        }
      } catch {
        /* partial frame */
      }
    }
  };

  return {
    onChunk,
    getUsage: () => {
      const usage = normalizeAnthropicUsage(start, delta);
      if (!usage.outputTokens) usage.outputTokens = Math.ceil(fallbackChars / 4);
      return usage;
    },
  };
}

// ---------------------------------------------------------------------------
// Public handlers
// ---------------------------------------------------------------------------

interface ResolvedCall {
  userId: string;
  tokenId: string;
  model: Model;
  body: Record<string, unknown>;
  entitlement: { rateLimitRpm: number; maxConcurrency: number; allowedModelIds: string[] } | null;
  requestId: string;
}

async function resolveCall(req: Request, protocol: Protocol): Promise<
  | { ok: true; call: ResolvedCall }
  | { ok: false; response: Response; meta?: { userId?: string; tokenId?: string; modelId?: string; provider: Provider } }
> {
  const requestId = crypto.randomUUID();
  const settings = await getSettings();
  if (settings.maintenance_mode) {
    return {
      ok: false,
      response: gatewayError(protocol, 503, 'api_error', 'The platform is temporarily in maintenance mode.', requestId),
      meta: { provider: Provider.Custom },
    };
  }

  const secret = extractApiKey(req);
  if (!secret) {
    const err: AuthError = { error: 'missing_key', message: 'Missing API key. Provide Authorization: Bearer <key> or x-api-key.' };
    return { ok: false, response: gatewayError(protocol, 401, 'authentication_error', err.message, requestId), meta: { provider: Provider.Custom } };
  }

  const auth = await authenticateApiKey(secret);
  if ('error' in auth) {
    return {
      ok: false,
      response: gatewayError(protocol, STATUS_BY_AUTH_ERROR[auth.error], auth.error === 'user_suspended' ? 'permission_error' : 'authentication_error', auth.message, requestId),
      meta: { provider: Provider.Custom },
    };
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      response: gatewayError(protocol, 400, 'invalid_request_error', 'Request body must be valid JSON.', requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, provider: Provider.Custom },
    };
  }

  const publicModelId = typeof body.model === 'string' ? body.model : '';
  const catalog = await getEnabledCatalog();
  const model = catalog.find((m) => m.modelId === publicModelId && m.protocol === protocol);
  if (!model) {
    const known = (await getModelByPublicId(publicModelId)) ?? null;
    if (known && known.protocol !== protocol) {
      return {
        ok: false,
        response: gatewayError(protocol, 400, 'invalid_request_error', `Model "${publicModelId}" is not available on this endpoint. Use the ${PROTOCOL_LABELS[known.protocol]} endpoint.`, requestId),
        meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: publicModelId, provider: Provider.Custom },
      };
    }
    return {
      ok: false,
      response: gatewayError(protocol, 404, 'invalid_request_error', `Unknown model: "${publicModelId}". GET /v1/models lists available models.`, requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: publicModelId, provider: Provider.Custom },
    };
  }

  const entitlement = await getActiveEntitlement(auth.user.id);
  const rpm = entitlement?.rateLimitRpm ?? settings.default_rpm;
  const concurrency = entitlement?.maxConcurrency ?? settings.default_concurrency;
  const allowed = entitlement?.allowedModelIds ?? [];
  if (entitlement && allowed.length > 0 && !allowed.includes(model.id)) {
    return {
      ok: false,
      response: gatewayError(protocol, 403, 'permission_error', `Your package does not include model "${model.modelId}". Upgrade at ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/billing.`, requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: model.modelId, provider: model.provider },
    };
  }

  // Pre-flight: balance must cover the estimated prompt cost at sell price.
  const balanceUsd = auth.user.balanceCents / 100;
  if (auth.user.balanceCents <= settings.low_balance_cents) {
    return {
      ok: false,
      response: gatewayError(protocol, 402, 'insufficient_balance', 'Your credit balance is empty. Top up at /dashboard/billing to continue.', requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: model.modelId, provider: model.provider },
    };
  }
  const estInputTokens = estimatePromptTokens(body);
  const estCostUsd = costFor({ inputTokens: estInputTokens, outputTokens: 0 }, sellSetOf(model));
  if (estCostUsd > balanceUsd) {
    return {
      ok: false,
      response: gatewayError(protocol, 402, 'insufficient_balance', `Insufficient balance for this request: estimated prompt cost $${estCostUsd.toFixed(4)}, balance $${balanceUsd.toFixed(2)}. Top up and retry.`, requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: model.modelId, provider: model.provider },
    };
  }

  const rl = await enforceRpm(auth.token.id, rpm);
  if (rl.blocked) {
    return {
      ok: false,
      response: gatewayError(protocol, 429, 'rate_limit_error', `Rate limit exceeded: ${rpm} requests/min on your current package.`, requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: model.modelId, provider: model.provider },
    };
  }

  const concurrencyOk = await acquireConcurrency(auth.user.id, concurrency);
  if (!concurrencyOk) {
    return {
      ok: false,
      response: gatewayError(protocol, 429, 'rate_limit_error', `Concurrent request limit (${concurrency}) reached. Retry shortly or upgrade your package.`, requestId),
      meta: { userId: auth.user.id, tokenId: auth.token.id, modelId: model.modelId, provider: model.provider },
    };
  }

  return {
    ok: true,
    call: {
      userId: auth.user.id,
      tokenId: auth.token.id,
      model,
      body,
      entitlement: entitlement ? { rateLimitRpm: rpm, maxConcurrency: concurrency, allowedModelIds: allowed } : null,
      requestId,
    },
  };
}

async function settle(
  call: ResolvedCall,
  usage: TokenUsage,
  latencyMs: number,
  statusCode: number,
  ok: boolean,
  errorMessage: string | null,
) {
  const { model } = call;
  const costUsd = costFor(usage, costSetOf(model));
  const chargeUsd = costFor(usage, sellSetOf(model));
  const money = settleCharge(costUsd, chargeUsd);

  await settleUsage({
    userId: call.userId,
    tokenId: call.tokenId,
    modelId: model.modelId,
    provider: model.provider,
    requestId: call.requestId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheWriteTokens ?? 0,
    costCents: money.costCents,
    chargeCents: money.chargeCents,
    debitCents: ok ? money.debitCents : 0n,
    latencyMs,
    statusCode,
    status: ok ? UsageStatus.Success : UsageStatus.UpstreamError,
    errorMessage,
  }).catch((err) => console.error('[gateway] settle failed', err));

  touchTokenUsage(call.tokenId, null).catch(() => {});
}

export async function handleListModels(req: Request): Promise<Response> {
  const secret = extractApiKey(req);
  if (!secret) {
    return gatewayError(Protocol.OpenAI, 401, 'authentication_error', 'Missing API key.', crypto.randomUUID());
  }
  const auth = await authenticateApiKey(secret);
  if ('error' in auth) {
    return gatewayError(Protocol.OpenAI, STATUS_BY_AUTH_ERROR[auth.error], 'authentication_error', auth.message, crypto.randomUUID());
  }
  const catalog = await getEnabledCatalog();
  return Response.json({
    object: 'list',
    data: catalog.map((m) => ({
      id: m.modelId,
      object: 'model',
      created: Math.floor(m.createdAt.getTime() / 1000),
      owned_by: PROVIDER_LABELS[m.provider],
    })),
  });
}

// ---------------------------------------------------------------------------
// POST /v1/chat/completions (OpenAI wire protocol)
// ---------------------------------------------------------------------------

export async function handleChatCompletions(req: Request): Promise<Response> {
  const resolved = await resolveCall(req, Protocol.OpenAI);
  if (!resolved.ok) {
    if (resolved.meta?.userId && resolved.meta?.modelId) {
      await recordBlocked(
        { userId: resolved.meta.userId, tokenId: resolved.meta.tokenId ?? null, modelId: resolved.meta.modelId, provider: resolved.meta.provider },
        resolved.response.status,
        await resolved.response.clone().text().catch(() => ''),
        resolved.response.headers.get('x-request-id') ?? crypto.randomUUID(),
      );
    }
    return resolved.response;
  }

  const { call } = resolved;
  const { model, body } = call;
  const upstream = await resolveUpstream(model.provider, model.baseUrl);
  if (!upstream.apiKey) {
    await releaseConcurrency(call.userId);
    return gatewayError(Protocol.OpenAI, 503, 'api_error', `Upstream credentials for provider "${PROVIDER_LABELS[model.provider]}" are not configured.`, call.requestId);
  }

  body.model = model.upstreamModel;
  const wantsStream = body.stream === true;
  if (wantsStream) {
    body.stream_options = { ...(body.stream_options as Record<string, unknown> | undefined), include_usage: true };
  }

  const started = Date.now();
  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(`${upstream.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${upstream.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    await releaseConcurrency(call.userId);
    await settle(call, emptyUsage(), Date.now() - started, 502, false, err instanceof Error ? err.message : 'upstream fetch failed');
    return gatewayError(Protocol.OpenAI, 502, 'api_error', 'The upstream provider connection failed.', call.requestId);
  }

  if (!upstreamResp.ok || !upstreamResp.body) {
    const text = await upstreamResp.text().catch(() => '{}');
    await settle(call, emptyUsage(), Date.now() - started, upstreamResp.status, false, text.slice(0, 1000));
    await releaseConcurrency(call.userId);
    return new Response(text, {
      status: upstreamResp.status,
      headers: { 'content-type': upstreamResp.headers.get('content-type') ?? 'application/json', 'x-request-id': call.requestId },
    });
  }

  if (!wantsStream) {
    const payload = (await upstreamResp.json()) as Record<string, unknown>;
    const usage = normalizeOpenAiUsage(payload.usage as Record<string, unknown> | undefined);
    await settle(call, usage, Date.now() - started, upstreamResp.status, true, null);
    await releaseConcurrency(call.userId);
    return Response.json(payload, { headers: { 'x-request-id': call.requestId } });
  }

  const collector = createOpenAiSseCollector();
  const stream = teeStream(
    upstreamResp.body,
    collector.onChunk,
    async () => {
      const usage = collector.getUsage();
      await settle(call, usage, Date.now() - started, 200, true, null);
      await releaseConcurrency(call.userId);
    },
  );

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': upstreamResp.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-request-id': call.requestId,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /v1/messages (Anthropic wire protocol — Claude Code)
// ---------------------------------------------------------------------------

export async function handleMessages(req: Request): Promise<Response> {
  const resolved = await resolveCall(req, Protocol.Anthropic);
  if (!resolved.ok) {
    if (resolved.meta?.userId && resolved.meta?.modelId) {
      await recordBlocked(
        { userId: resolved.meta.userId, tokenId: resolved.meta.tokenId ?? null, modelId: resolved.meta.modelId, provider: resolved.meta.provider },
        resolved.response.status,
        await resolved.response.clone().text().catch(() => ''),
        resolved.response.headers.get('x-request-id') ?? crypto.randomUUID(),
      );
    }
    return resolved.response;
  }

  const { call } = resolved;
  const { model, body } = call;
  const upstream = await resolveUpstream(model.provider, model.baseUrl);
  if (!upstream.apiKey) {
    await releaseConcurrency(call.userId);
    return gatewayError(Protocol.Anthropic, 503, 'api_error', `Upstream credentials for provider "${PROVIDER_LABELS[model.provider]}" are not configured.`, call.requestId);
  }

  body.model = model.upstreamModel;
  const wantsStream = body.stream === true;
  const anthropicVersion = req.headers.get('anthropic-version') ?? '2023-06-01';
  const anthropicBeta = req.headers.get('anthropic-beta');

  const started = Date.now();
  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(`${upstream.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': upstream.apiKey,
        'anthropic-version': anthropicVersion,
        ...(anthropicBeta ? { 'anthropic-beta': anthropicBeta } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    await releaseConcurrency(call.userId);
    await settle(call, emptyUsage(), Date.now() - started, 502, false, err instanceof Error ? err.message : 'upstream fetch failed');
    return gatewayError(Protocol.Anthropic, 502, 'api_error', 'The upstream provider connection failed.', call.requestId);
  }

  if (!upstreamResp.ok || !upstreamResp.body) {
    const text = await upstreamResp.text().catch(() => '{}');
    await settle(call, emptyUsage(), Date.now() - started, upstreamResp.status, false, text.slice(0, 1000));
    await releaseConcurrency(call.userId);
    return new Response(text, {
      status: upstreamResp.status,
      headers: { 'content-type': upstreamResp.headers.get('content-type') ?? 'application/json', 'x-request-id': call.requestId },
    });
  }

  if (!wantsStream) {
    const payload = (await upstreamResp.json()) as { usage?: Record<string, unknown> };
    const u = payload.usage ?? {};
    const usage = normalizeAnthropicUsage(
      { usage: { input_tokens: u.input_tokens ?? 0, cache_read_input_tokens: u.cache_read_input_tokens ?? 0, cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0 } },
      { usage: { output_tokens: u.output_tokens ?? 0 } },
    );
    await settle(call, usage, Date.now() - started, upstreamResp.status, true, null);
    await releaseConcurrency(call.userId);
    return Response.json(payload, { headers: { 'x-request-id': call.requestId } });
  }

  const collector = createAnthropicSseCollector();
  const stream = teeStream(
    upstreamResp.body,
    collector.onChunk,
    async () => {
      const usage = collector.getUsage();
      await settle(call, mergeUsage(usage, {}), Date.now() - started, 200, true, null);
      await releaseConcurrency(call.userId);
    },
  );

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': upstreamResp.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-request-id': call.requestId,
    },
  });
}
