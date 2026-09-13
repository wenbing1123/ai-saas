/**
 * Central numeric enums.
 *
 * Convention (Java-style YesNo): every enum-like DB column is `smallint`
 * with explicit CHECK constraints; application code uses these enums.
 * 0/1 is reserved for boolean-style flags (see YesNo, e.g. `deleted`);
 * regular enums start at 1.
 */

/** Boolean flag stored as smallint: 0 = no, 1 = yes. */
export enum YesNo {
  No = 0,
  Yes = 1,
}

export enum UserStatus {
  Active = 1,
  Suspended = 2,
}

export enum RoleStatus {
  Active = 1,
  Disabled = 2,
}

export enum PermissionType {
  Menu = 1,
  Action = 2,
}

export enum Provider {
  OpenAI = 1,
  Anthropic = 2,
  Google = 3,
  DeepSeek = 4,
  Azure = 5,
  Custom = 6,
}

export enum Protocol {
  OpenAI = 1,
  Anthropic = 2,
}

export enum OrderStatus {
  Pending = 1,
  Paid = 2,
  Canceled = 3,
  Refunded = 4,
}

export enum PaymentChannel {
  Stripe = 1,
  Manual = 2,
}

export enum SubscriptionStatus {
  Active = 1,
  Expired = 2,
}

export enum TokenStatus {
  Active = 1,
  Revoked = 2,
}

export enum UsageStatus {
  Success = 1,
  Blocked = 2,
  UpstreamError = 3,
}

export enum LedgerType {
  Purchase = 1,
  Usage = 2,
  Refund = 3,
  Adjustment = 4,
  Expiry = 5,
}

export enum DocLocale {
  En = 1,
  Zh = 2,
}

// ---------------------------------------------------------------------------
// Wire/UI label maps — numeric code at rest, stable string at system edges
// (public API JSON, upstream provider keys, i18n-neutral technical labels).
// ---------------------------------------------------------------------------

export const PROVIDER_LABELS: Record<Provider, string> = {
  [Provider.OpenAI]: 'openai',
  [Provider.Anthropic]: 'anthropic',
  [Provider.Google]: 'google',
  [Provider.DeepSeek]: 'deepseek',
  [Provider.Azure]: 'azure',
  [Provider.Custom]: 'custom',
};

export const PROVIDER_CODES: Record<string, Provider> = Object.fromEntries(
  Object.entries(PROVIDER_LABELS).map(([code, label]) => [label, Number(code) as Provider]),
) as Record<string, Provider>;

export const PROTOCOL_LABELS: Record<Protocol, string> = {
  [Protocol.OpenAI]: 'openai',
  [Protocol.Anthropic]: 'anthropic',
};

export const PROTOCOL_CODES: Record<string, Protocol> = Object.fromEntries(
  Object.entries(PROTOCOL_LABELS).map(([code, label]) => [label, Number(code) as Protocol]),
) as Record<string, Protocol>;

export const DOC_LOCALE_CODES = { en: DocLocale.En, zh: DocLocale.Zh } as const;
export const DOC_LOCALE_LABELS: Record<DocLocale, 'en' | 'zh'> = {
  [DocLocale.En]: 'en',
  [DocLocale.Zh]: 'zh',
};
