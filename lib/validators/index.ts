import { z, type ZodError } from 'zod';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

/** First error message per field, ready for <FieldError> rendering. */
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const flat = error.flatten();
  return Object.fromEntries(
    Object.entries(flat.fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? 'Invalid value']),
  );
}

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const tokenNameSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
});

/** Model admin form — every price is a USD-per-1M string from the form. */
export const modelFormSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  protocol: z.enum(['openai', 'anthropic']),
  modelId: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._\-:]+$/, 'Only letters, numbers, dots, dashes, underscores and colons'),
  upstreamModel: z.string().trim().min(1).max(100),
  baseUrl: z.string().trim().url('Must be a valid URL').or(z.literal('')).optional(),
  displayName: z.string().trim().min(1).max(150),
  contextWindow: z.coerce.number().int().nonnegative(),
  maxOutputTokens: z.coerce.number().int().nonnegative(),
  supportsVision: z.coerce.boolean().default(false),
  supportsTools: z.coerce.boolean().default(true),
  supportsReasoning: z.coerce.boolean().default(false),
  costCurrency: z.enum(['usd', 'rmb']).default('usd'),
  inputCostPer1m: z.coerce.number().nonnegative(),
  outputCostPer1m: z.coerce.number().nonnegative(),
  cacheReadCostPer1m: z.coerce.number().nonnegative(),
  cacheWriteCostPer1m: z.coerce.number().nonnegative(),
  retailInputPer1m: z.coerce.number().nonnegative(),
  retailOutputPer1m: z.coerce.number().nonnegative(),
  markupPercent: z.coerce.number().min(0).max(500),
  sellInputPer1m: z.coerce.number().nonnegative(),
  sellOutputPer1m: z.coerce.number().nonnegative(),
  sellCacheReadPer1m: z.coerce.number().nonnegative(),
  sellCacheWritePer1m: z.coerce.number().nonnegative(),
  enabled: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int(),
  autoPrices: z.coerce.boolean().default(false),
});

export const planFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional().default(''),
  priceDollars: z.coerce.number().positive('Price must be greater than 0'),
  creditDollars: z.coerce.number().positive('Credit must be greater than 0'),
  validDays: z.coerce.number().int().positive(),
  rateLimitRpm: z.coerce.number().int().positive(),
  maxConcurrency: z.coerce.number().int().positive(),
  featuresText: z.string().default(''),
  highlighted: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int(),
  // Optional Chinese overrides (base columns stay English fallback).
  zhName: z.string().trim().max(100).optional().default(''),
  zhDescription: z.string().trim().max(1000).optional().default(''),
  zhFeaturesText: z.string().optional().default(''),
});

export const docFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes only'),
  locale: z.enum(['en', 'zh']),
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  sortOrder: z.coerce.number().int(),
  enabled: z.coerce.boolean().default(true),
  content: z.string().min(1, 'Content is required'),
});

export const settingsFormSchema = z.object({
  min_markup_percent: z.coerce.number().min(0).max(100),
  infra_cost_per_month_cents: z.coerce.number().int().min(0),
  forecast_monthly_tokens_m: z.coerce.number().int().min(1),
  target_profit_percent: z.coerce.number().min(0).max(100),
  default_rpm: z.coerce.number().int().positive(),
  default_concurrency: z.coerce.number().int().positive(),
  low_balance_cents: z.coerce.number().int().positive(),
  maintenance_mode: z.coerce.boolean().default(false),
  forex_rate_rmb_per_usd: z.coerce.number().positive(),
  forex_buffer_percent: z.coerce.number().min(0).max(50),
});

export const adjustBalanceSchema = z.object({
  amountDollars: z.coerce.number(),
  note: z.string().trim().max(200).optional().default('Admin adjustment'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
