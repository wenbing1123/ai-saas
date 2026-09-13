---
title: Python SDK
category: SDKs
sort: 60
---

# Python SDK

Because Nebula API is wire-compatible with both OpenAI and Anthropic, you use the official Python SDKs unchanged — you only override the base URL and pass your `sk-nebula-...` key.

## Install

Python 3.8 or newer is required.

```bash
pip install openai anthropic
```

We recommend installing inside a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install openai anthropic
```

Load your key from an environment variable instead of hard-coding it:

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

## OpenAI protocol

Point the `OpenAI` client at `{{base_url}}/v1` and call `chat.completions.create` exactly as you would against the upstream API:

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

Switch models by changing only the `model` value — for example `"gpt-4.1-mini"`. Use `GET /v1/models` to discover every id available to your account.

### Streaming with the OpenAI SDK

Set `stream=True` and iterate over the response. Each chunk exposes a small content delta:

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

## Anthropic protocol

Point the `Anthropic` client at `{{base_url}}/anthropic`. Note two Anthropic-specific rules: `max_tokens` is required, and the base URL has the `/anthropic` prefix (without `/v1`):

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

### Streaming with the Anthropic SDK

Use `.stream(...)` as a context manager and iterate over `text_stream`:

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

The SDK handles the `content_block_delta` SSE events for you and yields plain text.

## A protocol-agnostic helper pattern

Applications that let users pick models can keep two clients and select by the model's protocol:

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

## Handling errors

Both SDKs raise typed exceptions you can catch:

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

- `401` — check the key and its environment variable.
- `402` — top up your balance; the request was never sent upstream.
- `429` — retry with exponential backoff and respect `Retry-After`.
- `503` — upstream temporarily unavailable; retry after a short wait.

See the [Errors](/docs/errors) page for a ready-to-use backoff example and the full status code table.
