---
title: 鉴权
category: 入门指南
sort: 20
---

# 鉴权

Nebula API 的每个请求都通过 API key 鉴权。key 在 [Tokens](/dashboard/tokens) 页面创建，一律以 `sk-nebula-` 开头，并且同一个 key 可用于两个协议网关，共享同一个预付余额。

## 创建 API key

1. 登录控制台，打开 [Tokens](/dashboard/tokens) 页面。
2. 选择 **Create token（创建令牌）**，起一个容易辨认的名字（例如 `laptop` 或 `ci-prod`），然后确认。
3. 立即复制生成的 key。

> 完整的 key **只在创建时显示一次**。离开页面后将永远无法再次查看。请把它存到密码管理器、密钥管理服务，或不纳入版本控制的环境变量文件中。

为每台设备或每个环境分别创建 key，可以在吊销其中一个时不影响其他 key 的使用。

## 两种鉴权方式

两个协议网关要求的请求头不同，请不要混用——向 Anthropic 网关发送 Bearer token，或向 OpenAI 网关发送 `x-api-key` 头，都会被拒绝。

| 协议 | Base URL | 必需请求头 |
| --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | `Authorization: Bearer sk-nebula-...` |
| Anthropic | `{{base_url}}/anthropic` | `x-api-key: sk-nebula-...` 与 `anthropic-version: 2023-06-01` |

### OpenAI 协议

通过标准的 `Authorization` 头以 bearer token 形式发送 key：

```bash
curl {{base_url}}/v1/chat/completions \
  -H "Authorization: Bearer sk-nebula-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

配置 OpenAI 兼容 SDK 时，key 通常通过 `apiKey` 参数传入，示例见 [Python](/docs/sdk-python) 与 [TypeScript](/docs/sdk-typescript) 页面。

### Anthropic 协议

通过 `x-api-key` 头发送 key，并且必须始终携带 API 版本头：

```bash
curl {{base_url}}/anthropic/v1/messages \
  -H "x-api-key: sk-nebula-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

当前支持的版本为 `2023-06-01`。缺少该请求头的请求会被拒绝。

## 未鉴权请求的表现

没有携带 key、key 为空，或为网关发送了错误的请求头时，请求会在任何计费逻辑之前被拒绝：

```text
HTTP/1.1 401 Unauthorized
```

```json
{
  "error": {
    "type": "invalid_api_key",
    "code": "401",
    "message": "Missing or invalid API key."
  }
}
```

OpenAI 网关会忽略 `x-api-key` 头，Anthropic 网关会忽略 `Authorization` 头——发送另一种协议的请求头，其效果等同于完全没有发送 key。

## 一个 key 用于多种工具

由于任何客户端都只需要 base URL 和鉴权头，一个 key 就能驱动你的整套技术栈：

- **SDK**——通过标准的 `apiKey` / `api_key` 参数传入，见 [Python](/docs/sdk-python)、[TypeScript](/docs/sdk-typescript) 与 [Java](/docs/sdk-java) 页面。
- **CLI 工具**——导出该工具读取的环境变量，例如 `ANTHROPIC_AUTH_TOKEN` 或 `NEBULA_API_KEY`，见 [Claude Code](/docs/claude-code) 与 [Codex](/docs/codex) 指南。
- **原生 HTTP**——在每个请求中显式设置请求头，包括模型列表之类的 `GET` 调用。

虽然一个 key 可以到处使用，仍建议为每台设备或每个环境创建独立 key，以便单独吊销。

## 测试 key

随时可以通过向模型列表端点发送 `GET` 请求来验证 key 是否可用。该调用开销很小，不会真正运行模型：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer sk-nebula-..."
```

结果含义：

- **200 OK**——key 有效且处于启用状态。
- **401 invalid_api_key**——key 错误、已被吊销，或复制时带上了首尾空格。
- **402 insufficient_balance**——key 有效，但账户余额为空；充值后重试即可。

## 吊销与轮换 key

当 key 可能泄露、有成员离开团队，或按照常规安全计划轮换时：

1. 在 [Tokens](/dashboard/tokens) 页面创建一个新 key，并部署到你的应用或设备。
2. 确认新 key 可用（例如用上面的 `GET /v1/models` 检查）。
3. 在同一页面吊销旧 key。吊销立即生效。

被吊销的 key 在任何请求中都会返回 `401 invalid_api_key`。吊销无法撤销，请直接创建新 key。

## 余额与 402 拦截

key 本身没有独立的信用额度——账户下所有 key 共用同一个预付余额。在请求被转发到上游之前，Nebula API 会先检查余额。如果余额不足以覆盖本次请求，网关会返回：

```json
{
  "error": {
    "type": "insufficient_balance",
    "code": "402",
    "message": "Your balance is insufficient to complete this request."
  }
}
```

由于请求在**调用上游模型之前**就被拦截，不会消耗任何 token，也不会扣费。充值后原样重试该请求即可。

## 安全保管 key

- **使用环境变量。** 从环境中读取 key，不要硬编码：

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

- **不要把密钥提交到 git。** 将 `.env` 文件加入 `.gitignore`，改用带占位值的 `.env.example` 文件。
- **不要在浏览器或移动应用中暴露 key。** 客户端代码无法保密，请改为从你自己的后端调用 Nebula API。
- **小心空白字符。** 粘贴的 key 有时会带上结尾换行或空格，导致 `401`。如有疑问，检查值的长度，或重新复制。
- **泄露后立即轮换。** 如果 key 出现在日志、截图、工单或公开仓库中，请立即吊销并创建新 key。

## 排查清单

1. 先运行上面的 `GET /v1/models` curl 检查，把问题与应用代码隔离开。
2. 确认你按协议发送了正确的请求头：`/v1` 用 `Authorization`，`/anthropic` 用 `x-api-key` 加 `anthropic-version`。
3. 检查 key 值周围是否有多余空格或引号。
4. 打开控制台，确认 key 未被吊销、余额不为空。
5. 如果请求仍然失败，请参考 [错误处理](/docs/errors) 页面中针对各状态码的说明。
