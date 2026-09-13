---
title: OpenAI Codex CLI
category: Clients
sort: 50
---

# OpenAI Codex CLI with Nebula API

The OpenAI Codex CLI is a terminal-based coding agent. It supports custom model providers, which means you can route all of its requests to Nebula API and pay per token from your prepaid balance instead of using an OpenAI subscription.

## Prerequisites

- A Nebula API account with a positive prepaid balance.
- An API key from the [Tokens](/dashboard/tokens) page (`sk-nebula-...`).
- Node.js 22 or newer (run `node --version`; upgrade an older Node.js with nvm or your system package manager).

## 1. Install the Codex CLI

```bash
npm i -g @openai/codex
```

Verify the installation:

```bash
codex --version
```

## 2. Configure the Nebula provider

The CLI reads its configuration from `~/.codex/config.toml` (on Windows, `%USERPROFILE%\.codex\config.toml`). Create the `.codex` directory and the file if they do not exist.

Declare Nebula as the active provider with `model_provider = "nebula"`, then define that provider in a `[model_providers.nebula]` section:

- `name` is a display name for the provider.
- `base_url` is the OpenAI-compatible gateway, ending in `/v1`.
- `wire_api = "chat"` selects the Chat Completions wire format.
- `env_key` names the environment variable that holds your API key.

A complete, ready-to-use configuration:

```toml
# ~/.codex/config.toml

# Set the model you want to use by default. Any model id returned
# by GET {{base_url}}/v1/models that speaks the OpenAI protocol works here.
model = "gpt-4.1"
model_provider = "nebula"

[model_providers.nebula]
name = "Nebula API"
base_url = "{{base_url}}/v1"
wire_api = "chat"
env_key = "NEBULA_API_KEY"
```

> Do not add `/chat/completions` to `base_url`. The CLI appends that path itself. The correct value ends exactly with `/v1`.

## 3. Provide the API key

The CLI reads the key from the environment variable named by `env_key` — in this example `NEBULA_API_KEY`.

### bash and zsh (Linux, macOS)

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

Add the same line to `~/.bashrc` or `~/.zshrc` to persist it, then open a new terminal.

### Windows PowerShell

For the current session:

```powershell
$env:NEBULA_API_KEY = "sk-nebula-..."
```

To persist it for your user account:

```powershell
[Environment]::SetEnvironmentVariable("NEBULA_API_KEY", "sk-nebula-...", "User")
```

Open a new terminal after setting a persistent variable.

## 4. Run Codex

From inside a project directory:

```bash
cd your-project
codex
```

Type a task at the prompt, for example "add unit tests for the pricing module". The CLI sends the request to `{{base_url}}/v1/chat/completions` with the bearer token from `NEBULA_API_KEY`, and token usage is deducted from your Nebula balance.

You can also run a single instruction non-interactively:

```bash
codex "explain the layout of this repository"
```

## Switching models

Change the top-level `model` value in `config.toml` to any OpenAI-protocol model id from your account:

```toml
model = "deepseek-chat"
model_provider = "nebula"
```

The exact list of valid ids depends on what is enabled on your account. Fetch the current catalog at any time:

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

## Updating the Codex CLI

Upgrade with the same global install command:

```bash
npm i -g @openai/codex@latest
```

Open a new terminal and run `codex --version` to confirm. The provider configuration in `~/.codex/config.toml` is preserved across upgrades, and the `NEBULA_API_KEY` environment variable is untouched.

## Troubleshooting

### 401 invalid_api_key

The key could not be authenticated. Check that `NEBULA_API_KEY` is set in the same shell that runs `codex`, that the value has no extra quotes or trailing spaces, and that the key has not been revoked on the [Tokens](/dashboard/tokens) page.

### 404 or "model not found"

Either the `model` id is misspelled or it is an Anthropic-protocol model. The Codex provider uses the OpenAI gateway, so only OpenAI-protocol model ids are valid here. Confirm the id against `GET /v1/models`.

### 402 insufficient_balance

Your prepaid balance is empty. Top up in the dashboard and retry — the failed request was stopped before reaching the upstream model and was not charged.

### Requests still go to the OpenAI default endpoint

Double-check that `model_provider = "nebula"` is set at the top level of `config.toml` (outside any section), and that the `[model_providers.nebula]` table name matches exactly. Restart the CLI after editing the file.

### Proxy or network errors

On a restricted corporate network, export your proxy settings so the CLI can reach the gateway:

```bash
export HTTPS_PROXY="http://your-provider-host:port"
```

See the [Errors](/docs/errors) page for the full list of status codes and retry behavior.
