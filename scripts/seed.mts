/**
 * Idempotent seed for the Nebula API token platform.
 *
 * Run:
 *   node --env-file=.env scripts/seed.mts
 *
 * Seeds:
 *   - RBAC roles        : admin, user
 *   - permission points : 17 codes across console / admin modules
 *   - fixed owner       : wenbing1123@163.com / 123456  (roles: admin + user)
 *   - demo user         : user@nebula.ai / User#2026   (role: user, $20 credit + one API key)
 *   - 8 production models with cost / sell / official-retail prices
 *   - 3 subscription packages
 *   - global settings (margin floor, rate limits, ...)
 *
 * Tables follow the domain-prefixed convention (sys_*, biz_*, bill_*) and
 * every table carries id / created_at / updated_at / deleted. Unique indexes
 * are partial on deleted = false, so ON CONFLICT carries the same predicate.
 */
import { randomBytes, scryptSync, createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const here = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(here, '..', 'content', 'docs');

// Numeric enum codes (must stay in sync with lib/db/enums.ts).
const PERM_TYPE = { menu: 1, action: 2 } as const;
const PROVIDER_CODE: Record<string, number> = {
  openai: 1,
  anthropic: 2,
  google: 3,
  deepseek: 4,
  azure: 5,
  custom: 6,
  zhipu: 7,
  moonshot: 8,
  doubao: 9,
  alibaba: 10,
};
const CURRENCY_CODE: Record<string, number> = { usd: 1, rmb: 2 };
const PROTOCOL_CODE = { openai: 1, anthropic: 2 } as const;
const LOCALE_CODE = { en: 1, zh: 2 } as const;

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5432/ai_saas';
const sql = postgres(url, { max: 4, onnotice: () => {} });

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

// ---------------------------------------------------------------------------
// RBAC catalog
// ---------------------------------------------------------------------------

const ROLES = [
  {
    code: 'admin',
    name: 'Administrator',
    description: 'Full platform access. Always holds every permission.',
    sort: 10,
  },
  {
    code: 'user',
    name: 'Customer',
    description: 'Regular API customer with console access.',
    sort: 20,
  },
];

interface PermissionSeed {
  code: string;
  name: string;
  module: string;
  type: 'menu' | 'action';
  sort: number;
}

const PERMISSIONS: PermissionSeed[] = [
  // Console (customer self-service)
  { code: 'console:view', name: 'Console overview', module: 'console', type: 'menu', sort: 10 },
  { code: 'apikey:manage', name: 'Manage API keys', module: 'console', type: 'menu', sort: 20 },
  { code: 'usage:view', name: 'View own usage', module: 'console', type: 'menu', sort: 30 },
  { code: 'billing:manage', name: 'Billing & top-up', module: 'console', type: 'menu', sort: 40 },
  { code: 'account:manage', name: 'Account settings', module: 'console', type: 'menu', sort: 50 },
  // Admin
  { code: 'admin:view', name: 'Admin overview', module: 'admin', type: 'menu', sort: 10 },
  { code: 'model:view', name: 'View models & cost', module: 'model', type: 'menu', sort: 10 },
  { code: 'model:manage', name: 'Create / edit models', module: 'model', type: 'action', sort: 20 },
  { code: 'plan:view', name: 'View packages', module: 'plan', type: 'menu', sort: 10 },
  { code: 'plan:manage', name: 'Create / edit packages', module: 'plan', type: 'action', sort: 20 },
  { code: 'order:view_all', name: 'View all orders', module: 'order', type: 'menu', sort: 10 },
  { code: 'order:manage', name: 'Refund orders', module: 'order', type: 'action', sort: 20 },
  { code: 'user:view', name: 'View users', module: 'user', type: 'menu', sort: 10 },
  { code: 'user:manage', name: 'Manage users & balances', module: 'user', type: 'action', sort: 20 },
  { code: 'role:view', name: 'View roles & permissions', module: 'role', type: 'menu', sort: 10 },
  { code: 'role:manage', name: 'Assign role permissions', module: 'role', type: 'action', sort: 20 },
  { code: 'doc:manage', name: 'Manage documentation pages', module: 'doc', type: 'menu', sort: 10 },
  { code: 'usage:view_all', name: 'View platform usage', module: 'usage', type: 'menu', sort: 10 },
  { code: 'setting:view', name: 'View platform settings', module: 'setting', type: 'menu', sort: 10 },
  { code: 'setting:manage', name: 'Edit platform settings', module: 'setting', type: 'action', sort: 20 },
];

const CONSOLE_PERMISSIONS = PERMISSIONS.filter((p) => p.module === 'console').map((p) => p.code);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

interface ModelSeed {
  provider: string;
  protocol: 'openai' | 'anthropic';
  /** Procurement currency of cost & sell prices. */
  currency: 'usd' | 'rmb';
  modelId: string;
  upstreamModel: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  flags: { vision?: boolean; tools?: boolean; reasoning?: boolean };
  retail: [number, number];
  cost: [number, number, number, number];
  sell: [number, number, number, number];
}

const MODELS: ModelSeed[] = [
  // ---- DeepSeek (RMB) ----
  {
    provider: 'deepseek',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'deepseek-chat',
    upstreamModel: 'deepseek-chat',
    displayName: 'DeepSeek V3.1',
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    flags: { tools: true },
    retail: [0.7, 2.1],
    cost: [0.5, 1.5, 0.1, 0],
    sell: [0.7, 2.1, 0.14, 0],
  },
  {
    provider: 'deepseek',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'deepseek-reasoner',
    upstreamModel: 'deepseek-reasoner',
    displayName: 'DeepSeek R1',
    contextWindow: 131_072,
    maxOutputTokens: 8_192,
    flags: { reasoning: true, tools: false },
    retail: [2.7, 10.8],
    cost: [2.0, 8.0, 0.4, 0],
    sell: [2.7, 10.8, 0.54, 0],
  },

  // ---- Zhipu GLM (RMB) ----
  {
    provider: 'zhipu',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'glm-4.6',
    upstreamModel: 'glm-4.6',
    displayName: 'GLM-4.6',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.3, 1.2],
    cost: [0.22, 0.88, 0.044, 0],
    sell: [0.3, 1.2, 0.06, 0],
  },
  {
    provider: 'zhipu',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'glm-4-plus',
    upstreamModel: 'glm-4-plus',
    displayName: 'GLM-4 Plus',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [2.7, 13.5],
    cost: [2.0, 10.0, 0.4, 0],
    sell: [2.7, 13.5, 0.54, 0],
  },
  {
    provider: 'zhipu',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'glm-4v-plus',
    upstreamModel: 'glm-4v-plus',
    displayName: 'GLM-4V Plus',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { vision: true, tools: true },
    retail: [2.7, 13.5],
    cost: [2.0, 10.0, 0.4, 0],
    sell: [2.7, 13.5, 0.54, 0],
  },
  {
    provider: 'zhipu',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'glm-4.6-air',
    upstreamModel: 'glm-4.6-air',
    displayName: 'GLM-4.6 Air',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.04, 0.16],
    cost: [0.03, 0.12, 0.006, 0],
    sell: [0.04, 0.16, 0.008, 0],
  },

  // ---- ByteDance Doubao / Seed (RMB) ----
  {
    provider: 'doubao',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'doubao-seed-1.6',
    upstreamModel: 'doubao-seed-1.6',
    displayName: 'Doubao Seed 1.6',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.4, 1.6],
    cost: [0.3, 1.2, 0.06, 0],
    sell: [0.4, 1.6, 0.08, 0],
  },
  {
    provider: 'doubao',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'doubao-seed-1.6-flash',
    upstreamModel: 'doubao-seed-1.6-flash',
    displayName: 'Doubao Seed 1.6 Flash',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.08, 0.32],
    cost: [0.06, 0.24, 0.012, 0],
    sell: [0.08, 0.32, 0.016, 0],
  },
  {
    provider: 'doubao',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'doubao-seed-1.6-thinking',
    upstreamModel: 'doubao-seed-1.6-thinking',
    displayName: 'Doubao Seed 1.6 Thinking',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { reasoning: true, tools: true },
    retail: [0.8, 3.2],
    cost: [0.6, 2.4, 0.12, 0],
    sell: [0.8, 3.2, 0.16, 0],
  },
  {
    provider: 'doubao',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'doubao-1.5-vision-pro',
    upstreamModel: 'doubao-1.5-vision-pro',
    displayName: 'Doubao 1.5 Vision Pro',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { vision: true, tools: true },
    retail: [1.2, 4.8],
    cost: [0.9, 3.6, 0.18, 0],
    sell: [1.2, 4.8, 0.24, 0],
  },

  // ---- Alibaba Qwen (RMB) ----
  {
    provider: 'alibaba',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'qwen3-plus',
    upstreamModel: 'qwen3-plus',
    displayName: 'Qwen3 Plus',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.7, 2.8],
    cost: [0.5, 2.0, 0.1, 0],
    sell: [0.7, 2.8, 0.14, 0],
  },
  {
    provider: 'alibaba',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'qwen3-turbo',
    upstreamModel: 'qwen3-turbo',
    displayName: 'Qwen3 Turbo',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.12, 0.48],
    cost: [0.09, 0.36, 0.018, 0],
    sell: [0.12, 0.48, 0.024, 0],
  },
  {
    provider: 'alibaba',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'qwen3-max',
    upstreamModel: 'qwen3-max',
    displayName: 'Qwen3 Max',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [3.2, 16],
    cost: [2.4, 12.0, 0.48, 0],
    sell: [3.2, 16, 0.64, 0],
  },
  {
    provider: 'alibaba',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'qwen-vl-max',
    upstreamModel: 'qwen-vl-max',
    displayName: 'Qwen-VL Max',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { vision: true, tools: true },
    retail: [3.2, 16],
    cost: [2.4, 12.0, 0.48, 0],
    sell: [3.2, 16, 0.64, 0],
  },
  {
    provider: 'alibaba',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'qwen-long',
    upstreamModel: 'qwen-long',
    displayName: 'Qwen Long',
    contextWindow: 10_000_000,
    maxOutputTokens: 8_192,
    flags: { tools: true },
    retail: [0.05, 0.2],
    cost: [0.04, 0.16, 0.008, 0],
    sell: [0.05, 0.2, 0.01, 0],
  },

  // ---- Moonshot Kimi (RMB) ----
  {
    provider: 'moonshot',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'kimi-k2',
    upstreamModel: 'kimi-k2',
    displayName: 'Kimi K2',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [0.5, 2.0],
    cost: [0.38, 1.5, 0.076, 0],
    sell: [0.5, 2.0, 0.1, 0],
  },
  {
    provider: 'moonshot',
    protocol: 'openai',
    currency: 'rmb',
    modelId: 'moonshot-v1-128k',
    upstreamModel: 'moonshot-v1-128k',
    displayName: 'Moonshot V1 128K',
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    flags: { tools: true },
    retail: [2.4, 9.6],
    cost: [1.8, 7.2, 0.36, 0],
    sell: [2.4, 9.6, 0.48, 0],
  },

  // ---- International (USD) ----
  {
    provider: 'openai',
    protocol: 'openai',
    currency: 'usd',
    modelId: 'gpt-4o-mini',
    upstreamModel: 'gpt-4o-mini',
    displayName: 'GPT-4o mini',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    flags: { vision: true, tools: true },
    retail: [0.15, 0.6],
    cost: [0.11, 0.44, 0.028, 0],
    sell: [0.15, 0.6, 0.038, 0],
  },
  {
    provider: 'anthropic',
    protocol: 'anthropic',
    currency: 'usd',
    modelId: 'claude-sonnet-4-20250514',
    upstreamModel: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    flags: { vision: true, tools: true },
    retail: [3, 15],
    cost: [1.8, 9, 0.18, 2.25],
    sell: [2.55, 12.75, 0.26, 3.19],
  },
];

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'Try the API with real production models. Perfect for side projects.',
    price: 500,
    credit: 600,
    days: 30,
    rpm: 30,
    concurrency: 3,
    highlighted: false,
    sort: 10,
    features: [
      '$6 API credit',
      'All production models',
      'OpenAI & Anthropic endpoints',
      '30 requests / minute',
      'Email support',
    ],
    zh: {
      name: '入门版',
      description: '使用真实生产模型体验 API，非常适合个人侧项目。',
      features: ['$6 API 额度', '全部生产模型可用', 'OpenAI 与 Anthropic 双协议端点', '每分钟 30 次请求', '邮件支持'],
    },
  },
  {
    slug: 'builder',
    name: 'Builder',
    description: 'For developers running AI coding agents and production apps every day.',
    price: 2500,
    credit: 3200,
    days: 30,
    rpm: 120,
    concurrency: 8,
    highlighted: true,
    sort: 20,
    features: [
      '$32 API credit (28% bonus)',
      'All production models',
      'Claude Code & Codex ready',
      '120 requests / minute · 8 concurrent',
      'Priority routing',
      'Usage analytics',
    ],
    zh: {
      name: '开发者版',
      description: '适合每天运行 AI 编程智能体与生产应用的开发者。',
      features: [
        '$32 API 额度（赠 28%）',
        '全部生产模型可用',
        '适配 Claude Code 与 Codex',
        '每分钟 120 次请求 · 8 并发',
        '优先路由',
        '用量分析',
      ],
    },
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'High-volume teams that need throughput and the best per-token price.',
    price: 9900,
    credit: 13500,
    days: 90,
    rpm: 500,
    concurrency: 20,
    highlighted: false,
    sort: 30,
    features: [
      '$135 API credit (36% bonus)',
      'All production models',
      '500 requests / minute · 20 concurrent',
      '90-day entitlement window',
      'Capacity reservations',
      '24/7 support',
    ],
    zh: {
      name: '专业版',
      description: '面向需要高吞吐量与最优单 token 价格的高用量团队。',
      features: [
        '$135 API 额度（赠 36%）',
        '全部生产模型可用',
        '每分钟 500 次请求 · 20 并发',
        '90 天套餐权益周期',
        '容量预留',
        '7×24 支持',
      ],
    },
  },
];

const SETTINGS: Record<string, unknown> = {
  min_markup_percent: 10,
  // ~¥20,000 / year infra → ~$230 / month amortized over forecast tokens
  infra_cost_per_month_cents: 23_000,
  forecast_monthly_tokens_m: 1_000,
  target_profit_percent: 30,
  default_rpm: 30,
  default_concurrency: 3,
  low_balance_cents: 1,
  maintenance_mode: false,
  currency: 'USD',
};

function markupFromCostSell(c: number, s: number): string {
  if (c <= 0) return '0';
  return (Math.round(((s - c) / c) * 1000) / 10).toFixed(2);
}

async function main() {
  // ---- Roles ---------------------------------------------------------------
  console.log('▸ Seeding roles…');
  for (const r of ROLES) {
    await sql`
      INSERT INTO sys_role (code, name, description, is_system, sort_order)
      VALUES (${r.code}, ${r.name}, ${r.description}, true, ${r.sort})
      ON CONFLICT (code) WHERE deleted = 0 DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
    `;
  }
  const roleRows = await sql<{ id: string; code: string }[]>`SELECT id, code FROM sys_role WHERE deleted = 0`;
  const roleId = Object.fromEntries(roleRows.map((r) => [r.code, r.id])) as Record<string, string>;

  // ---- Permissions ---------------------------------------------------------
  console.log('▸ Seeding permissions…');
  for (const p of PERMISSIONS) {
    await sql`
      INSERT INTO sys_permission (code, name, module, type, sort_order)
      VALUES (${p.code}, ${p.name}, ${p.module}, ${PERM_TYPE[p.type]}, ${p.sort})
      ON CONFLICT (code) WHERE deleted = 0 DO UPDATE SET
        name = EXCLUDED.name,
        module = EXCLUDED.module,
        type = EXCLUDED.type,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
    `;
  }
  const permRows =
    await sql<{ id: string; code: string }[]>`SELECT id, code FROM sys_permission WHERE deleted = 0`;
  const permId = Object.fromEntries(permRows.map((p) => [p.code, p.id])) as Record<string, string>;

  // ---- Role → permission (admin = all, user = console set) ------------------
  console.log('▸ Reconciling role permissions…');
  await sql`DELETE FROM sys_role_permission WHERE role_id = ANY(${Object.values(roleId)}::uuid[])`;
  const adminLinks = PERMISSIONS.map((p) => ({ roleId: roleId.admin, permissionId: permId[p.code] }));
  const userLinks = CONSOLE_PERMISSIONS.map((code) => ({ roleId: roleId.user, permissionId: permId[code] }));
  for (const link of [...adminLinks, ...userLinks]) {
    await sql`
      INSERT INTO sys_role_permission (role_id, permission_id)
      VALUES (${link.roleId}, ${link.permissionId})
    `;
  }

  // ---- Users ---------------------------------------------------------------
  // Single fixed owner account — admin + user roles, $100 credit, one API key.
  // (user@nebula.ai demo account was removed — physically deleted.)
  console.log('▸ Seeding users…');
  const ownerPasswordHash = hashPassword('123456');
  const ownerBalanceCents = 10000; // $100.00
  const ownerKey = `sk-nebula-${randomBytes(24).toString('hex')}`;
  const ownerKeyHash = createHash('sha256').update(ownerKey).digest('hex');
  const inserted = await sql`
    INSERT INTO sys_user (email, password_hash, name, balance_cents, email_verified_at)
    VALUES ('wenbing1123@163.com', ${ownerPasswordHash}, 'Wenbing', ${ownerBalanceCents}, now())
    ON CONFLICT (email) WHERE deleted = 0 DO NOTHING
    RETURNING id
  `;
  const ownerId =
    inserted.count > 0
      ? (inserted[0].id as string)
      : ((await sql`SELECT id FROM sys_user WHERE email = 'wenbing1123@163.com' AND deleted = 0`)[0]
          .id as string);
  // Owner is both administrator and regular user.
  for (const code of ['admin', 'user']) {
    await sql`
      INSERT INTO sys_user_role (user_id, role_id)
      VALUES (${ownerId}, ${roleId[code]})
      ON CONFLICT (user_id, role_id) WHERE deleted = 0 DO NOTHING
    `;
  }
  // Welcome credit ledger only on first insert; API key every seed run (hash unique per run).
  if (inserted.count > 0) {
    await sql`
      INSERT INTO bill_credit_ledger (user_id, type, amount_cents, balance_after_cents, note)
      VALUES (${ownerId}, 4, ${ownerBalanceCents}, ${ownerBalanceCents}, 'Initial credit')
    `;
  }
  await sql`
    INSERT INTO biz_api_token (user_id, name, key_hash, prefix)
    VALUES (${ownerId}, 'Default key', ${ownerKeyHash}, ${ownerKey.slice(0, 14) + '…'})
  `;

  // ---- Models --------------------------------------------------------------
  console.log('▸ Upserting models…');
  for (const m of MODELS) {
    const avgMarkup =
      (markupFromCostSell(m.cost[0], m.sell[0]) === '0'
        ? 0
        : Number(markupFromCostSell(m.cost[0], m.sell[0])) +
          Number(markupFromCostSell(m.cost[1], m.sell[1]))) / 2;
    await sql`
      INSERT INTO biz_model (
        provider, protocol, cost_currency, model_id, upstream_model, display_name,
        context_window, max_output_tokens, supports_vision, supports_tools, supports_reasoning,
        input_cost_per_1m, output_cost_per_1m, cache_read_cost_per_1m, cache_write_cost_per_1m,
        retail_input_per_1m, retail_output_per_1m, markup_percent,
        sell_input_per_1m, sell_output_per_1m, sell_cache_read_per_1m, sell_cache_write_per_1m,
        sort_order
      ) VALUES (
        ${PROVIDER_CODE[m.provider]}, ${PROTOCOL_CODE[m.protocol]}, ${CURRENCY_CODE[m.currency]}, ${m.modelId}, ${m.upstreamModel}, ${m.displayName},
        ${m.contextWindow}, ${m.maxOutputTokens},
        ${m.flags.vision ?? false}, ${m.flags.tools ?? true}, ${m.flags.reasoning ?? false},
        ${m.cost[0]}, ${m.cost[1]}, ${m.cost[2]}, ${m.cost[3]},
        ${m.retail[0]}, ${m.retail[1]}, ${avgMarkup.toFixed(2)},
        ${m.sell[0]}, ${m.sell[1]}, ${m.sell[2]}, ${m.sell[3]},
        ${MODELS.indexOf(m) * 10}
      )
      ON CONFLICT (model_id) WHERE deleted = 0 DO UPDATE SET
        provider = EXCLUDED.provider,
        protocol = EXCLUDED.protocol,
        cost_currency = EXCLUDED.cost_currency,
        upstream_model = EXCLUDED.upstream_model,
        display_name = EXCLUDED.display_name,
        context_window = EXCLUDED.context_window,
        max_output_tokens = EXCLUDED.max_output_tokens,
        input_cost_per_1m = EXCLUDED.input_cost_per_1m,
        output_cost_per_1m = EXCLUDED.output_cost_per_1m,
        cache_read_cost_per_1m = EXCLUDED.cache_read_cost_per_1m,
        cache_write_cost_per_1m = EXCLUDED.cache_write_cost_per_1m,
        retail_input_per_1m = EXCLUDED.retail_input_per_1m,
        retail_output_per_1m = EXCLUDED.retail_output_per_1m,
        markup_percent = EXCLUDED.markup_percent,
        sell_input_per_1m = EXCLUDED.sell_input_per_1m,
        sell_output_per_1m = EXCLUDED.sell_output_per_1m,
        sell_cache_read_per_1m = EXCLUDED.sell_cache_read_per_1m,
        sell_cache_write_per_1m = EXCLUDED.sell_cache_write_per_1m,
        updated_at = now()
    `;
  }

  // ---- Plans ---------------------------------------------------------------
  console.log('▸ Upserting plans…');
  for (const p of PLANS) {
    await sql`
      INSERT INTO biz_plan (
        slug, name, description, price_cents, credit_cents, valid_days,
        rate_limit_rpm, max_concurrency, features, highlighted, sort_order
      ) VALUES (
        ${p.slug}, ${p.name}, ${p.description}, ${p.price}, ${p.credit}, ${p.days},
        ${p.rpm}, ${p.concurrency}, ${JSON.stringify(p.features)}::jsonb, ${p.highlighted}, ${p.sort}
      )
      ON CONFLICT (slug) WHERE deleted = 0 DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents,
        credit_cents = EXCLUDED.credit_cents,
        valid_days = EXCLUDED.valid_days,
        rate_limit_rpm = EXCLUDED.rate_limit_rpm,
        max_concurrency = EXCLUDED.max_concurrency,
        features = EXCLUDED.features,
        highlighted = EXCLUDED.highlighted,
        sort_order = EXCLUDED.sort_order,
        updated_at = now()
    `;
  }

  // ---- Plan translations (Chinese overrides; English lives in base columns) ----
  console.log('▸ Upserting plan translations…');
  const planRows = await sql<{ id: string; slug: string }[]>`
    SELECT id, slug FROM biz_plan WHERE deleted = 0
  `;
  const planIdBySlug = Object.fromEntries(planRows.map((r) => [r.slug, r.id])) as Record<string, string>;
  for (const p of PLANS) {
    const planId = planIdBySlug[p.slug];
    if (!planId || !p.zh) continue;
    const entries: Array<[string, string]> = [
      ['name', p.zh.name],
      ['description', p.zh.description],
      ['features', JSON.stringify(p.zh.features)],
    ];
    for (const [field, value] of entries) {
      await sql`
        INSERT INTO sys_i18n_translation (entity_type, entity_id, field, locale, value)
        VALUES ('plan', ${planId}, ${field}, ${LOCALE_CODE.zh}, ${value})
        ON CONFLICT (entity_type, entity_id, field, locale) WHERE deleted = 0
        DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `;
    }
  }

  // ---- Settings ------------------------------------------------------------
  console.log('▸ Upserting settings…');
  for (const [key, value] of Object.entries(SETTINGS)) {
    await sql`
      INSERT INTO sys_setting (key, value)
      VALUES (${key}, ${JSON.stringify(value)}::jsonb)
      ON CONFLICT (key) WHERE deleted = 0 DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  }

  // ---- Docs (CMS markdown) -------------------------------------------------
  console.log('▸ Seeding documentation pages…');
  for (const file of readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'))) {
    const raw = readFileSync(join(DOCS_DIR, file), 'utf8');
    const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
    if (!match) {
      console.warn(`  ! ${file} missing frontmatter, skipped`);
      continue;
    }
    const fm = Object.fromEntries(
      match[1]!
        .split('\n')
        .map((l) => {
          const idx = l.indexOf(':');
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        }),
    ) as Record<string, string>;
    const [, slug, locale] = /^(.+)\.(en|zh)\.md$/.exec(file)!;
    // Seed fills missing pages only — later CMS edits survive re-seeding.
    await sql`
      INSERT INTO cms_doc_page (slug, locale, title, category, content, sort_order, enabled)
      VALUES (${slug}, ${LOCALE_CODE[locale as 'en' | 'zh']}, ${fm.title}, ${fm.category}, ${match[2]!.trim()}, ${Number(fm.sort) || 100}, true)
      ON CONFLICT (slug, locale) WHERE deleted = 0 DO NOTHING
    `;
  }

  console.log('\n✅ Seed complete.');
  console.log('   Admin console : http://localhost:3000/admin');
  console.log('   Owner login   : wenbing1123@163.com / 123456   (roles: admin + user, $100 credit)');
  console.log(`   Owner API key : ${ownerKey}  (shown only once)`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
