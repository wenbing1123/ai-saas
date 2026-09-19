import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  smallint,
  bigint,
  boolean,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  unique,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
  CampaignType,
  DocLocale,
  Currency,
  EmailTokenPurpose,
} from './enums';

/**
 * Nebula API — Token resale platform schema.
 *
 * Naming conventions
 * ------------------
 * Tables are prefixed by domain module:
 *   sys_*   system / identity / RBAC / platform config
 *   biz_*   business catalog & commerce (models, plans, orders, tokens)
 *   bill_*  metering & money (usage records, credit ledger)
 *
 * Every table carries the same common columns:
 *   id          uuid pk
 *   created_at  timestamptz default now()
 *   updated_at  timestamptz default now()
 *   deleted     smallint soft-delete flag, YesNo enum style: 0 = live, 1 = deleted
 *               (unique indexes are partial on deleted = 0, i.e. live rows only)
 *
 * Money conventions
 * -----------------
 * - *_cents  : bigint whole cents. Ledger & balances always use whole cents.
 * - *_per_1m : numeric(12,6) USD price per 1M tokens — supports sub-cent rates.
 * - charge/cost on usage rows: numeric(12,4) cents; balance debit uses CEIL
 *   to the cent so rounding can never flip a profit into a loss.
 */

// ---------------------------------------------------------------------------
// Common columns — spread into every table
// ---------------------------------------------------------------------------

const baseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** Soft-delete flag: 0 = live, 1 = deleted (Java YesNoEnum convention). */
  deleted: smallint('deleted').notNull().default(0),
};

// ---------------------------------------------------------------------------
// sys_* — identity & RBAC
// ---------------------------------------------------------------------------

export const users = pgTable(
  'sys_user',
  {
    ...baseColumns,
    email: varchar('email', { length: 255 }).notNull(),
    /** Null for OAuth-only accounts (no local password set yet). */
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 100 }).notNull(),
    /** UserStatus enum: 1 = active, 2 = suspended */
    status: smallint('status').notNull().default(UserStatus.Active).$type<UserStatus>(),
    /**
     * Null until the activation link is clicked. Login / console access is
     * rejected while this is null (status Suspended is a separate admin action).
     */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    /** Invite code that admitted this user (its creator = the inviter). */
    invitedById: uuid('invited_by_id'),
    /** Unique 6-char invite code (a-zA-Z0-9) every user gets to share. */
    inviteCode: varchar('invite_code', { length: 6 }).notNull(),
    /** Pre-paid credit balance in whole cents. */
    balanceCents: bigint('balance_cents', { mode: 'bigint' }).notNull().default(sql`0`),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    /** End of current package entitlement (rate-limit tier), extended on each purchase. */
    packageExpireAt: timestamp('package_expire_at', { withTimezone: true }),
  },
  (t) => [
    // Only live rows participate in uniqueness — a soft-deleted email can be re-registered.
    uniqueIndex('sys_user_email_unique').on(t.email).where(sql`${t.deleted} = 0`),
    uniqueIndex('sys_user_invite_code_unique').on(t.inviteCode).where(sql`${t.deleted} = 0`),
    index('sys_user_status_idx').on(t.status),
    index('sys_user_invited_by_idx').on(t.invitedById),
    check('sys_user_status_check', sql`${t.status} IN (1, 2)`),
  ],
);

export const roles = pgTable(
  'sys_role',
  {
    ...baseColumns,
    /** Stable machine code, e.g. admin | user */
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    /** RoleStatus enum: 1 = active, 2 = disabled */
    status: smallint('status').notNull().default(RoleStatus.Active).$type<RoleStatus>(),
    /** Built-in roles cannot be deleted. */
    isSystem: boolean('is_system').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(100),
  },
  (t) => [
    uniqueIndex('sys_role_code_unique').on(t.code).where(sql`${t.deleted} = 0`),
    check('sys_role_status_check', sql`${t.status} IN (1, 2)`),
  ],
);

export const permissions = pgTable(
  'sys_permission',
  {
    ...baseColumns,
    /** Permission code in `module:action` form, e.g. model:manage / user:view */
    code: varchar('code', { length: 100 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    /** Owning module, e.g. console / model / plan / user / role / setting / usage */
    module: varchar('module', { length: 50 }).notNull(),
    /** PermissionType enum: 1 = menu (nav/page), 2 = action (button/API) */
    type: smallint('type').notNull().default(PermissionType.Action).$type<PermissionType>(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(100),
  },
  (t) => [
    uniqueIndex('sys_permission_code_unique').on(t.code).where(sql`${t.deleted} = 0`),
    index('sys_permission_module_idx').on(t.module),
    check('sys_permission_type_check', sql`${t.type} IN (1, 2)`),
  ],
);

export const userRoles = pgTable(
  'sys_user_role',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references((): AnyPgColumn => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('sys_user_role_pair_unique').on(t.userId, t.roleId).where(sql`${t.deleted} = 0`),
    index('sys_user_role_role_idx').on(t.roleId),
  ],
);

export const rolePermissions = pgTable(
  'sys_role_permission',
  {
    ...baseColumns,
    roleId: uuid('role_id')
      .notNull()
      .references((): AnyPgColumn => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references((): AnyPgColumn => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('sys_role_permission_pair_unique').on(t.roleId, t.permissionId).where(sql`${t.deleted} = 0`),
    index('sys_role_permission_perm_idx').on(t.permissionId),
  ],
);

/** Key/value platform config. */
export const appSettings = pgTable(
  'sys_setting',
  {
    ...baseColumns,
    key: varchar('key', { length: 80 }).notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
  },
  (t) => [
    uniqueIndex('sys_setting_key_unique').on(t.key).where(sql`${t.deleted} = 0`),
  ],
);

/**
 * Generic entity translations. Base tables always hold the fallback text
 * (English); this table stores per-locale overrides — one row per
 * entity + field + locale. Scalar fields keep plain text in `value`;
 * array/object fields (e.g. plan features) store JSON-encoded text.
 * Resolution at the DTO layer: requested locale → fallback column.
 */
export const translations = pgTable(
  'sys_i18n_translation',
  {
    ...baseColumns,
    /** Logical entity code, e.g. 'plan'. */
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    /** PK of the translated row in its base table. */
    entityId: uuid('entity_id').notNull(),
    /** Base-table column being translated, e.g. 'name' / 'features'. */
    field: varchar('field', { length: 50 }).notNull(),
    /** DocLocale enum: 1 en, 2 zh. */
    locale: smallint('locale').notNull().$type<DocLocale>(),
    value: text('value').notNull(),
  },
  (t) => [
    uniqueIndex('sys_i18n_tr_unique')
      .on(t.entityType, t.entityId, t.field, t.locale)
      .where(sql`${t.deleted} = 0`),
    index('sys_i18n_tr_entity_idx').on(t.entityType, t.entityId),
    check('sys_i18n_tr_locale_check', sql`${t.locale} IN (1, 2)`),
  ],
);

/**
 * Single-use email tokens (activation links, password-reset links).
 * Only the SHA-256 hash is stored; the raw secret lives in the emailed link.
 * Each purpose row is consumed at most once and expires quickly.
 */
export const emailTokens = pgTable(
  'sys_email_token',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    /** EmailTokenPurpose enum: 1 = activate, 2 = password reset. */
    purpose: smallint('purpose').notNull().$type<EmailTokenPurpose>(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('sys_email_token_hash_unique').on(t.tokenHash).where(sql`${t.deleted} = 0`),
    index('sys_email_token_user_purpose_idx').on(t.userId, t.purpose),
    check('sys_email_token_purpose_check', sql`${t.purpose} IN (1, 2)`),
  ],
);

/**
 * Third-party OAuth identities linked to local users (Google, GitHub, …).
 * `provider` is a free-form varchar so adding a new IdP requires no migration.
 * A local user may link several providers; a provider identity maps to one user.
 */
export const oauthAccounts = pgTable(
  'sys_oauth_account',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    /** IdP identifier: 'google' | 'github' | future providers. */
    provider: varchar('provider', { length: 32 }).notNull(),
    /** The IdP's stable account id (sub for Google, numeric id for GitHub). */
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    /** Email reported by the IdP at link time (informational). */
    providerEmail: varchar('provider_email', { length: 255 }),
  },
  (t) => [
    uniqueIndex('sys_oauth_account_provider_id_unique')
      .on(t.provider, t.providerAccountId)
      .where(sql`${t.deleted} = 0`),
    index('sys_oauth_account_user_idx').on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// biz_* — catalog & commerce
// ---------------------------------------------------------------------------

export const models = pgTable(
  'biz_model',
  {
    ...baseColumns,
    /** Upstream provider, Provider enum (1 OpenAI … 6 Custom). */
    provider: smallint('provider').notNull().default(Provider.OpenAI).$type<Provider>(),
    /** Wire protocol the gateway speaks to the upstream, Protocol enum. */
    protocol: smallint('protocol').notNull().default(Protocol.OpenAI).$type<Protocol>(),
    /** Public model id used by customers in their requests, e.g. claude-sonnet-4-20250514 */
    modelId: varchar('model_id', { length: 100 }).notNull(),
    /** Actual model id sent upstream (allows aliases / version pinning). */
    upstreamModel: varchar('upstream_model', { length: 100 }).notNull(),
    /** Optional explicit upstream base URL; falls back to provider env mapping. */
    baseUrl: text('base_url'),
    displayName: varchar('display_name', { length: 150 }).notNull(),
    contextWindow: integer('context_window').notNull().default(0),
    maxOutputTokens: integer('max_output_tokens').notNull().default(0),
    supportsVision: boolean('supports_vision').notNull().default(false),
    supportsTools: boolean('supports_tools').notNull().default(true),
    supportsReasoning: boolean('supports_reasoning').notNull().default(false),

    /**
     * Procurement currency of this model's cost & sell prices.
     * 1 = USD (OpenAI / Anthropic / Google…), 2 = RMB (DeepSeek / Zhipu /
     * Doubao / Alibaba…). Prices are stored in this native currency and
     * converted to USD at billing time using the platform forex rate + buffer.
     */
    costCurrency: smallint('cost_currency').notNull().default(Currency.USD).$type<Currency>(),

    // ---- Our procurement cost (native currency per 1M tokens) ----
    inputCostPer1m: numeric('input_cost_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    outputCostPer1m: numeric('output_cost_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    cacheReadCostPer1m: numeric('cache_read_cost_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    cacheWriteCostPer1m: numeric('cache_write_cost_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),

    // ---- Official list price (for "save X%" marketing, not used in billing) ----
    retailInputPer1m: numeric('retail_input_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    retailOutputPer1m: numeric('retail_output_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),

    /** Markup applied on top of cost, percentage. Drives recommended sell price. */
    markupPercent: numeric('markup_percent', { precision: 6, scale: 2 }).notNull().default('20'),

    // ---- Customer sell price (USD per 1M tokens) — what we charge ----
    sellInputPer1m: numeric('sell_input_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    sellOutputPer1m: numeric('sell_output_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    sellCacheReadPer1m: numeric('sell_cache_read_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),
    sellCacheWritePer1m: numeric('sell_cache_write_per_1m', { precision: 12, scale: 6 }).notNull().default('0'),

    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(100),
  },
  (t) => [
    uniqueIndex('biz_model_model_id_unique').on(t.modelId).where(sql`${t.deleted} = 0`),
    index('biz_model_provider_idx').on(t.provider),
    index('biz_model_enabled_idx').on(t.enabled),
    // Hard floor at the database level: sell price can never be below cost.
    check('biz_model_sell_input_ge_cost', sql`${t.sellInputPer1m} >= ${t.inputCostPer1m}`),
    check('biz_model_sell_output_ge_cost', sql`${t.sellOutputPer1m} >= ${t.outputCostPer1m}`),
    check('biz_model_sell_cache_read_ge_cost', sql`${t.sellCacheReadPer1m} >= ${t.cacheReadCostPer1m}`),
    check('biz_model_sell_cache_write_ge_cost', sql`${t.sellCacheWritePer1m} >= ${t.cacheWriteCostPer1m}`),
    check('biz_model_markup_non_negative', sql`${t.markupPercent} >= 0`),
    check('biz_model_provider_check', sql`${t.provider} BETWEEN 1 AND 10`),
    check('biz_model_cost_currency_check', sql`${t.costCurrency} IN (1, 2)`),
    check('biz_model_protocol_check', sql`${t.protocol} IN (1, 2)`),
  ],
);

export const plans = pgTable(
  'biz_plan',
  {
    ...baseColumns,
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    /** Amount charged to the customer, cents. */
    priceCents: bigint('price_cents', { mode: 'bigint' }).notNull(),
    /** Credit granted to balance when paid, cents (may exceed price = bonus). */
    creditCents: bigint('credit_cents', { mode: 'bigint' }).notNull(),
    /** Entitlement window in days (rate-limit tier duration). */
    validDays: integer('valid_days').notNull().default(30),
    rateLimitRpm: integer('rate_limit_rpm').notNull().default(60),
    maxConcurrency: integer('max_concurrency').notNull().default(5),
    /** Empty array = all enabled models. */
    allowedModelIds: jsonb('allowed_model_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    features: jsonb('features').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    highlighted: boolean('highlighted').notNull().default(false),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(100),
  },
  (t) => [
    uniqueIndex('biz_plan_slug_unique').on(t.slug).where(sql`${t.deleted} = 0`),
    index('biz_plan_active_idx').on(t.active),
    check('biz_plan_price_positive', sql`${t.priceCents} > 0`),
    check('biz_plan_credit_positive', sql`${t.creditCents} > 0`),
    check('biz_plan_valid_days_positive', sql`${t.validDays} > 0`),
  ],
);

export const orders = pgTable(
  'biz_order',
  {
    ...baseColumns,
    orderNo: varchar('order_no', { length: 40 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references((): AnyPgColumn => plans.id, { onDelete: 'restrict' }),
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    creditCents: bigint('credit_cents', { mode: 'bigint' }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    /** OrderStatus enum: 1 pending, 2 paid, 3 canceled, 4 refunded */
    status: smallint('status').notNull().default(OrderStatus.Pending).$type<OrderStatus>(),
    /** PaymentChannel enum: 1 stripe, 2 manual (sandbox) */
    paymentChannel: smallint('payment_channel').notNull().default(PaymentChannel.Manual).$type<PaymentChannel>(),
    paymentRef: varchar('payment_ref', { length: 255 }),
    /** Entitlement window granted by this order. */
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    /** Refund bookkeeping. refundedAmountCents is 0 until a refund is issued. */
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    refundedAmountCents: bigint('refunded_amount_cents', { mode: 'bigint' }).notNull().default(sql`0`),
  },
  (t) => [
    uniqueIndex('biz_order_no_unique').on(t.orderNo).where(sql`${t.deleted} = 0`),
    index('biz_order_user_idx').on(t.userId, t.createdAt),
    index('biz_order_status_idx').on(t.status),
    check('biz_order_status_check', sql`${t.status} BETWEEN 1 AND 4`),
    check('biz_order_channel_check', sql`${t.paymentChannel} IN (1, 2)`),
  ],
);

/** One row per purchase; active entitlement = latest row with expire_at > now. */
export const subscriptions = pgTable(
  'biz_subscription',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references((): AnyPgColumn => plans.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id')
      .notNull()
      .references((): AnyPgColumn => orders.id, { onDelete: 'cascade' }),
    rateLimitRpm: integer('rate_limit_rpm').notNull(),
    maxConcurrency: integer('max_concurrency').notNull(),
    allowedModelIds: jsonb('allowed_model_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expireAt: timestamp('expire_at', { withTimezone: true }).notNull(),
    /** SubscriptionStatus enum: 1 active, 2 expired */
    status: smallint('status').notNull().default(SubscriptionStatus.Active).$type<SubscriptionStatus>(),
  },
  (t) => [
    index('biz_subscription_user_idx').on(t.userId, t.expireAt),
    check('biz_subscription_status_check', sql`${t.status} IN (1, 2)`),
  ],
);

export const apiTokens = pgTable(
  'biz_api_token',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    /** Only SHA-256 of the key is stored. */
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    /** Display prefix, e.g. sk-nebula-a1b2… */
    prefix: varchar('prefix', { length: 24 }).notNull(),
    /** TokenStatus enum: 1 active, 2 revoked */
    status: smallint('status').notNull().default(TokenStatus.Active).$type<TokenStatus>(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: varchar('last_used_ip', { length: 64 }),
    requestCount: bigint('request_count', { mode: 'bigint' }).notNull().default(sql`0`),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('biz_api_token_hash_unique').on(t.keyHash).where(sql`${t.deleted} = 0`),
    index('biz_api_token_user_idx').on(t.userId),
    check('biz_api_token_status_check', sql`${t.status} IN (1, 2)`),
  ],
);

// ---------------------------------------------------------------------------
// bill_* — metering & money
// ---------------------------------------------------------------------------

export const usageRecords = pgTable(
  'bill_usage_record',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    tokenId: uuid('token_id').references((): AnyPgColumn => apiTokens.id, { onDelete: 'set null' }),
    /** Snapshot of public model id. */
    modelId: varchar('model_id', { length: 100 }).notNull(),
    /** Snapshot of provider, Provider enum. */
    provider: smallint('provider').notNull().$type<Provider>(),
    requestId: varchar('request_id', { length: 80 }),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
    cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
    /** Exact upstream cost, cents (4-decimal precision). */
    costCents: numeric('cost_cents', { precision: 12, scale: 4 }).notNull().default('0'),
    /** Exact amount charged to the customer, cents. */
    chargeCents: numeric('charge_cents', { precision: 12, scale: 4 }).notNull().default('0'),
    /** Whole cents actually debited from balance (CEIL of charge). */
    debitCents: bigint('debit_cents', { mode: 'bigint' }).notNull().default(sql`0`),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    latencyMs: integer('latency_ms').notNull().default(0),
    statusCode: integer('status_code'),
    /** UsageStatus enum: 1 success, 2 blocked, 3 upstream_error */
    status: smallint('status').notNull().default(UsageStatus.Success).$type<UsageStatus>(),
    errorMessage: text('error_message'),
  },
  (t) => [
    index('bill_usage_user_created_idx').on(t.userId, t.createdAt),
    index('bill_usage_model_created_idx').on(t.modelId, t.createdAt),
    index('bill_usage_created_idx').on(t.createdAt),
    check('bill_usage_provider_check', sql`${t.provider} BETWEEN 1 AND 6`),
    check('bill_usage_status_check', sql`${t.status} BETWEEN 1 AND 3`),
  ],
);

export const creditLedger = pgTable(
  'bill_credit_ledger',
  {
    ...baseColumns,
    userId: uuid('user_id')
      .notNull()
      .references((): AnyPgColumn => users.id, { onDelete: 'cascade' }),
    /** LedgerType enum: 1 purchase, 2 usage, 3 refund, 4 adjustment, 5 expiry */
    type: smallint('type').notNull().$type<LedgerType>(),
    /** Signed amount in whole cents (+ top-up, − usage). */
    amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
    balanceAfterCents: bigint('balance_after_cents', { mode: 'bigint' }).notNull(),
    refType: varchar('ref_type', { length: 30 }),
    refId: uuid('ref_id'),
    note: text('note'),
  },
  (t) => [
    index('bill_credit_ledger_user_idx').on(t.userId, t.createdAt),
    index('bill_credit_ledger_type_idx').on(t.type),
    check('bill_credit_ledger_type_check', sql`${t.type} BETWEEN 1 AND 6`),
  ],
);

// ---------------------------------------------------------------------------
// cms_* — content management (docs)
// ---------------------------------------------------------------------------

/** Markdown documentation pages, editable in the admin CMS. Source of truth = PG. */
export const docPages = pgTable(
  'cms_doc_page',
  {
    ...baseColumns,
    /** URL slug, unique together with locale, e.g. quickstart / claude-code */
    slug: varchar('slug', { length: 120 }).notNull(),
    /** DocLocale enum: 1 en, 2 zh — the same logical page has one row per locale. */
    locale: smallint('locale').notNull().default(DocLocale.En).$type<DocLocale>(),
    title: varchar('title', { length: 200 }).notNull(),
    /** Sidebar grouping label, e.g. Getting Started / Clients / SDKs / Reference. */
    category: varchar('category', { length: 80 }).notNull().default('Getting Started'),
    /** Markdown body. Supports {{base_url}} and a lone {{models_table}} line. */
    content: text('content').notNull(),
    sortOrder: integer('sort_order').notNull().default(100),
    enabled: boolean('enabled').notNull().default(true),
  },
  (t) => [
    uniqueIndex('cms_doc_page_slug_locale_unique').on(t.slug, t.locale).where(sql`${t.deleted} = 0`),
    index('cms_doc_page_enabled_idx').on(t.enabled, t.locale, t.sortOrder),
    check('cms_doc_page_locale_check', sql`${t.locale} IN (1, 2)`),
  ],
);

// ---------------------------------------------------------------------------
// mkt_*  marketing campaigns (sign-up bonus, invite rewards, ...)
// ---------------------------------------------------------------------------

export const campaigns = pgTable(
  'mkt_campaign',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: smallint('type').notNull().$type<CampaignType>(),
    name: varchar('name', { length: 120 }).notNull(),
    rewardCents: integer('reward_cents').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    enabled: boolean('enabled').notNull().default(true),
    perUserLimit: integer('per_user_limit').notNull().default(1),
    totalBudgetCents: bigint('total_budget_cents', { mode: 'number' }),
    consumedBudgetCents: bigint('consumed_budget_cents', { mode: 'number' }).notNull().default(0),
    config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('mkt_campaign_type_idx').on(t.type, t.enabled),
    check('mkt_campaign_type_check', sql`${t.type} BETWEEN 1 AND 2`),
    check('mkt_campaign_reward_check', sql`${t.rewardCents} >= 0`),
  ],
);

export const campaignRecords = pgTable(
  'mkt_campaign_record',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    rewardCents: integer('reward_cents').notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('mkt_campaign_record_user_idx').on(t.userId, t.campaignId),
    unique('mkt_campaign_record_uniq').on(t.campaignId, t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type RoleRow = typeof roles.$inferSelect;
export type PermissionRow = typeof permissions.$inferSelect;
export type UserRoleRow = typeof userRoles.$inferSelect;
export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type ModelRow = typeof models.$inferSelect;
export type NewModelRow = typeof models.$inferInsert;
export type PlanRow = typeof plans.$inferSelect;
export type NewPlanRow = typeof plans.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type ApiTokenRow = typeof apiTokens.$inferSelect;
export type UsageRecordRow = typeof usageRecords.$inferSelect;
export type CreditLedgerRow = typeof creditLedger.$inferSelect;
export type AppSettingRow = typeof appSettings.$inferSelect;
export type TranslationRow = typeof translations.$inferSelect;
export type NewTranslationRow = typeof translations.$inferInsert;
export type DocPageRow = typeof docPages.$inferSelect;
export type NewDocPageRow = typeof docPages.$inferInsert;
export type CampaignRow = typeof campaigns.$inferSelect;
export type NewCampaignRow = typeof campaigns.$inferInsert;
export type EmailTokenRow = typeof emailTokens.$inferSelect;
export type OAuthAccountRow = typeof oauthAccounts.$inferSelect;
