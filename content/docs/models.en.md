---
title: Models
category: Reference
sort: 100
---

# Models

Nebula API gives every account access to a curated catalog of chat models from multiple providers — including DeepSeek, OpenAI GPT, Anthropic Claude and Google Gemini families — behind one key and one prepaid balance. This page explains how the catalog is organized and how to always discover the freshest list programmatically.

## How models are grouped

Every model belongs to exactly one **protocol**, which determines the endpoint, headers and request shape you must use:

- **OpenAI protocol** — call `POST {{base_url}}/v1/chat/completions` with `Authorization: Bearer sk-nebula-...`. Used by OpenAI, DeepSeek and most other families, as well as the Codex CLI and generic OpenAI-compatible tools.
- **Anthropic protocol** — call `POST {{base_url}}/anthropic/v1/messages` with `x-api-key` and `anthropic-version: 2023-06-01`. Used by Claude models, the Anthropic SDK and Claude Code.

A model id is valid only on its own protocol. Sending it to the other gateway results in a `400` or `404` error — see [Errors](/docs/errors).

## Capabilities

The catalog flags which extra features each model supports:

- **Vision** — the model accepts image inputs alongside text (multimodal messages). Use vision models for screenshots, photos, scanned documents and diagrams.
- **Tools** — the model supports tool / function calling, where it can request that your application run a function and feed the result back into the conversation.
- **Reasoning** — the model performs extended chain-of-thought reasoning before answering, which improves results on hard analytical or coding tasks and may take longer per token.

If a capability is not listed for a model, do not send the corresponding parameters — the request may be rejected.

## Context window and maximum output

Two numbers govern the size of a request:

- **Context window** — the total number of tokens the model can consider in one request, counting the system prompt, conversation history, tool results and your new message.
- **Maximum output** — the cap on tokens the model may generate in the response. On the Anthropic protocol this is the value you pass as `max_tokens`; on the OpenAI protocol an equivalent output limit applies.

Long conversations should be summarized, trimmed or chunked to stay inside the context window. Input beyond the limit is either rejected or truncated depending on the model.

## Cached tokens

Some models in the catalog support **prompt caching**: when the same prefix (for example a long system prompt or a set of reference documents) is sent repeatedly, the cached portion of the input is billed at a discounted cache rate instead of the full input rate. Caching happens automatically when a provider marks repeated prefix tokens as a cache hit — there is no separate API to enable. Build requests with stable, identical prefixes first and the variable part last to maximize cache hits and lower cost.

## How billing is counted

Three token categories appear on every bill:

- **Input tokens** — everything sent to the model: system prompt, conversation history, tool results and images (vision models count images as token blocks).
- **Output tokens** — everything the model generates. Output is typically priced higher per token than input.
- **Cached input tokens** — repeated prefix tokens that hit the prompt cache, billed at the discounted cache rate instead of the standard input rate.

The `usage` object on every non-streaming response — and the final event of every stream — reports these counts. Reconcile them with the dashboard usage page to monitor spend per environment.

## Reading the catalog table

Each row below shows the model id you pass in the `model` field, its protocol, context window, maximum output, supported capabilities and per-token price. When choosing, work from your own constraints: pick the cheapest model with the smallest context window that still clears the task's quality bar, and reserve flagship models for the steps that genuinely need them.

## Cost control tips

- Reuse stable, identical prefixes so prompt caching can kick in.
- Summarize or truncate old conversation history instead of resending it all.
- Set `max_tokens` (Anthropic) or the equivalent output limit (OpenAI) to cap runaway generations.
- Use mid-tier models for routing, classification and drafts; call a flagship model only for the final hard step.
- Issue separate keys per environment and watch each one on the dashboard usage page.

## Live model table

Below is the current catalog for your region. Prices, context windows and capabilities are kept up to date automatically; if this page and the `GET /v1/models` endpoint ever disagree, the API response wins.

{{models_table}}

> The table above is rendered from live data. If you are reading a cached or exported copy of this page, run the API call in the next section to fetch the current catalog.

## Fetching the list programmatically

The authoritative, real-time list is always available from the gateway. This returns the models enabled for your account, including newly released versions:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

Example response (abbreviated):

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
      "id": "gpt-4.1-mini",
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

The same endpoint works with Python's standard library, so you can validate a key and inspect the catalog without extra dependencies:

```python
import json
import os
import urllib.request

request = urllib.request.Request(
    "{{base_url}}/v1/models",
    headers={
        "Authorization": "Bearer " + os.environ["NEBULA_API_KEY"],
    },
)

with urllib.request.urlopen(request, timeout=30) as response:
    payload = json.load(response)

for model in payload["data"]:
    print(model["id"])
```

Or with the OpenAI SDK, which parses the response into objects:

```python
from openai import OpenAI

client = OpenAI(
    base_url="{{base_url}}/v1",
    api_key=os.environ["NEBULA_API_KEY"],
)

for model in client.models.list().data:
    print(model.id)
```

## Choosing and pinning a model

- For everyday chat and high-volume tasks, start with a balanced mid-tier model and upgrade only if quality demands it.
- For complex coding or reasoning work, pick a model with the **reasoning** capability.
- For screenshots and documents, pick a **vision** model.
- In production code, pin the exact dated or versioned model id you tested against. When you want an upgrade, fetch the latest ids from `GET /v1/models`, test, and then switch deliberately.

## Versioning policy

Model versions can be updated over time: providers release new snapshots, and older snapshots may be deprecated. The live table above and the `GET /v1/models` endpoint always reflect what is currently served, including deprecation status where available. Announcements are made before removals whenever possible, but integration code should tolerate a model disappearing and be ready to fall back to another id from the list.
