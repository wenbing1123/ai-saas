import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const agentStatusEnum = pgEnum('agent_status', ['active', 'draft', 'archived']);
export const knowledgeStatusEnum = pgEnum('knowledge_status', ['ready', 'processing', 'error', 'empty']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const workspacePlanEnum = pgEnum('workspace_plan', ['starter', 'team', 'enterprise']);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    role: userRoleEnum('role').default('user').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    externalIdUniqueIdx: uniqueIndex('users_external_id_unique').on(table.externalId),
    emailIdx: index('users_email_idx').on(table.email),
  }),
);

export const workspaces = pgTable(
  'workspaces',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    plan: workspacePlanEnum('plan').default('starter').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex('workspaces_slug_unique').on(table.slug),
  }),
);

export const agents = pgTable(
  'agents',
  {
    id: serial('id').primaryKey(),
    workspaceId: integer('workspace_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    systemPrompt: text('system_prompt').notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    temperature: text('temperature').notNull().default('0.7'),
    tools: text('tools').array().notNull().default([]),
    graphId: varchar('graph_id', { length: 255 }),
    status: agentStatusEnum('status').default('draft').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index('agents_workspace_id_idx').on(table.workspaceId),
    statusIdx: index('agents_status_idx').on(table.status),
  }),
);

export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),
    workspaceId: integer('workspace_id').notNull(),
    agentId: integer('agent_id').notNull(),
    userId: integer('user_id').notNull(),
    title: varchar('title', { length: 500 }),
    messages: jsonb('messages').$type<Array<{ role: string; content: string; id?: string; ts?: number }>>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index('conversations_workspace_id_idx').on(table.workspaceId),
    agentIdIdx: index('conversations_agent_id_idx').on(table.agentId),
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
  }),
);

export const knowledgeBases = pgTable(
  'knowledge_bases',
  {
    id: serial('id').primaryKey(),
    workspaceId: integer('workspace_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: knowledgeStatusEnum('status').default('empty').notNull(),
    documentCount: integer('document_count').notNull().default(0),
    sizeBytes: integer('size_bytes').notNull().default(0),
    embeddingModel: varchar('embedding_model', { length: 100 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index('knowledge_bases_workspace_id_idx').on(table.workspaceId),
  }),
);

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: serial('id').primaryKey(),
    knowledgeBaseId: integer('knowledge_base_id').notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileSize: integer('file_size').notNull().default(0),
    sourceUrl: text('source_url'),
    chunkCount: integer('chunk_count').notNull().default(0),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    knowledgeBaseIdIdx: index('knowledge_documents_kb_id_idx').on(table.knowledgeBaseId),
  }),
);

export const apiTokens = pgTable(
  'api_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    hash: varchar('hash', { length: 255 }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('api_tokens_user_id_idx').on(table.userId),
    hashUniqueIdx: uniqueIndex('api_tokens_hash_unique').on(table.hash),
  }),
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    workspaceId: integer('workspace_id').notNull(),
    actorId: integer('actor_id'),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 100 }).notNull(),
    targetId: varchar('target_id', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index('audit_logs_workspace_id_idx').on(table.workspaceId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
  }),
);

export const tables = {
  users: 'users',
  workspaces: 'workspaces',
  agents: 'agents',
  conversations: 'conversations',
  knowledgeBases: 'knowledge_bases',
  knowledgeDocuments: 'knowledge_documents',
  apiTokens: 'api_tokens',
  auditLogs: 'audit_logs',
} as const;

export type AgentStatus = (typeof agentStatusEnum.enumValues)[number];
export type KnowledgeStatus = (typeof knowledgeStatusEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type WorkspacePlan = (typeof workspacePlanEnum.enumValues)[number];

export interface UserRecord {
  id: number;
  externalId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceRecord {
  id: number;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AgentRecord {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  tools: string[];
  graphId?: string;
  status: AgentStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationRecord {
  id: number;
  workspaceId: number;
  agentId: number;
  userId: number;
  title?: string;
  messages: Array<{ role: string; content: string; id?: string; ts?: number }>;
  updatedAt: Date;
  createdAt: Date;
}

export interface KnowledgeBaseRecord {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  status: KnowledgeStatus;
  documentCount: number;
  sizeBytes: number;
  embeddingModel: string;
  metadata?: Record<string, unknown>;
  updatedAt: Date;
  createdAt: Date;
}

export interface KnowledgeDocumentRecord {
  id: number;
  knowledgeBaseId: number;
  fileName: string;
  fileSize: number;
  sourceUrl?: string;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: Date;
}

export interface ApiTokenRecord {
  id: number;
  userId: number;
  name: string;
  hash: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: number;
  workspaceId: number;
  actorId?: number;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}