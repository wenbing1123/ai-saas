---
title: Quickstart
category: Getting Started
sort: 10
---

# Quickstart

Nebula API gives you a single API key for DeepSeek, GPT, Claude, Gemini and other leading models. You pay per token from a prepaid balance — there is no monthly fee and no commitment. This guide walks you through a working request in about five minutes.

## How it works

- **One key, many models.** Every API key starts with `sk-nebula-` and works across every model you have access to.
- **Two wire protocols.** Speak the OpenAI-compatible protocol or the Anthropic-compatible protocol — whichever your tool or SDK already uses.
- **Prepaid balance.** Tokens are deducted after each successful request. Top up in the dashboard and keep full control of your spend.

## Step 1 — Sign up, top up and get your key

1. Register an account and sign in to the dashboard.
2. Open the **Billing** page and add credit to your prepaid balance.
3. Go to [Tokens](/dashboard/tokens) and create a new API key.

> The full key is displayed **only once**, right after creation. Copy it immediately and store it somewhere safe. If you lose it, revoke the key and create a new one on the same page.

Treat your key like a password. Never commit it to git or paste it into client-side code. We recommend loading it from an environment variable.

On bash or zsh (Linux and macOS):

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

On Windows PowerShell:

```powershell
$env:NEBULA_API_KEY = "sk-nebula-..."
```

## Step 2 — Pick a protocol and base URL

Nebula API exposes the same models through two protocol gateways. Pick the one that matches your client.

| Protocol | Base URL | Chat endpoint | Auth header |
| --- | --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | `POST {{base_url}}/v1/chat/completions` | `Authorization: Bearer sk-nebula-...` |
| Anthropic | `{{base_url}}/anthropic` | `POST {{base_url}}/anthropic/v1/messages` | `x-api-key: sk-nebula-...` |

Use the OpenAI protocol with the OpenAI SDK, the Codex CLI and most third-party tools. Use the Anthropic protocol with the Anthropic SDK and Claude Code. Both protocols share the same key and the same prepaid balance.

> Note the `/anthropic` path prefix on the Anthropic base URL. It is required: the two protocols live on different paths and use different request and response shapes.

## Step 3 — Send your first request

### OpenAI protocol

```bash
curl {{base_url}}/v1/chat/completions \
  -H "Authorization: Bearer $NEBULA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": "Say hello in one short sentence."}
    ]
  }'
```

A successful response looks like this (some fields omitted for brevity):

```json
{
  "id": "chatcmpl-8f3a...",
  "object": "chat.completion",
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 9,
    "total_tokens": 23
  }
}
```

### Anthropic protocol

The Anthropic protocol requires the `anthropic-version` header and a `max_tokens` field in the body.

```bash
curl {{base_url}}/anthropic/v1/messages \
  -H "x-api-key: $NEBULA_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Say hello in one short sentence."}
    ]
  }'
```

A successful response looks like this:

```json
{
  "id": "msg_01Xx...",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-20250514",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 14,
    "output_tokens": 9
  }
}
```

## Verify your key

Not sure whether a key is valid? The fastest check is the model list endpoint:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

- HTTP `200` with a JSON array of models means the key is valid.
- HTTP `401 invalid_api_key` means the key is wrong, revoked or pasted with extra whitespace.

## Before you go to production

- Set a spending routine: watch your balance on the dashboard and top up before it runs out. Requests made with an empty balance are rejected with `402` before they reach the upstream provider, so you are never charged for them.
- Add retry logic for `429` and `5xx` responses. See the [Errors](/docs/errors) page for the recommended backoff.
- Pin model versions in production code, and use `GET /v1/models` to discover what is currently available.

## Next steps

- [Authentication](/docs/authentication) — auth headers, key rotation and safe key storage.
- [Endpoints](/docs/endpoints) — a full side-by-side comparison of both protocols, streaming and the model list.
- [Claude Code](/docs/claude-code) — run Claude Code against Nebula API.
- [OpenAI Codex CLI](/docs/codex) — configure the Codex CLI.
- [Python SDK](/docs/sdk-python), [TypeScript SDK](/docs/sdk-typescript) and [Java](/docs/sdk-java) — language-specific examples.
- [Errors](/docs/errors) — status codes, retries and a troubleshooting checklist.
- [Models](/docs/models) — the current model catalog, context windows and capabilities.
