---
title: Authentication
category: Getting Started
sort: 20
---

# Authentication

Nebula API authenticates every request with an API key. Keys are created on the [Tokens](/dashboard/tokens) page, always start with `sk-nebula-`, and work against both protocol gateways with the same prepaid balance.

## Creating an API key

1. Sign in to the dashboard and open [Tokens](/dashboard/tokens).
2. Choose **Create token**, give it a recognizable name (for example, `laptop` or `ci-prod`) and confirm.
3. Copy the generated key immediately.

> The full key value is shown **only once**, at creation time. After you leave the page it can never be displayed again. Store it in a password manager, a secret manager, or an environment file that is not committed to version control.

Giving each device or environment its own key makes it easy to revoke one without breaking the others.

## The two authentication schemes

The two protocol gateways expect different headers. Do not mix them — a Bearer token sent to the Anthropic gateway, or an `x-api-key` header sent to the OpenAI gateway, will be rejected.

| Protocol | Base URL | Required headers |
| --- | --- | --- |
| OpenAI | `{{base_url}}/v1` | `Authorization: Bearer sk-nebula-...` |
| Anthropic | `{{base_url}}/anthropic` | `x-api-key: sk-nebula-...` and `anthropic-version: 2023-06-01` |

### OpenAI protocol

Send the key in the standard `Authorization` header as a bearer token:

```bash
curl {{base_url}}/v1/chat/completions \
  -H "Authorization: Bearer sk-nebula-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

When you configure an OpenAI-compatible SDK, the key typically goes into an `apiKey` option — see the [Python](/docs/sdk-python) and [TypeScript](/docs/sdk-typescript) pages.

### Anthropic protocol

Send the key in the `x-api-key` header and always include the API version header:

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

The current supported version is `2023-06-01`. Requests without this header are rejected.

## What unauthenticated requests look like

A request with no key, with an empty key, or with the wrong header for the gateway is rejected before any billing logic runs:

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

The OpenAI gateway ignores an `x-api-key` header, and the Anthropic gateway ignores an `Authorization` header — sending the other protocol's header is treated the same as sending no key at all.

## Using one key across tools

Because every client only needs a base URL and an auth header, a single key can power your whole stack:

- **SDKs** — pass the key through the standard `apiKey` / `api_key` option; see the [Python](/docs/sdk-python), [TypeScript](/docs/sdk-typescript) and [Java](/docs/sdk-java) pages.
- **CLI tools** — export the environment variable the tool reads, such as `ANTHROPIC_AUTH_TOKEN` or `NEBULA_API_KEY`; see the [Claude Code](/docs/claude-code) and [Codex](/docs/codex) guides.
- **Raw HTTP** — set the header explicitly on every request, including `GET` calls such as the model list.

Even though one key works everywhere, give each device or environment its own key so you can revoke them independently.

## Testing a key

Verify that a key works at any time with a `GET` request to the model list. This is a cheap call that does not run a model:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer sk-nebula-..."
```

Interpreting the result:

- **200 OK** — the key is valid and active.
- **401 invalid_api_key** — the key is wrong, has been revoked, or was copied with a leading or trailing space.
- **402 insufficient_balance** — the key is valid but the account balance is empty; top up and retry.

## Revoking and rotating keys

Rotate a key whenever it may have leaked, when an employee leaves, or on a regular security schedule:

1. On [Tokens](/dashboard/tokens) create a new key and deploy it to your application or device.
2. Confirm the new key works (for example with the `GET /v1/models` check above).
3. Revoke the old key on the same page. Revocation takes effect immediately.

A revoked key is rejected with `401 invalid_api_key` on every request. There is no way to un-revoke a key; simply create a new one.

## Balance and the 402 gate

Keys do not have their own credit limit — all keys on an account draw from the same prepaid balance. Before any request is forwarded upstream, Nebula API checks the balance. If it is too low to cover the request, the gateway returns:

```json
{
  "error": {
    "type": "insufficient_balance",
    "code": "402",
    "message": "Your balance is insufficient to complete this request."
  }
}
```

Because the request is stopped **before** the upstream model is called, no tokens are consumed and your balance is not charged. Add credit and retry the exact same request.

## Keeping keys safe

- **Use environment variables.** Load the key from the environment instead of hard-coding it:

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

- **Do not commit secrets to git.** Add `.env` files to `.gitignore` and use a `.env.example` file with placeholder values instead.
- **Do not expose keys in browsers or mobile apps.** Client-side code cannot keep a key secret; call Nebula API from your own backend instead.
- **Watch for whitespace.** Pasted keys sometimes pick up a trailing newline or space, which causes a `401`. If in doubt, print the value length or re-copy it directly.
- **Rotate after a leak.** If a key appears in logs, screenshots, a ticket or a public repository, revoke it immediately and create a replacement.

## Troubleshooting checklist

1. Run the `GET /v1/models` curl check above to isolate the problem from your application code.
2. Confirm you are sending the right header for the protocol: `Authorization` for `/v1`, `x-api-key` plus `anthropic-version` for `/anthropic`.
3. Check for extra spaces or quotes around the key value.
4. Open the dashboard and confirm the key has not been revoked and the balance is not empty.
5. If requests still fail, see the [Errors](/docs/errors) page for status-code-specific guidance.
