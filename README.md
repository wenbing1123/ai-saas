# AI SaaS — Nebula AI

一个模块化、可用于生产的 AI-SaaS 启动模板，基于 **Next.js 14 (App Router) + LangGraph + shadcn/ui** 构建。

## 功能特性

- 精美的营销着陆页，包含 Hero 区域、功能介绍和定价模块
- 完整的仪表盘布局（侧边栏 + 顶栏）
- 交互式 **Playground**，支持智能体选择、会话列表、流式模拟和运行追踪检查器
- **智能体**、**知识库** 和 **设置** 页面（多标签页）
- 受 **LangGraph** 启发的模块化 AI 层：图、节点、工具注册表，以及可切换的模拟/远程聊天服务
- 预置的 **Drizzle ORM** Schema，涵盖用户、工作区、智能体、会话、知识库、令牌和审计日志
- Repository + Service 双层架构，实现清晰的后端职责分离
- 基于 Zod 的类型化验证器，用于每个 API 接口
- 聊天（SSE 流式传输）、智能体、知识库和认证的 API 路由

## 项目结构

```
ai-saas/
├── app/
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 着陆页
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── layout.tsx        # 侧边栏 + 顶栏外壳
│   │   ├── chat/page.tsx     # Playground
│   │   ├── agents/page.tsx   # 智能体目录
│   │   ├── knowledge/page.tsx# 知识库
│   │   └── settings/page.tsx # 设置标签页
│   └── api/                  # API 路由（聊天、智能体、知识库、认证）
├── components/
│   ├── ui/                   # shadcn 风格基础组件
│   ├── marketing/            # 着陆页各区块
│   ├── dashboard/            # AppShell（侧边栏 + 顶栏）
│   ├── chat/                 # （未来）消息、输入框等
│   ├── agents/               # （未来）智能体卡片、表单
│   ├── knowledge/            # （未来）知识库卡片、上传器
│   └── settings/             # （未来）设置子页面
├── lib/
│   ├── ai/
│   │   ├── client.ts         # LangGraph SDK 封装
│   │   ├── types.ts          # 智能体图类型
│   │   ├── nodes/core.ts     # 可插拔节点
│   │   ├── graphs/default.ts # 默认图 + 运行器 + 流式处理器
│   │   └── tools/            # 工具注册表 + 内置工具
│   ├── db/                   # Drizzle Schema + 客户端
│   ├── repositories/         # 数据访问层
│   ├── services/             # 业务逻辑层（chatService）
│   ├── validators/           # Zod Schema
│   ├── types/                # 共享领域类型
│   ├── mock-data.ts          # 演示用目录数据
│   └── utils.ts
├── hooks/                    # React Hooks（useChat）
├── config/                   # 全局应用配置
├── content/                  # （未来）MDX/博客文章
└── tests/                    # （未来）测试套件
```

## 快速开始

```bash
cp .env.example .env.local
pnpm install          # 或 npm / yarn
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 架构亮点

- **前端**：Next.js App Router + Tailwind + shadcn/ui 风格基础组件。已就绪暗黑模式支持。
- **AI 层**：自定义图抽象，镜像 LangGraph 语义（`StateGraph`、节点、边）。设置 `process.env.NEXT_PUBLIC_AI_MODE=remote` 即可通过 SDK 客户端连接到真实的 LangGraph 部署。
- **数据层**：Drizzle + PostgreSQL，配合类型化 Repository 层；更换数据库只需修改 `lib/db/client.ts`。
- **服务层**：`lib/services/chat.ts` 暴露 `ChatService` 接口，包含 `mock` 和 `remote` 两种实现。
- **验证**：`lib/validators` 中的 Zod Schema 被 API 路由复用。
- **流式传输**：`/api/chat` 通过 `ReadableStream` 支持 SSE 流式传输，由 `hooks/useChat.ts` 消费。

## 扩展指南

- **添加智能体图**：在 `lib/ai/graphs/` 下创建新文件并导出，然后接入 `createChatService`。
- **添加工具**：在 `lib/ai/tools/builtins.ts` 或自定义文件中通过 `toolRegistry.register(...)` 注册工具。
- **添加页面**：在 `app/(dashboard)/` 或 `app/(marketing)/` 下新建文件夹和 `page.tsx`。
- **添加数据库表**：扩展 `lib/db/schema.ts`，运行 `pnpm db:generate`，并在 `lib/repositories/` 中创建对应的 Repository。

## 脚本命令

| 脚本 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Next.js 开发服务器 |
| `pnpm build` | 生产环境构建 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm db:generate` | 生成 Drizzle 迁移文件 |
| `pnpm db:push` | 将 Schema 推送到数据库 |
| `pnpm graph:dev` | 启动 LangGraph 开发服务器（端口 8123） |