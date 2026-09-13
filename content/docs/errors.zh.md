---
title: 错误码
category: 参考
sort: 90
---

# 错误与重试

Nebula API 使用标准 HTTP 状态码。每个错误响应都是一个 JSON，其中的 `error` 对象包含稳定、机器可读的 `type`、以状态码表示的 `code`，以及便于人阅读的 `message`：

```json
{
  "error": {
    "type": "invalid_api_key",
    "code": "401",
    "message": "Invalid or revoked API key."
  }
}
```

## 状态码总览

| 状态码 | 错误类型 | 含义 | 是否可安全重试 |
| --- | --- | --- | --- |
| 400 | `bad_request` | 请求体格式错误或协议不匹配 | 修改请求后可重试 |
| 401 | `invalid_api_key` | key 缺失、错误或已吊销 | 修正 key 后可重试 |
| 402 | `insufficient_balance` | 预付余额不足 | 充值后可重试 |
| 404 | `model_not_found` | 该协议下不存在此 model id | 更换模型后可重试 |
| 429 | `rate_limited` | 超过每分钟请求数或并发限制 | 可以，需退避 |
| 503 | `upstream_unavailable` / `maintenance` | 上游供应商或网关不可用 | 可以，需退避 |

其他 `5xx` 响应适用相同的重试建议。遇到任何意外响应，可视为瞬时错误重试一次。

## 401——invalid_api_key

key 无法通过鉴权。常见原因：

- key 拼写错误，或已在 [Tokens](/dashboard/tokens) 页面被吊销而失效。
- 粘贴 key 时带上了结尾空格、换行或引号。
- 协议与请求头不匹配：`/v1` 应使用 `Authorization: Bearer`，而 `/anthropic` 应使用 `x-api-key`。

在应用之外直接测试 key：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer sk-nebula-..."
```

返回 `200` 说明 key 没问题，问题出在客户端发送方式上。

## 402——insufficient_balance

预付余额低于本次请求的预估费用。Nebula API 会在**联系上游模型供应商之前**执行该检查，因此：

- 请求根本不会到达模型。
- 不会消耗任何输入或输出 token。
- 不会扣除余额。

在账单页面充值后，原样重发请求即可。长时间运行的任务应当显式处理 `402`，暂停任务或发出告警，而不是紧密循环重试。

## 404——model_not_found

在你调用的网关上，`model` 值不可用。有两种情况：

1. id 拼写错误，或版本快照日期有误（例如已下线的快照版本）。
2. 模型属于另一种协议——把 Anthropic id 发到了 `/v1/chat/completions`，或把 OpenAI 系列 id 发到了 `/anthropic/v1/messages`。

模型列表端点是唯一准绳：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

请逐字使用返回的 `id` 值，并在 [模型列表](/docs/models) 页面查看每个模型所属的协议。

## 429——rate_limited

平台同时对**每分钟请求数（RPM）**和**同时在途请求数（并发）**设有限制。超出任一限制都会返回 `429 rate_limited`。这是为了保护网关与上游供应商，不是计费错误。

响应可能包含 `Retry-After` 头，提示需要等待多少秒：

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 5
```

请使用指数退避重试：先等待较短时间，每次失败后加倍，并加入抖动（jitter）以避免重试风暴，同时设置等待上限与最大尝试次数。Python 示例：

```python
import random
import time

import requests


def create_completion_with_backoff(url, headers, payload, max_attempts=6):
    delay = 1.0
    for attempt in range(max_attempts):
        resp = requests.post(url, headers=headers, json=payload, timeout=120)

        if resp.status_code != 429 and resp.status_code < 500:
            resp.raise_for_status()
            return resp.json()

        retry_after = resp.headers.get("Retry-After")
        if retry_after:
            wait = float(retry_after)
        else:
            wait = delay + random.uniform(0, delay * 0.5)
            delay = min(delay * 2, 60.0)

        print(f"attempt {attempt + 1} failed ({resp.status_code}); "
              f"waiting {wait:.1f}s")
        time.sleep(wait)

    raise RuntimeError("exhausted retry attempts")


result = create_completion_with_backoff(
    "{{base_url}}/v1/chat/completions",
    {
        "Authorization": "Bearer sk-nebula-...",
        "Content-Type": "application/json",
    },
    {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": "Hello"}],
    },
)
print(result)
```

如果流量不大却频繁遇到 `429`，请降低并发、放缓批量节奏，或联系支持团队申请更高限额。

## 503——upstream_unavailable / maintenance

网关本身正常，但某个上游模型供应商暂时故障或处于维护状态，也可能是网关正在进行短暂维护。请求有可能到达了模型，也可能没有。

- 使用与 `429` 相同的指数退避策略重试。
- 对于非流式请求，重试是安全的：失败的调用不会产生补全结果，也不会计费。
- 计划内维护期间，请查看控制台状态页获取更新。

## 400——bad request

请求在调用任何模型之前就被拒绝，因此绝不会计费。典型原因：

- JSON 非法、缺少必填字段（尤其是 Anthropic 协议下的 `max_tokens`），或 Content-Type 不正确。
- **协议不匹配：** 把 Anthropic 系列模型 id 发到 OpenAI 端点，或反之。
- 目标模型不接受某些参数值。

`message` 字段会说明具体的校验失败原因。请修正请求体，不要盲目重试。

## 流式中断如何计费

当 `"stream": true` 时，token 是逐步产生的。如果流完整结束，按最终用量事件中报告的全部输入与输出 token 计费。如果连接中途断开或被取消：

- 本次请求的输入 token 会计费。
- 仅对中断前实际下发的输出 token 计费。
- 未下发的后续 token 不计费。

如果需要完整回答，请重新连接并重发请求；可以考虑把已收到的部分回答带入对话以续接。

## 排查清单

按顺序执行以下步骤，可以快速排除绝大多数故障：

1. **验证 key。** 运行 `curl {{base_url}}/v1/models -H "Authorization: Bearer $NEBULA_API_KEY"`。`401` 表示 key 问题；`402` 表示余额问题。
2. **检查余额。** 余额为空时，所有模型请求都会在到达上游前被 `402` 拦截。
3. **模型与协议匹配。** 以 `GET /v1/models` 的返回核对 model id：Anthropic 模型发往 `/anthropic/v1/messages`，OpenAI 系列模型发往 `/v1/chat/completions`。
4. **检查请求头与 base URL。** OpenAI 使用 `Authorization: Bearer`，base 为 `{{base_url}}/v1`；Anthropic 使用 `x-api-key` 加 `anthropic-version: 2023-06-01`，base 为 `{{base_url}}/anthropic`。
5. **查看用量与日志。** 控制台用量页面显示最近请求的状态与 token 消耗，可帮助区分被拒绝的调用与成功的调用。
6. **为瞬时错误加重试。** 用指数退避、抖动和最大尝试次数处理 `429` 与 `503`。

如果执行以上步骤后请求仍然失败，请记录完整状态码、响应体以及响应头中的 request id，联系支持团队。
