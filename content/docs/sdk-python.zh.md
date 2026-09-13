---
title: Python SDK
category: SDK
sort: 60
---

# Python SDK

由于 Nebula API 与 OpenAI、Anthropic 的通信协议完全兼容，你可以原样使用官方 Python SDK——只需覆盖 base URL，并传入你的 `sk-nebula-...` key。

## 安装

需要 Python 3.8 或更高版本。

```bash
pip install openai anthropic
```

建议在虚拟环境中安装：

```bash
python -m venv .venv
source .venv/bin/activate  # Windows 下：.venv\Scripts\activate
pip install openai anthropic
```

请从环境变量读取 key，不要硬编码：

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

## OpenAI 协议

把 `OpenAI` 客户端指向 `{{base_url}}/v1`，然后像调用上游官方 API 一样调用 `chat.completions.create`：

```python
import os

from openai import OpenAI

client = OpenAI(
    base_url="{{base_url}}/v1",
    api_key=os.environ["NEBULA_API_KEY"],
)

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user", "content": "Give me one tip for visiting Bengaluru."},
    ],
    temperature=0.7,
)

print(response.choices[0].message.content)
print("tokens used:", response.usage.total_tokens)
```

切换模型只需修改 `model` 的值，例如 `"gpt-4.1-mini"`。调用 `GET /v1/models` 可查看你账户下可用的全部 id。

### 使用 OpenAI SDK 进行流式调用

设置 `stream=True` 并迭代响应，每个 chunk 都包含一小段内容增量：

```python
stream = client.chat.completions.create(
    model="deepseek-chat",
    stream=True,
    messages=[
        {"role": "user", "content": "Count from 1 to 5, one number per line."}
    ],
)

for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)
print()
```

## Anthropic 协议

把 `Anthropic` 客户端指向 `{{base_url}}/anthropic`。注意两条 Anthropic 特有规则：`max_tokens` 为必填项；base URL 带 `/anthropic` 前缀（不带 `/v1`）：

```python
import os

from anthropic import Anthropic

client = Anthropic(
    base_url="{{base_url}}/anthropic",
    api_key=os.environ["NEBULA_API_KEY"],
)

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system="You are a concise assistant.",
    messages=[
        {"role": "user", "content": "Give me one tip for visiting Bengaluru."}
    ],
)

print(message.content[0].text)
print("input tokens:", message.usage.input_tokens)
print("output tokens:", message.usage.output_tokens)
```

### 使用 Anthropic SDK 进行流式调用

通过 `.stream(...)` 上下文管理器迭代 `text_stream`：

```python
with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Count from 1 to 5, one number per line."}
    ],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
print()
```

SDK 会替你处理 `content_block_delta` SSE 事件，直接产出纯文本。

## 协议无关的封装模式

如果你的应用允许用户选择模型，可以同时持有两个客户端，按模型的协议选择：

```python
import os

from openai import OpenAI
from anthropic import Anthropic

openai_client = OpenAI(
    base_url="{{base_url}}/v1",
    api_key=os.environ["NEBULA_API_KEY"],
)
anthropic_client = Anthropic(
    base_url="{{base_url}}/anthropic",
    api_key=os.environ["NEBULA_API_KEY"],
)


def chat(protocol: str, model: str, prompt: str) -> str:
    if protocol == "openai":
        resp = openai_client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    if protocol == "anthropic":
        msg = anthropic_client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text

    raise ValueError(f"unknown protocol: {protocol}")


if __name__ == "__main__":
    print(chat("openai", "deepseek-chat", "Hello!"))
    print(chat("anthropic", "claude-sonnet-4-20250514", "Hello!"))
```

## 错误处理

两个 SDK 都会抛出带类型的异常，可以捕获：

```python
from openai import APIStatusError, RateLimitError

try:
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": "Hi"}],
    )
except RateLimitError:
    print("Rate limited — back off and retry later.")
except APIStatusError as exc:
    print("HTTP", exc.status_code, exc.response.text)
```

- `401`——检查 key 及其环境变量。
- `402`——余额不足，请充值；请求从未发送到上游。
- `429`——使用指数退避重试，并遵守 `Retry-After`。
- `503`——上游暂时不可用；稍等后重试。

可直接使用的退避示例与完整状态码表见 [错误处理](/docs/errors) 页面。
