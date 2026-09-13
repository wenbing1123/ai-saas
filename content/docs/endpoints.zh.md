---
title: API 端点
category: 入门指南
sort: 30
---

# API 端点

Nebula API 通过两个协议网关提供同一批模型：OpenAI 兼容网关与 Anthropic 兼容网关。两者都是基于 HTTPS 的 JSON API，使用任何语言——哪怕只用 `curl`——都可以直接调用。

## Base URL

| 协议 | Base URL | 适用对象 |
| --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | OpenAI SDK、Codex CLI、OpenAI 兼容工具 |
| Anthropic | `{{base_url}}/anthropic` | Anthropic SDK、Claude Code |

> Anthropic base URL 包含 `/anthropic` 前缀，但**不**带 `/v1` 后缀，SDK 与客户端会自行拼接 `/v1/messages`。OpenAI base URL 则包含 `/v1`。

## 端点参考

| | OpenAI 协议 | Anthropic 协议 |
| --- | --- | --- |
| 对话补全 | `POST {{base_url}}/v1/chat/completions` | `POST {{base_url}}/anthropic/v1/messages` |
| 模型列表 | `GET {{base_url}}/v1/models` | `GET {{base_url}}/v1/models` |
| 鉴权头 | `Authorization: Bearer sk-nebula-...` | `x-api-key: sk-nebula-...` |
| 版本头 | 不需要 | `anthropic-version: 2023-06-01` |
| 响应结构 | `choices[].message` | `content[]` 内容块 |
| 流式调用 | SSE，`"stream": true` | SSE，`"stream": true` |

模型的可用性与协议相关：Anthropic 系列模型通过 Anthropic 网关调用，OpenAI、DeepSeek 系列模型通过 OpenAI 网关调用。各模型对应的协议见 [模型列表](/docs/models) 页面。

## OpenAI：chat completions

请求：

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

响应（节选）：

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

助手的回答位于 `choices[0].message.content`，token 用量在 `usage` 对象中。

## Anthropic：messages

请求——注意两个自定义请求头，以及必填的 `max_tokens`：

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

响应（节选）：

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

回答位于 `content` 数组中一个 `type: "text"` 的内容块里。模型正常结束时 `stop_reason` 为 `end_turn`，达到输出上限时为 `max_tokens`。

## 流式响应

两种协议都支持 server-sent events（SSE）。在 JSON 请求体中加入 `"stream": true`，然后消费事件流即可。

### OpenAI 流式

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

响应由一系列 `data:` 行组成，每个 chunk 携带一小段增量：

```text
data: {"choices":[{"delta":{"content":"1"}}]}

data: {"choices":[{"delta":{"content":", 2"}}]}

data: {"choices":[{"delta":{"content":", 3"}}]}

data: [DONE]
```

流以 `data: [DONE]` 行结束。官方 SDK 会帮你解析这些增量，见 [SDK 页面](/docs/sdk-python)。

### Anthropic 流式

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

事件以 `event:` / `data:` 成对到达，文本增量通过 `content_block_delta` 事件下发：

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

按顺序拼接各个 `delta.text` 即可还原完整回答。

> 即使是流式调用，也按实际消耗的 token 计费。如果流中途中断，只对输入 token 与中断前已下发的输出 token 计费。详见 [错误处理](/docs/errors)。

## 列出可用模型

一个端点即可返回你账户上启用的全部模型：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

响应（节选）：

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

请始终以该端点返回的 `id` 值作为 `model` 字段的唯一准绳。目录变更（新版本上线、旧版本下线）会最先反映在这里。

## 常见错误

- 把 Anthropic 系列的 model id 发到 `/v1/chat/completions`，或把 OpenAI 系列的 model id 发到 `/anthropic/v1/messages`。这会返回 `400` 或 `404`；请使用模型所属的协议。
- 给 base URL 加结尾斜杠，或在会自行拼接 `/v1/messages` 的客户端里把 Anthropic base URL 配成 `{{base_url}}/anthropic/v1`。请严格使用上表中的 base URL。
- Anthropic 请求漏掉 `max_tokens`——该字段必填，缺少会被拒绝。
- 发送了 `"stream": true` 却把响应当成单个 JSON 文档解析。流式响应必须按 SSE 逐行消费。
