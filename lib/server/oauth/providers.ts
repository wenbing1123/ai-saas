import { getRedis, prefixedKey } from '@/lib/redis/client';
import { fetch as undiciFetch, ProxyAgent, type Dispatcher } from 'undici';

/**
 * Optional egress proxy for IdP back-channel calls (token exchange, profile
 * fetch) — Node's global fetch ignores HTTP(S)_PROXY, so servers that cannot
 * reach Google/GitHub directly set OAUTH_PROXY_URL (e.g. http://127.0.0.1:7897).
 * Empty = direct connection.
 */
const oauthDispatcher: Dispatcher | undefined = process.env.OAUTH_PROXY_URL
  ? new ProxyAgent(process.env.OAUTH_PROXY_URL)
  : undefined;

function ofetch(url: string, init: Parameters<typeof undiciFetch>[1]): ReturnType<typeof undiciFetch> {
  return undiciFetch(url, { ...init, dispatcher: oauthDispatcher });
}

/**
 * Pluggable OAuth 2.0 (authorization-code) provider registry.
 * Adding a new IdP = implement OAuthProvider + register it here. No schema or
 * route changes: the dynamic routes /api/auth/oauth/[provider]/* pick it up.
 */

export interface OAuthProfile {
  /** Stable IdP-side account id (Google `sub`, GitHub numeric id, …). */
  providerAccountId: string;
  email: string;
  name: string;
}

export interface OAuthProvider {
  id: string;
  /** Redirect URI registered at the IdP — derived from APP_URL. */
  redirectUri: string;
  /** Front-channel redirect target including state. */
  authorizeUrl(state: string): string;
  /** Back-channel code exchange. */
  exchangeCode(code: string): Promise<string>;
  /** Load the IdP profile with the access token. */
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
  /** True when client credentials are configured (controls button visibility). */
  isConfigured(): boolean;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

const google: OAuthProvider = {
  id: 'google',
  redirectUri: `${appUrl()}/api/auth/oauth/google/callback`,
  isConfigured: () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,

  authorizeUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code) {
    const resp = await ofetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!resp.ok) throw new Error(`google token exchange failed: ${await resp.text()}`);
    const json = (await resp.json()) as { access_token?: string };
    if (!json.access_token) throw new Error('google token exchange: no access_token');
    return json.access_token;
  },

  async fetchProfile(accessToken) {
    const resp = await ofetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) throw new Error(`google userinfo failed: ${await resp.text()}`);
    const p = (await resp.json()) as { sub: string; email?: string; name?: string };
    if (!p.email) throw new Error('google account has no email');
    return { providerAccountId: p.sub, email: p.email.toLowerCase(), name: p.name ?? p.email.split('@')[0] };
  },
};

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

const github: OAuthProvider = {
  id: 'github',
  redirectUri: `${appUrl()}/api/auth/oauth/github/callback`,
  isConfigured: () => !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,

  authorizeUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  },

  async exchangeCode(code) {
    const resp = await ofetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        redirect_uri: this.redirectUri,
      }),
    });
    if (!resp.ok) throw new Error(`github token exchange failed: ${await resp.text()}`);
    const json = (await resp.json()) as { access_token?: string };
    if (!json.access_token) throw new Error('github token exchange: no access_token');
    return json.access_token;
  },

  async fetchProfile(accessToken) {
    const headers = { authorization: `Bearer ${accessToken}`, accept: 'application/vnd.github+json' };
    const [userResp, emailsResp] = await Promise.all([
      ofetch('https://api.github.com/user', { headers }),
      ofetch('https://api.github.com/user/emails', { headers }),
    ]);
    if (!userResp.ok) throw new Error(`github user fetch failed: ${await userResp.text()}`);
    const u = (await userResp.json()) as { id: number; login: string; name?: string; email?: string };
    // Prefer the primary verified email; the profile email may be null/public.
    let email = u.email;
    if (emailsResp.ok) {
      const emails = (await emailsResp.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email ?? email;
    }
    if (!email) throw new Error('github account has no verified email');
    return { providerAccountId: String(u.id), email: email.toLowerCase(), name: u.name ?? u.login };
  },
};

// ---------------------------------------------------------------------------
// Registry + CSRF state helpers
// ---------------------------------------------------------------------------

const providers: Record<string, OAuthProvider> = { google, github };

export function getOAuthProvider(id: string): OAuthProvider | null {
  return providers[id] ?? null;
}

/** All registered IdPs — login page always shows their buttons. */
export function listProviderIds(): string[] {
  return Object.keys(providers);
}

/** IdPs with credentials configured — used for error messaging. */
export function listConfiguredProviders(): string[] {
  return Object.values(providers)
    .filter((p) => p.isConfigured())
    .map((p) => p.id);
}

const STATE_TTL_SECONDS = 600;

/** Create a one-time CSRF state bound to the provider. */
export async function createOAuthState(providerId: string): Promise<string> {
  const state = crypto.randomUUID() + crypto.randomUUID();
  const redis = getRedis();
  await redis.set(prefixedKey(`oauth:state:${state}`), providerId, 'EX', STATE_TTL_SECONDS);
  return state;
}

/** Consume a state (single-use) and verify it was issued for this provider. */
export async function consumeOAuthState(state: string, providerId: string): Promise<boolean> {
  if (!state || state.length > 128) return false;
  const redis = getRedis();
  const key = prefixedKey(`oauth:state:${state}`);
  const stored = await redis.get(key);
  if (!stored || stored !== providerId) return false;
  await redis.del(key); // one-time use
  return true;
}
