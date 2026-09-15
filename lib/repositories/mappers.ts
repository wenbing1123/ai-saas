import type {
  ModelRow,
  UserRow,
  PlanRow,
  OrderRow,
  ApiTokenRow,
  UsageRecordRow,
  CreditLedgerRow,
  SubscriptionRow,
  RoleRow,
  PermissionRow,
} from '@/lib/db/schema';
import type {
  User,
  Model,
  Plan,
  Order,
  ApiToken,
  UsageRecord,
  LedgerEntry,
  Subscription,
  Role,
  Permission,
} from '@/lib/types';

const n = (v: string | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));

export function mapUser(row: UserRow, roles: string[] = []): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles,
    status: row.status as User['status'],
    emailVerifiedAt: row.emailVerifiedAt,
    invitedById: row.invitedById,
    inviteCode: row.inviteCode,
    balanceCents: Number(row.balanceCents),
    currency: row.currency,
    packageExpireAt: row.packageExpireAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapRole(row: RoleRow): Role {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status as Role['status'],
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPermission(row: PermissionRow): Permission {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    module: row.module,
    type: row.type as Permission['type'],
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapModel(row: ModelRow): Model {
  return {
    id: row.id,
    provider: row.provider,
    protocol: row.protocol as Model['protocol'],
    modelId: row.modelId,
    upstreamModel: row.upstreamModel,
    baseUrl: row.baseUrl,
    displayName: row.displayName,
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    supportsVision: row.supportsVision,
    supportsTools: row.supportsTools,
    supportsReasoning: row.supportsReasoning,
    costCurrency: row.costCurrency,
    inputCostPer1m: n(row.inputCostPer1m),
    outputCostPer1m: n(row.outputCostPer1m),
    cacheReadCostPer1m: n(row.cacheReadCostPer1m),
    cacheWriteCostPer1m: n(row.cacheWriteCostPer1m),
    retailInputPer1m: n(row.retailInputPer1m),
    retailOutputPer1m: n(row.retailOutputPer1m),
    markupPercent: n(row.markupPercent),
    sellInputPer1m: n(row.sellInputPer1m),
    sellOutputPer1m: n(row.sellOutputPer1m),
    sellCacheReadPer1m: n(row.sellCacheReadPer1m),
    sellCacheWritePer1m: n(row.sellCacheWritePer1m),
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: Number(row.priceCents),
    creditCents: Number(row.creditCents),
    validDays: row.validDays,
    rateLimitRpm: row.rateLimitRpm,
    maxConcurrency: row.maxConcurrency,
    allowedModelIds: row.allowedModelIds ?? [],
    features: row.features ?? [],
    highlighted: row.highlighted,
    active: row.active,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNo: row.orderNo,
    userId: row.userId,
    planId: row.planId,
    amountCents: Number(row.amountCents),
    creditCents: Number(row.creditCents),
    currency: row.currency,
    status: row.status as Order['status'],
    paymentChannel: row.paymentChannel,
    paymentRef: row.paymentRef,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
    refundedAmountCents: Number(row.refundedAmountCents),
  };
}

export function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    orderId: row.orderId,
    rateLimitRpm: row.rateLimitRpm,
    maxConcurrency: row.maxConcurrency,
    allowedModelIds: row.allowedModelIds ?? [],
    startedAt: row.startedAt,
    expireAt: row.expireAt,
    status: row.status,
  };
}

export function mapApiToken(row: ApiTokenRow): ApiToken {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    prefix: row.prefix,
    status: row.status as ApiToken['status'],
    lastUsedAt: row.lastUsedAt,
    lastUsedIp: row.lastUsedIp,
    requestCount: Number(row.requestCount),
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export function mapUsage(row: UsageRecordRow): UsageRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenId: row.tokenId,
    modelId: row.modelId,
    provider: row.provider,
    requestId: row.requestId,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cacheReadTokens: row.cacheReadTokens,
    cacheWriteTokens: row.cacheWriteTokens,
    costCents: n(row.costCents),
    chargeCents: n(row.chargeCents),
    debitCents: Number(row.debitCents),
    currency: row.currency,
    latencyMs: row.latencyMs,
    statusCode: row.statusCode,
    status: row.status as UsageRecord['status'],
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
  };
}

export function mapLedger(row: CreditLedgerRow): LedgerEntry {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as LedgerEntry['type'],
    amountCents: Number(row.amountCents),
    balanceAfterCents: Number(row.balanceAfterCents),
    refType: row.refType,
    refId: row.refId,
    note: row.note,
    createdAt: row.createdAt,
  };
}
