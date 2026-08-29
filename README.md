# AI SaaS — Nebula AI

A modular, production-ready AI-SaaS starter built with **Next.js 14 (App Router) + LangGraph + shadcn/ui**.

## Features

- Beautiful marketing landing page with hero, features and pricing
- Full dashboard layout (sidebar + header)
- Interactive **Playground** with agent picker, thread list, streaming mock, and run-trace inspector
- **Agents**, **Knowledge bases**, and **Settings** pages (multi-tab)
- Modular **LangGraph-inspired** AI layer: graphs, nodes, tools registry, and a mock/remote-swappable chat service
- Prepared **Drizzle ORM** schema for users, workspaces, agents, conversations, knowledge bases, tokens, audit logs
- Repository + Service layers for clean backend separation
- Typed validators (zod) for every API
- API routes for chat (SSE streaming), agents, knowledge, and auth

## Project structure

```
ai-saas/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── layout.tsx        # Sidebar + header shell
│   │   ├── chat/page.tsx     # Playground
│   │   ├── agents/page.tsx   # Agent catalog
│   │   ├── knowledge/page.tsx# Knowledge bases
│   │   └── settings/page.tsx # Settings tabs
│   └── api/                  # API routes (chat, agents, knowledge, auth)
├── components/
│   ├── ui/                   # shadcn-style primitives
│   ├── marketing/            # Landing page sections
│   ├── dashboard/            # AppShell (sidebar + header)
│   ├── chat/                 # (future) Message, Composer, etc.
│   ├── agents/               # (future) Agent cards, forms
│   ├── knowledge/            # (future) KB cards, uploader
│   └── settings/             # (future) Settings sub-pages
├── lib/
│   ├── ai/
│   │   ├── client.ts         # LangGraph SDK wrapper
│   │   ├── types.ts          # Agent graph types
│   │   ├── nodes/core.ts     # Pluggable nodes
│   │   ├── graphs/default.ts # Default graph + runner + streamer
│   │   └── tools/            # Tool registry + built-in tools
│   ├── db/                   # Drizzle schema + client
│   ├── repositories/         # Data-access layer
│   ├── services/             # Business-logic layer (chatService)
│   ├── validators/           # Zod schemas
│   ├── types/                # Shared domain types
│   ├── mock-data.ts          # Demo catalogs
│   └── utils.ts
├── hooks/                    # React hooks (useChat)
├── config/                   # App-wide config
├── content/                  # (future) MDX/blog posts
└── tests/                    # (future) Test suites
```

## Quick start

```bash
cp .env.example .env.local
pnpm install          # or npm / yarn
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture highlights

- **Front-end**: Next.js App Router + Tailwind + shadcn/ui-style primitives. Dark-mode ready.
- **AI layer**: Custom graph abstraction that mirrors LangGraph semantics (`StateGraph`, nodes, edges). Swap `process.env.NEXT_PUBLIC_AI_MODE=remote` to point at a real LangGraph deployment via the SDK client.
- **Data layer**: Drizzle on PostgreSQL with typed repositories; swap to another DB by changing `lib/db/client.ts`.
- **Service layer**: `lib/services/chat.ts` exposes a `ChatService` interface with `mock` and `remote` implementations.
- **Validation**: Zod schemas in `lib/validators` reused by API routes.
- **Streaming**: `/api/chat` supports SSE streaming via `ReadableStream`, consumed by `hooks/useChat.ts`.

## Extending

- **Add an agent graph**: create a new file under `lib/ai/graphs/` and export it; plug it into `createChatService`.
- **Add a tool**: register it via `toolRegistry.register(...)` in `lib/ai/tools/builtins.ts` or your own file.
- **Add a page**: drop a folder + `page.tsx` under `app/(dashboard)/` or `app/(marketing)/`.
- **Add a DB table**: extend `lib/db/schema.ts`, run `pnpm db:generate`, and create a repository in `lib/repositories/`.

## Scripts

| Script | What |
| --- | --- |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:push` | Push schema to DB |
| `pnpm graph:dev` | Run LangGraph dev server (port 8123) |