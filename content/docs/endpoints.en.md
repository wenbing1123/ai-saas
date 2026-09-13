---
title: API Endpoints
category: Getting Started
sort: 30
---

# API Endpoints

Nebula API serves the same model catalog through two protocol gateways: an OpenAI-compatible gateway and an Anthropic-compatible gateway. Both are plain HTTPS JSON APIs; you can call them from any language, even with nothing more than `curl`.

## Base URLs

| Protocol | Base URL | Use with |
| --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | OpenAI SDKs, Codex CLI, OpenAI-compatible tools |
| Anthropic | `{{base_url}}/anthropic` | Anthropic SDKs, Claude Code |

> The Anthropic base URL includes the `/anthropic` prefix and **not** a `/v1` suffix. SDKs and clients append `/v1/messages` to it themselves. The OpenAI base URL does include `/v1`.

## Endpoint reference

| | OpenAI protocol | Anthropic protocol |
| --- | --- | --- |
| Chat completion | `POST {{base_url}}/v1/chat/completions` | `POST {{base_url}}/anthropic/v1/messages` |
| Model list | `GET {{base_url}}/v1/models` | `GET {{base_url}}/v1/models` |
| Auth header | `Authorization: Bearer sk-nebula-...` | `x-api-key: sk-nebula-...` |
| Version header | not required | `anthropic-version: 2023-06-01` |
| Response shape | `choices[].message` | `content[]` blocks |
| Streaming | SSE, `"stream": true` | SSE, `"stream": true` |

Model availability depends on the protocol: an Anthropic-family model is called through the Anthropic gateway, and OpenAI- or DeepSeek-family models through the OpenAI gateway. The [Models](/docs/models) page shows which protocol each model uses.

## OpenAI: chat completions

Request:

```bash
curl {{base_url}}/v1/chat/completions \
  -H "Authorization: Bearer $NEBULA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "system", "content": "You are a concise assistant."},
      {"role": "user", "content": "Name one fast way to get around Moscow."}
    ],
    "temperature": 0.7
  }'
```

Response (abbreviated):

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
        "content": "The Moscow Metro is the fastest way across the city."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 22,
    "completion_tokens": 11,
    "total_tokens": 33
  }
}
```

The assistant's answer is at `choices[0].message.content`. Token accounting is in the `usage` object.

## Anthropic: messages

Request — note the two custom headers and the mandatory `max_tokens`:

```bash
curl {{base_url}}/anthropic/v1/messages \
  -H "x-api-key: $NEBULA_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "system": "You are a concise assistant.",
    "messages": [
      {"role": "user", "content": "Name one fast way to get around Jakarta."}
    ]
  }'
```

Response (abbreviated):

```json
{
  "id": "msg_01Xx...",
  "type": "message",
  "role": "assistant",
  "model": "claude-sonnet-4-20250514",
  "content": [
    {
      "type": "text",
      "text": "Jakarta MRT combined with TransJakarta bus lanes is usually the fastest option."
    }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 20,
    "output_tokens": 16
  }
}
```

The answer is inside the `content` array as a block of `type: "text"`. `stop_reason` is `end_turn` when the model finished normally and `max_tokens` when the output limit was reached.

## Streaming responses

Both protocols support server-sent events. Add `"stream": true` to the JSON body and consume the event stream.

### OpenAI streaming

```bash
curl {{base_url}}/v1/chat/completions \
  -H "Authorization: Bearer $NEBULA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "stream": true,
    "messages": [{"role": "user", "content": "Count to three."}]
  }'
```

The response is a sequence of `data:` lines. Each chunk carries a small delta:

```text
data: {"choices":[{"delta":{"content":"1"}}]}

data: {"choices":[{"delta":{"content":", 2"}}]}

data: {"choices":[{"delta":{"content":", 3"}}]}

data: [DONE]
```

The stream ends with the line `data: [DONE]`. Official SDKs parse these deltas for you — see the [SDK pages](/docs/sdk-python).

### Anthropic streaming

```bash
curl {{base_url}}/anthropic/v1/messages \
  -H "x-api-key: $NEBULA_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "stream": true,
    "messages": [{"role": "user", "content": "Count to three."}]
  }'
```

Events arrive as `event:` / `data:` pairs. Text increments arrive in `content_block_delta` events:

```text
event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"1"}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":", 2"}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":", 3"}}

event: message_stop
data: {"type":"message_stop"}
```

Concatenate the `delta.text` values in order to reconstruct the full answer.

> Even with streaming, you are billed for the tokens actually consumed. If a stream is interrupted midway, only the input tokens and the output tokens delivered before the interruption are charged. See [Errors](/docs/errors).

## Listing available models

A single endpoint returns every model enabled on your account:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

Response (abbreviated):

```json
{
  "object": "list",
  "data": [
    {
      "id": "deepseek-chat",
      "object": "model",
      "owned_by": "nebula"
    },
    {
      "id": "claude-sonnet-4-20250514",
      "object": "model",
      "owned_by": "nebula"
    }
  ]
}
```

Always take the `id` values from this endpoint as the source of truth for the `model` field. Catalog changes (new versions, deprecations) are reflected here first.

## Common mistakes

- Sending an Anthropic model id to `/v1/chat/completions`, or an OpenAI model id to `/anthropic/v1/messages`. This returns a `400` or `404`; use the protocol assigned to the model.
- Adding a trailing slash to the base URL, or configuring the Anthropic base URL as `{{base_url}}/anthropic/v1` in a client that appends `/v1/messages` itself. Use exactly the base URLs from the table above.
- Forgetting `max_tokens` in an Anthropic request — it is required and the request is rejected without it.
- Sending `"stream": true` but parsing the response as a single JSON document. Streams must be consumed line by line as SSE.
