---
title: Error Codes
category: Reference
sort: 90
---

# Errors & Retries

Nebula API uses conventional HTTP status codes. Every error response has a JSON body with an `error` object carrying a stable machine-readable `type`, the status as `code`, and a human-readable `message`:

```json
{
  "error": {
    "type": "invalid_api_key",
    "code": "401",
    "message": "Invalid or revoked API key."
  }
}
```

## Status code overview

| Status | Error type | Meaning | Safe to retry? |
| --- | --- | --- | --- |
| 400 | `bad_request` | Malformed body or protocol mismatch | After fixing the request |
| 401 | `invalid_api_key` | Missing, wrong or revoked key | After fixing the key |
| 402 | `insufficient_balance` | Prepaid balance too low | After topping up |
| 404 | `model_not_found` | Unknown model id for the protocol | After changing the model |
| 429 | `rate_limited` | Requests per minute or concurrency exceeded | Yes, with backoff |
| 503 | `upstream_unavailable` / `maintenance` | Upstream provider or gateway unavailable | Yes, with backoff |

`5xx` responses other than 503 follow the same retry guidance. Treat any unexpected response as transient and retry once.

## 401 — invalid_api_key

The key could not be authenticated. Common causes:

- The key is misspelled or no longer active because it was revoked on [Tokens](/dashboard/tokens).
- A trailing space, newline or set of quotes was pasted along with the key.
- The wrong header is used for the protocol: `Authorization: Bearer` on `/v1`, but `x-api-key` on `/anthropic`.

Test the key directly, outside your application:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer sk-nebula-..."
```

A `200` response means the key is fine and the bug is in how the client sends it.

## 402 — insufficient_balance

Your prepaid balance is lower than the estimated cost of the request. Nebula API performs this check **before** contacting the upstream model provider, so:

- The request never reaches the model.
- No input or output tokens are consumed.
- Your balance is not charged.

Top up on the billing page and send the identical request again. Long-running jobs should check for `402` explicitly and pause or alert instead of retrying in a tight loop.

## 404 — model_not_found

The `model` value is not available on the gateway you called. Two situations produce this:

1. The id is misspelled or versioned incorrectly (for example a retired snapshot date).
2. The model belongs to the other protocol — an Anthropic id sent to `/v1/chat/completions`, or an OpenAI-family id sent to `/anthropic/v1/messages`.

The model list endpoint is the source of truth:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

Use the returned `id` values verbatim, and check the [Models](/docs/models) page for each model's protocol.

## 429 — rate_limited

Limits exist on both **requests per minute (RPM)** and the number of **simultaneous in-flight requests (concurrency)**. Exceeding either returns `429 rate_limited`. This protects both the gateway and the upstream providers; it is not a billing error.

The response may include a `Retry-After` header indicating how many seconds to wait:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 5
```

Retry with exponential backoff: start with a short delay, double it after every failed attempt, add jitter to avoid synchronized retries, and cap both the delay and the number of attempts. Python example:

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

If you hit `429` constantly even with modest traffic, reduce concurrency, batch less aggressively, or contact support about higher limits.

## 503 — upstream_unavailable / maintenance

The gateway is healthy but an upstream model provider is temporarily failing or under maintenance, or the gateway itself is in a short maintenance window. The request may or may not have reached the model.

- Retry with the same exponential backoff as for `429`.
- For non-streaming requests, retrying is safe: a failed call does not produce a completion and is not charged.
- During scheduled maintenance, check the dashboard status page for updates.

## 400 — bad request

The request was rejected before any model call, so it is never charged. Typical causes:

- Invalid JSON, a missing required field (notably `max_tokens` on the Anthropic protocol), or the wrong content type.
- **Protocol mismatch:** sending an Anthropic-family model id to the OpenAI endpoint, or vice versa.
- Parameter values the target model does not accept.

The `message` field describes the specific validation failure. Fix the request body; do not blindly retry it.

## Billing for interrupted streams

When `"stream": true`, tokens are produced progressively. If a stream completes, you are billed for the full input and output as reported in the final usage event. If the connection drops or is cancelled mid-stream:

- You are charged for the input tokens of the request.
- You are charged only for the output tokens actually delivered before the interruption.
- No charge is made for undelivered continuation tokens.

Reconnect and resend the request if you need the full answer; consider resuming with the partial answer included in the conversation.

## Troubleshooting checklist

Work through this list in order — it resolves the large majority of failures quickly:

1. **Verify the key.** Run `curl {{base_url}}/v1/models -H "Authorization: Bearer $NEBULA_API_KEY"`. A `401` means a key problem; a `402` means a balance problem.
2. **Check the balance.** Empty balances block every model request with `402` before it reaches the upstream.
3. **Match model to protocol.** Confirm the model id against `GET /v1/models` and send Anthropic models to `/anthropic/v1/messages` and OpenAI-family models to `/v1/chat/completions`.
4. **Check headers and base URLs.** OpenAI uses `Authorization: Bearer` with base `{{base_url}}/v1`; Anthropic uses `x-api-key` plus `anthropic-version: 2023-06-01` with base `{{base_url}}/anthropic`.
5. **Inspect usage and logs.** The dashboard usage page shows recent requests, their status and token consumption, which helps distinguish rejected calls from successful ones.
6. **Add retries for transient failures.** Handle `429` and `503` with exponential backoff, jitter and a maximum attempt count.

If a request still fails after these steps, capture the full status code, response body and request id from the response headers and contact support.
