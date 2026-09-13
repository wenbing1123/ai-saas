/** Domain types used across the app. PG numeric/bigint values are mapped to number. */

import {
  UserStatus,
  RoleStatus,
  PermissionType,
  Provider,
  Protocol,
  OrderStatus,
  PaymentChannel,
  SubscriptionStatus,
  TokenStatus,
  UsageStatus,
  LedgerType,
} from '@/lib/db/enums';

// Re-export so callers can import everything from '@/lib/types'.
export {
  UserStatus,
  RoleStatus,
  PermissionType,
  Provider,
  Protocol,
  OrderStatus,
  PaymentChannel,
  SubscriptionStatus,
  TokenStatus,
  UsageStatus,
  LedgerType,
};

export interface User {
  id: string;
  email: string;
  name: string;
  /** RBAC role codes, resolved through sys_user_role → sys_role. */
  roles: string[];
  status: UserStatus;
  balanceCents: number;
  currency: string;
  packageExpireAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  type: PermissionType;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Logged-in user with their flat permission code list (merged across roles). */
export interface AuthUser extends User {
  permissions: string[];
}

export interface Model {
  id: string;
  provider: Provider;
  protocol: Protocol;
  modelId: string;
  upstreamModel: string;
  baseUrl: string | null;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsReasoning: boolean;
  inputCostPer1m: number;
  outputCostPer1m: number;
  cacheReadCostPer1m: number;
  cacheWriteCostPer1m: number;
  retailInputPer1m: number;
  retailOutputPer1m: number;
  markupPercent: number;
  sellInputPer1m: number;
  sellOutputPer1m: number;
  sellCacheReadPer1m: number;
  sellCacheWritePer1m: number;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  creditCents: number;
  validDays: number;
  rateLimitRpm: number;
  maxConcurrency: number;
  allowedModelIds: string[];
  features: string[];
  highlighted: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  planId: string;
  amountCents: number;
  creditCents: number;
  currency: string;
  status: OrderStatus;
  paymentChannel: PaymentChannel;
  paymentRef: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  createdAt: Date;
  paidAt: Date | null;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  orderId: string;
  rateLimitRpm: number;
  maxConcurrency: number;
  allowedModelIds: string[];
  startedAt: Date;
  expireAt: Date;
  status: SubscriptionStatus;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  status: TokenStatus;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  requestCount: number;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface UsageRecord {
  id: string;
  userId: string;
  tokenId: string | null;
  modelId: string;
  provider: Provider;
  requestId: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costCents: number;
  chargeCents: number;
  debitCents: number;
  currency: string;
  latencyMs: number;
  statusCode: number | null;
  status: UsageStatus;
  errorMessage: string | null;
  createdAt: Date;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: LedgerType;
  amountCents: number;
  balanceAfterCents: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: Date;
}

export interface UpstreamProviderConfig {
  api_key: string;
  base_url: string;
}

export interface PlatformSettings {
  min_markup_percent: number;
  /** Monthly infrastructure cost (servers, domains…) in USD cents, amortized into token prices. */
  infra_cost_per_month_cents: number;
  /** Forecast monthly token consumption (in millions) used to spread the infra cost. */
  forecast_monthly_tokens_m: number;
  /** Target profit margin % on top of (model cost + infra surcharge). */
  target_profit_percent: number;
  default_rpm: number;
  default_concurrency: number;
  low_balance_cents: number;
  maintenance_mode: boolean;
  currency: string;
  /**
   * Dynamic upstream provider credentials, keyed by provider wire label
   * (openai / anthropic / google / deepseek / azure / custom).
   * Falls back to UPSTREAM_* env vars when empty.
   */
  upstream_providers: Record<string, UpstreamProviderConfig>;
}
