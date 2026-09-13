/**
 * Upstream provider resolution.
 *
 * Credentials live exclusively in the platform settings (DB, Redis-cached)
 * and are edited from /admin/settings — no env-var fallback. Per-model
 * baseUrl in the Models panel still overrides the default (useful for
 * Azure / resellers / self-hosted).
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
};

export async function resolveUpstream(provider: Provider, modelBaseUrl: string | null): Promise<UpstreamProvider> {
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

  // API key comes only from the DB (admin panel).
  const apiKey = stored?.api_key || '';

  return { baseUrl, apiKey };
}
