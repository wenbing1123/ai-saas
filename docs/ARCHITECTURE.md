# Nebula AI — 项目架构文档

> 阅读本文档后，你将理解项目的整体架构设计、各模块的职责边界，以及如何高效地阅读和上手代码。

---

## 一、技术栈总览

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 14 (App Router) | SSR / RSC / API Routes |
| UI 样式 | Tailwind CSS + shadcn/ui | 组件库 + 原子化样式 |
| 国际化 | next-intl | 中英双语支持，cookie 语言检测 |
| AI 引擎 | 自研 Agent Graph（仿 LangGraph） | 节点/边/状态图抽象 |
| 远程 AI | LangGraph Cloud SDK | 可选接入真实 LangGraph 部署 |
| 数据库 | PostgreSQL + Drizzle ORM | 类型化 Schema + 迁移 |
| 数据校验 | Zod | API 请求验证 + 类型推导 |
| 状态管理 | React Hooks (useChat) | 客户端流式会话管理 |

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js App Router                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   app/page    │  │ app/(dash)   │  │   app/api/*      │  │
│  │  着陆页 (RSC) │  │ 仪表盘 (SSR) │  │  API Routes      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │                    components/ (UI 层)                  │  │
│  │  marketing/ │ dashboard/ │ chat/ │ agents/ │ ui/        │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐  │
│  │                     hooks/ (交互层)                       │  │
│  │                    useChat.ts — SSE 流式消费              │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐  │
│  │                  lib/services/ (服务层)                  │  │
│  │   chat.ts — ChatService 接口（mock / remote 可切换）     │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐  │
│  │              lib/ai/ (AI 引擎层)                         │  │
│  │  graphs/ │ nodes/ │ tools/ │ client.ts │ types.ts       │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────┴────────────────────────────────┐  │
│  │          lib/repositories/ + lib/db/ (数据层)            │  │
│  │   BaseRepository<T> · Drizzle Schema · 内存 Mock Store  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 核心设计思路

项目采用 **四层架构** 组织代码，关注点分离：

1. **UI 层** (`components/`)：纯展示组件，不包含业务逻辑
2. **交互层** (`hooks/`)：客户端状态管理，如 `useChat` 处理 SSE 流式消费
3. **服务层** (`lib/services/`)：业务编排层，如 `ChatService` 决定走 mock 还是 remote
4. **引擎层** (`lib/ai/` + `lib/repositories/` + `lib/db/`)：AI 图执行引擎 + 数据访问

---

## 三、目录结构详解

```
ai-saas/
├── app/                           # Next.js App Router 入口
│   ├── layout.tsx                 # 根布局：加载 next-intl 国际化、注入 IntlProvider
│   ├── page.tsx                   # 着陆页入口（引用 components/marketing/Marketing）
│   ├── globals.css                # Tailwind 全局样式
│   │
│   ├── (dashboard)/               # 仪表盘路由组（布局共享）
│   │   ├── layout.tsx             # 侧边栏 AppSidebar 外壳
│   │   ├── chat/page.tsx          # Playground 对话页
│   │   ├── agents/page.tsx        # 智能体列表页
│   │   ├── knowledge/page.tsx     # 知识库管理页
│   │   └── settings/page.tsx      # 设置页
│   │
│   └── api/                       # API Route Handlers
│       ├── chat/route.ts          # POST /api/chat — SSE 流式聊天核心
│       ├── agents/route.ts        # 智能体 CRUD
│       ├── knowledge/route.ts     # 知识库管理
│       └── auth/route.ts          # 认证入口
│
├── components/
│   ├── ui/                        # shadcn/ui 风格基础组件（button, card, badge 等）
│   ├── marketing/Marketing.tsx    # 着陆页主组件（含 Hero / Features / Pricing）
│   ├── dashboard/AppShell.tsx    # 侧边栏 + 顶栏
│   ├── IntlProvider.tsx           # next-intl 客户端 Provider 封装
│   └── LanguageSwitcher.tsx       # 语言切换按钮
│
├── hooks/
│   └── useChat.ts                 # 核心 Hook：发送消息、解析 SSE、累积流式响应
│
├── lib/
│   ├── ai/                        # AI 引擎层 ⭐ 核心
│   │   ├── types.ts               # AgentState / AgentNode / AgentGraph 类型定义
│   │   ├── client.ts              # LangGraph Cloud HTTP 客户端（run / stream / listAgents）
│   │   ├── nodes/core.ts          # 内置节点：planner · router · executor · synthesizer
│   │   ├── graphs/default.ts      # 默认图定义 + runGraph / streamGraph 执行器
│   │   └── tools/
│   │       ├── registry.ts        # ToolRegistry 接口 + 全局单例
│   │       └── builtins.ts       # 内置工具：web_search / kb_search / sql_generator 等
│   │
│   ├── db/
│   │   ├── schema.ts              # Drizzle Schema（users · workspaces · agents · conversations 等）
│   │   ├── client.ts              # Drizzle 数据库连接客户端
│   │   └── index.ts               # 数据库层导出
│   │
│   ├── repositories/
│   │   ├── base.ts                # BaseRepository<T, CreateInput, Filter> 泛型接口
│   │   └── agents.ts              # agents / conversations / knowledgeBases 的内存 Mock 实现
│   │
│   ├── services/
│   │   └── chat.ts                # ChatService 接口 + MockChatService / RemoteChatService 实现
│   │
│   ├── validators/index.ts        # Zod Schema：ChatRequestSchema / AgentCreateSchema 等
│   ├── types/index.ts             # 领域类型：Agent · Conversation · KnowledgeBase 等
│   ├── mock-data.ts               # 演示数据：AGENT_CATALOG · DEMO_CONVERSATIONS 等
│   └── utils.ts                   # cn() 等工具函数
│
├── config/app.ts                  # 全局应用配置（名称、定价、功能列表、LangGraph 设置）
├── messages/                      # 国际化 JSON
│   ├── en.json
│   └── zh.json
├── i18n/request.ts                # next-intl 服务端配置（locale 检测 + 消息加载）
├── middleware.ts                  # Next.js Middleware：locale cookie 注入
├── drizzle.config.ts              # Drizzle Kit 配置
├── .env.example                   # 环境变量模板
└── next.config.mjs                # Next.js 配置
```

---

## 四、核心模块深度解析

### 4.1 AI 引擎层：Agent Graph

这是项目最核心的设计，灵感来自 LangGraph，但用纯 TypeScript 实现，方便本地调试和学习。

```typescript
// lib/ai/types.ts — 三个核心抽象

type AgentState = {
  messages: Message[];          // 对话历史
  agentId: string;              // 当前智能体 ID
  toolCalls: ToolCall[];        // 待执行 / 已执行的工具调用
  finalResponse?: string;       // 最终合成的回复
  metadata?: Record<string, any>;
};

type AgentNode = (state: AgentState) => Promise<Partial<AgentState>>;
// ↑ 每个节点是一个纯函数：输入当前状态，输出状态增量

type AgentEdge = (state: AgentState) => string | null;
// ↑ 边可以是条件跳转：基于当前状态决定下一个节点

interface AgentGraph {
  id: string;
  nodes: Record<string, AgentNode>;       // 所有节点
  edges: Record<string, Edge[]>;          // 从每个节点出发的边
  start: string;                          // 起始节点 ID
  end: string | null;                     // 终止节点（null = 无显式终点）
}
```

**默认图的执行流程：**

```
  start ──► planner ──► router ──► (有工具调用?) ──► executor ──► synthesizer
                                          │                              │
                                          └──► (无工具调用) ──────────────►┘
                                                                     结束
```

- **plannerNode**：分析用户意图，生成执行计划（写入 `state.metadata.plan`）
- **routerNode**：用正则匹配用户消息关键词，决定需要调用哪些工具
- **toolExecutorNode**：执行工具调用（当前为 Mock 实现，返回 `[mock result from xxx]`）
- **synthesizerNode**：汇总工具结果，生成最终回复消息

**执行方式：**
- `runGraph()`：同步执行整个图，返回最终状态
- `streamGraph()`：异步迭代，按节点/消息/完成三种事件逐步产出，供 SSE 流式推送

### 4.2 服务层：ChatService 策略模式

```typescript
// lib/services/chat.ts

interface ChatService {
  chat(agent, messages): Promise<ChatServiceResponse>;     // 一次性响应
  stream(agent, messages): AsyncIterable<StreamChunk>;      // 流式响应
}

class MockChatService { ... }    // 使用本地 AgentGraph 执行
class RemoteChatService { ... }  // 调用真实 LangGraph Cloud API

function createChatService(mode?) {
  return mode === 'remote' ? new RemoteChatService() : new MockChatService();
}
```

通过环境变量 `NEXT_PUBLIC_AI_MODE=remote` 即可从本地 Mock 切换到真实 LangGraph 部署。

### 4.3 数据层：Repository 模式 + 内存 Mock

```typescript
// lib/repositories/base.ts — 泛型接口，定义标准 CRUD 契约

interface BaseRepository<T, CreateInput, Filter> {
  list(filter?): Promise<T[]>;
  getById(id): Promise<T | null>;
  create(input): Promise<T>;
  update(id, patch): Promise<T | null>;
  delete(id): Promise<boolean>;
}
```

当前 `lib/repositories/agents.ts` 使用内存数组作为 Mock 存储，切换到 PostgreSQL 时只需将实现替换为 Drizzle 查询即可，上层业务代码无需改动。

### 4.4 API 层：SSE 流式传输

`app/api/chat/route.ts` 是整个 AI 能力的 HTTP 入口：

```
客户端 POST /api/chat
  → Zod Schema 校验 (ChatRequestSchema)
  → 查找智能体 (AGENT_CATALOG)
  → 判断 stream 参数
    ├── stream=true  → chatService.stream() → ReadableStream → SSE 响应
    └── stream=false → chatService.chat()   → JSON 响应
```

### 4.5 客户端：useChat Hook

`hooks/useChat.ts` 封装了完整的流式对话交互：

- 发送消息 → 解析 SSE → 累积内容 → 更新消息列表
- 支持 AbortController 取消
- 自动处理错误状态和 loading 状态

### 4.6 国际化：next-intl

```
middleware.ts  →  检测浏览器语言 → 设置 cookie
    ↓
i18n/request.ts  →  读取 cookie → 加载对应语言 JSON
    ↓
app/layout.tsx  →  IntlProvider 注入 → 全应用 useTranslations()
```

---

## 五、数据流全景

以一次"用户发送消息到收到 AI 回复"为例：

```
1. 用户在 Playground 输入框输入 → useChat.send(content)
2. POST /api/chat { agentId, messages, stream: true }
3. API Route: Zod 校验 → 查智能体 → chatService.stream()
4. MockChatService.stream() → streamGraph(createDefaultAgentGraph(), state)
5. 图执行: planner → router → executor → synthesizer
6. streamGraph 产出 AsyncIterable → SSE (data: ...\n\n)
7. useChat 解析 SSE → 累积内容 → setMessages()
8. React 重新渲染 → 用户看到流式回复
```

---

## 六、代码阅读路线图

推荐按以下顺序阅读代码，可以最快建立全局认知：

### 第一步：理解入口（10 分钟）

1. **`app/layout.tsx`** — 根布局，理解 next-intl 如何注入
2. **`middleware.ts`** — 语言检测逻辑
3. **`i18n/request.ts`** — 服务端国际化配置

### 第二步：理解页面结构（15 分钟）

4. **`app/(dashboard)/layout.tsx`** — 仪表盘布局壳
5. **`components/dashboard/AppShell.tsx`** — 侧边栏导航，理解有哪些页面
6. **`app/page.tsx`** + **`components/marketing/Marketing.tsx`** — 着陆页结构

### 第三步：理解 AI 引擎（30 分钟）⭐ 核心

7. **`lib/ai/types.ts`** — 掌握 `AgentState`、`AgentNode`、`AgentGraph` 三个核心类型
8. **`lib/ai/graphs/default.ts`** — 理解默认图的构建（`createDefaultAgentGraph`）和执行（`runGraph` / `streamGraph`）
9. **`lib/ai/nodes/core.ts`** — 阅读四个内置节点的实现，理解"节点是纯函数"的设计
10. **`lib/ai/tools/registry.ts`** — ToolRegistry 接口
11. **`lib/ai/tools/builtins.ts`** — 内置工具注册示例

### 第四步：理解服务层和 API（20 分钟）

12. **`lib/services/chat.ts`** — 理解 `ChatService` 接口策略模式
13. **`app/api/chat/route.ts`** — SSE 流式传输的服务端实现
14. **`hooks/useChat.ts`** — 客户端如何消费 SSE

### 第五步：理解数据层（15 分钟）

15. **`lib/db/schema.ts`** — 所有数据表结构（用户、智能体、会话、知识库等）
16. **`lib/repositories/base.ts`** — 泛型 Repository 接口
17. **`lib/repositories/agents.ts`** — Mock 实现，理解切换到真实 DB 有多简单

### 第六步：理解配置和类型（10 分钟）

18. **`config/app.ts`** — 全局配置
19. **`lib/types/index.ts`** — 领域类型定义
20. **`lib/validators/index.ts`** — Zod 验证 Schema
21. **`lib/mock-data.ts`** — 演示数据

---

## 七、常见扩展场景

### 添加一个新的 AI 节点

```typescript
// lib/ai/nodes/my-node.ts
import type { AgentNode } from '../types';

export const myCustomNode: AgentNode = async (state) => {
  // 读取当前状态，返回增量
  return {
    metadata: { ...state.metadata, myFlag: true },
  };
};
```

然后在 `lib/ai/graphs/default.ts` 中把它加入图的 `nodes` 和 `edges`。

### 添加一个新工具

```typescript
// 在 lib/ai/tools/builtins.ts 或新文件中
toolRegistry.register({
  name: 'my_tool',
  description: 'Does something useful.',
  inputSchema: { query: { type: 'string' } },
  run: async (input) => {
    return { result: `processed: ${input}` };
  },
});
```

### 切换到真实 LangGraph

```bash
# .env.local
NEXT_PUBLIC_AI_MODE=remote
LANGGRAPH_API_URL=https://your-langgraph-deployment.com
LANGGRAPH_API_KEY=your-api-key
```

无需修改任何代码，`RemoteChatService` 会自动接管。

### 添加数据库表

```bash
# 1. 在 lib/db/schema.ts 添加新的 pgTable 定义
# 2. 生成迁移
pnpm db:generate
# 3. 推送迁移
pnpm db:push
# 4. 在 lib/repositories/ 创建对应的 Repository 实现
```

---

## 八、关键设计决策

| 决策 | 原因 |
|------|------|
| Agent Graph 用纯 TS 实现 | 零依赖、易调试，可本地运行完整 AI 流程 |
| 节点设计为 `(state) => Promise<Partial<State>>` | 函数式、可组合、易测试 |
| 服务层策略模式（mock/remote） | 开发时零成本调试，生产切换无感 |
| Repository 泛型接口 + Mock 实现 | 数据层可替换，前期无需真实数据库 |
| API Route 使用 Edge Runtime | SSE 流式传输需要长连接支持 |
| Zod Schema 同时用于 API 校验和类型推导 | 单一数据源，类型不漂移 |
| next-intl cookie 检测 + 无 [locale] 路由段 | URL 保持干净，locale 由中间件透明处理 |

---

## 九、快速参考

| 我想做什么 | 应该看哪里 |
|-----------|-----------|
| 修改 AI 回复逻辑 | `lib/ai/nodes/core.ts` 的 `synthesizerNode` |
| 添加智能体图节点 | `lib/ai/graphs/default.ts` + `lib/ai/nodes/` |
| 添加新工具 | `lib/ai/tools/builtins.ts` |
| 修改对话 UI | `app/(dashboard)/chat/page.tsx` + `hooks/useChat.ts` |
| 添加 API 端点 | `app/api/` 下新建 route.ts，参考 `chat/route.ts` |
| 修改 Schema | `lib/db/schema.ts` |
| 切换到真实 AI | 设置 `NEXT_PUBLIC_AI_MODE=remote` |
| 添加国际化文案 | 编辑 `messages/en.json` 和 `messages/zh.json` |