---
title: 快速开始
category: 入门指南
sort: 10
---

# 快速开始

Nebula API 用一个 API key 即可访问 DeepSeek、GPT、Claude、Gemini 等主流模型。费用从预付余额中按 token 扣除，没有月费，也没有任何承诺消费。按照本指南，大约五分钟即可跑通第一个请求。

## 工作原理

- **一个 key，多个模型。** 每个 API key 都以 `sk-nebula-` 开头，可访问你有权使用的全部模型。
- **两种通信协议。** 可以使用 OpenAI 兼容协议，也可以使用 Anthropic 兼容协议——你的工具或 SDK 原生支持哪种，就用哪种。
- **预付余额。** 每次成功请求后按 token 扣费。在控制台充值即可，支出完全由你掌控。

## 第一步——注册、充值并获取 key

1. 注册账号并登录控制台。
2. 打开 **Billing（账单）** 页面，向预付余额充值。
3. 进入 [Tokens](/dashboard/tokens) 页面，创建一个新的 API key。

> 完整的 key **只在创建时显示一次**。请立即复制并妥善保存。如果遗失，可以在同一页面吊销旧 key 并重新创建。

请像对待密码一样对待你的 key：不要提交到 git，也不要写进客户端代码。我们建议通过环境变量读取。

bash 或 zsh（Linux 与 macOS）：

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

Windows PowerShell：

```powershell
$env:NEBULA_API_KEY = "sk-nebula-..."
```

## 第二步——选择协议与 base URL

Nebula API 通过两个协议网关提供同一批模型。请选择与你的客户端匹配的那一个。

| 协议 | Base URL | Chat 端点 | 鉴权头 |
| --- | --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | `POST {{base_url}}/v1/chat/completions` | `Authorization: Bearer sk-nebula-...` |
| Anthropic | `{{base_url}}/anthropic` | `POST {{base_url}}/anthropic/v1/messages` | `x-api-key: sk-nebula-...` |

OpenAI SDK、Codex CLI 以及大多数第三方工具使用 OpenAI 协议；Anthropic SDK 和 Claude Code 使用 Anthropic 协议。两种协议共用同一个 key 和同一个预付余额。

> 请注意 Anthropic base URL 带有 `/anthropic` 路径前缀，这是必需的：两种协议位于不同路径，请求与响应结构也不同。

## 第三步——发出第一个请求

### OpenAI 协议

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

成功响应如下（为简洁省略了部分字段）：

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

### Anthropic 协议

Anthropic 协议要求携带 `anthropic-version` 请求头，并在请求体中提供 `max_tokens` 字段。

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

成功响应如下：

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

## 验证你的 key

不确定 key 是否有效？最快的检查方式是调用模型列表端点：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

- 返回 HTTP `200` 和一个模型 JSON 数组，说明 key 有效。
- 返回 HTTP `401 invalid_api_key`，说明 key 错误、已被吊销，或粘贴时带上了多余空格。

## 上生产环境之前

- 建立充值习惯：在控制台关注余额，提前充值。余额不足时请求会在到达上游之前被拒绝并返回 `402`，因此不会被扣费。
- 针对 `429` 和 `5xx` 响应添加重试逻辑。推荐的退避策略见 [错误处理](/docs/errors) 页面。
- 在生产代码中固定模型版本，并通过 `GET /v1/models` 查询当前可用的模型。

## 下一步

- [鉴权](/docs/authentication)——鉴权头、key 轮换与安全存储。
- [端点说明](/docs/endpoints)——两种协议的完整对比、stream 流式调用与模型列表。
- [Claude Code](/docs/claude-code)——让 Claude Code 接入 Nebula API。
- [OpenAI Codex CLI](/docs/codex)——配置 Codex CLI。
- [Python SDK](/docs/sdk-python)、[TypeScript SDK](/docs/sdk-typescript) 与 [Java](/docs/sdk-java)——各语言示例。
- [错误处理](/docs/errors)——状态码、重试与排查清单。
- [模型列表](/docs/models)——当前模型目录、上下文窗口与能力。
