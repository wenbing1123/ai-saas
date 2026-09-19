/**
 * Upstream provider resolution.
 *
 * Credentials live exclusively in the platform settings (DB, Redis-cached)
 * and are edited from /admin/settings — no env-var fallback. Per-model
 * baseUrl / upstreamApiKey in the Models panel override the provider
 * defaults (useful for Azure / resellers / self-hosted / per-model keys).
 */

import { Provider, PROVIDER_LABELS } from '@/lib/db/enums';
import { getSettings } from '@/lib/repositories/settings';

export interface UpstreamProvider {
  baseUrl: string;
  apiKey: string;
}

/** Public default endpoint per provider (only used when DB base_url is empty). */
const DEFAULT_BASE_URL: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  deepseek: 'https://api.deepseek.com/v1',
  azure: '',
  custom: '',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
};

export async function resolveUpstream(
  provider: Provider,
  modelBaseUrl: string | null,
  /** Optional per-model key — overrides the provider-wide key from settings. */
  modelApiKey?: string | null,
): Promise<UpstreamProvider> {
  const label = PROVIDER_LABELS[provider] ?? 'custom';
  const settings = await getSettings();
  const stored = settings.upstream_providers?.[label];

  // model base_url > DB base_url > public default endpoint.
  const baseUrl = (
    modelBaseUrl ||
    stored?.base_url ||
    DEFAULT_BASE_URL[label] ||
    ''
  ).replace(/\/+$/, '');

  // Per-model key > provider key from the DB (admin panel).
  const apiKey = modelApiKey || stored?.api_key || '';

  return { baseUrl, apiKey };
}
