/** Public site configuration. */

export const appConfig = {
  name: 'Nebula API',
  tagline: 'Wholesale AI tokens for coding agents',
  /** Public origin customers point their SDKs at (the gateway). */
  gatewayUrl:
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@nebulaapi.dev',
};

export function gatewayBaseUrl(): string {
  return appConfig.gatewayUrl.replace(/\/+$/, '');
}
