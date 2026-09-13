---
title: Claude Code
category: Clients
sort: 40
---

# Claude Code with Nebula API

Claude Code is Anthropic's official command-line coding agent. It is protocol-compatible with the Anthropic Messages API, so you can point it at Nebula API by changing two environment variables. Your prepaid Nebula balance is then billed per token — no separate Anthropic subscription is required.

## Prerequisites

- A Nebula API account with a positive prepaid balance.
- An API key from the [Tokens](/dashboard/tokens) page (`sk-nebula-...`).
- Node.js 18 or newer available on your machine (`node --version` to check).

## 1. Install Claude Code

Install the CLI globally with npm:

```bash
npm i -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

## 2. Configure the endpoint and key

Claude Code reads two environment variables:

- `ANTHROPIC_BASE_URL` must be the Nebula Anthropic gateway, **including** the `/anthropic` path: `{{base_url}}/anthropic`.
- `ANTHROPIC_AUTH_TOKEN` must be your Nebula API key.

### bash and zsh (Linux, macOS)

Export the variables in your terminal for a quick test:

```bash
export ANTHROPIC_BASE_URL="{{base_url}}/anthropic"
export ANTHROPIC_AUTH_TOKEN="sk-nebula-..."
```

To make them permanent, append the same two lines to `~/.bashrc` or `~/.zshrc`, then run `source ~/.bashrc` (or restart your terminal).

### Windows PowerShell

Set them for the current PowerShell session:

```powershell
$env:ANTHROPIC_BASE_URL = "{{base_url}}/anthropic"
$env:ANTHROPIC_AUTH_TOKEN = "sk-nebula-..."
```

To make them permanent, either add them under **Environment Variables** in Windows System Settings, or add them to your PowerShell profile:

```powershell
[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "{{base_url}}/anthropic", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "sk-nebula-...", "User")
```

After setting persistent variables, open a new terminal so they take effect.

## 3. Run Claude Code

From any project directory:

```bash
cd your-project
claude
```

The first launch may ask you to confirm the theme and trust the working directory. After that, every prompt is sent to the Claude model through Nebula API and billed from your prepaid balance.

## 4. Check `/status`

Inside a Claude Code session, run:

```text
/status
```

Confirm that:

- The API connection shows as connected (no authentication error).
- The configured base URL is `{{base_url}}/anthropic`.
- A Claude model is selected.

You can also watch token usage accumulate per request on the dashboard **Usage** page.

## Updating Claude Code

Upgrade the global installation the same way you installed it:

```bash
npm i -g @anthropic-ai/claude-code@latest
```

Then confirm the new version:

```bash
claude --version
```

If the shell still resolves an old binary, your global npm bin directory may be shadowed on `PATH`. Print its location with `npm bin -g` (or `npm prefix -g`) and make sure that directory appears before any other Node installation. Your `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN` environment variables are unaffected by upgrades.

## Common pitfalls

### 401 authentication errors

A `401` or an "invalid x-api-key" message almost always means one of:

- The token is wrong or was pasted with surrounding quotes or spaces.
- The key was revoked on the [Tokens](/dashboard/tokens) page.
- The variable was exported in a different terminal or shell profile than the one running `claude`.

Print the values to double-check them:

```bash
echo "$ANTHROPIC_BASE_URL"
echo "$ANTHROPIC_AUTH_TOKEN"
```

### Wrong base URL shape

This is the most frequent configuration mistake. The value must be exactly:

```text
{{base_url}}/anthropic
```

Do **not** append `/v1` — Claude Code adds `/v1/messages` itself, so `{{base_url}}/anthropic/v1` produces an invalid path. Do **not** add a trailing slash either; `{{base_url}}/anthropic/` can break path joining in some versions.

| Wrong value | Right value |
| --- | --- |
| `{{base_url}}` | `{{base_url}}/anthropic` |
| `{{base_url}}/anthropic/v1` | `{{base_url}}/anthropic` |
| `{{base_url}}/anthropic/` | `{{base_url}}/anthropic` |
| `{{base_url}}/v1` | `{{base_url}}/anthropic` |

### Corporate proxies and TLS interception

On company networks, an intercepting proxy may replace the TLS certificate and cause certificate or connection errors. Options:

- Configure the proxy correctly (`HTTPS_PROXY` / `HTTP_PROXY` environment variables) so the CLI trusts it.
- Run from a network without TLS interception.
- Ask your network team to allowlist the `{{base_url}}` host.

Disabling certificate verification is not recommended, even temporarily, because it exposes your API key.

### 402 insufficient balance

If requests suddenly stop with `402`, your prepaid balance is empty. Top up in the dashboard and retry — blocked requests are never charged.

## Uninstalling or switching back

To stop using Nebula API, remove the two environment variables from your shell profile (or delete them from the Windows user environment) and restart the terminal. Claude Code then reverts to its default endpoint.
