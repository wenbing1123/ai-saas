---
title: OpenAI Codex CLI
category: 客户端
sort: 50
---

# 使用 OpenAI Codex CLI 接入 Nebula API

OpenAI Codex CLI 是一个运行在终端中的编码助手。它支持自定义模型供应商（model provider），因此你可以把它的所有请求路由到 Nebula API，按 token 从预付余额扣费，而无需使用 OpenAI 订阅。

## 准备工作

- 一个已充值、余额为正的 Nebula API 账户。
- 一个在 [Tokens](/dashboard/tokens) 页面创建的 API key（`sk-nebula-...`）。
- Node.js 22 或更高版本（运行 `node --version` 检查；版本过低请用 nvm 或系统包管理器升级）。

## 1. 安装 Codex CLI

```bash
npm i -g @openai/codex
```

验证安装：

```bash
codex --version
```

## 2. 配置 Nebula 供应商

CLI 从 `~/.codex/config.toml` 读取配置（Windows 下为 `%USERPROFILE%\.codex\config.toml`）。如果 `.codex` 目录或配置文件不存在，请自行创建。

通过 `model_provider = "nebula"` 将 Nebula 声明为当前供应商，然后在 `[model_providers.nebula]` 段中定义该供应商：

- `name` 是供应商的显示名称。
- `base_url` 是 OpenAI 兼容网关，以 `/v1` 结尾。
- `wire_api = "chat"` 表示使用 Chat Completions 通信格式。
- `env_key` 指定保存 API key 的环境变量名。

一份完整、可直接使用的配置：

```toml
# ~/.codex/config.toml

# 设置默认使用的模型。任何由 GET {{base_url}}/v1/models 返回、
# 且走 OpenAI 协议的 model id 都可以填在这里。
model = "gpt-4.1"
model_provider = "nebula"

[model_providers.nebula]
name = "Nebula API"
base_url = "{{base_url}}/v1"
wire_api = "chat"
env_key = "NEBULA_API_KEY"
```

> 不要在 `base_url` 后面加 `/chat/completions`，该路径由 CLI 自行拼接。正确的值恰好以 `/v1` 结尾。

## 3. 提供 API key

CLI 会从 `env_key` 指定的环境变量（本例中为 `NEBULA_API_KEY`）读取 key。

### bash 与 zsh（Linux、macOS）

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

如需持久化，把同一行加入 `~/.bashrc` 或 `~/.zshrc`，然后打开新终端。

### Windows PowerShell

当前会话临时设置：

```powershell
$env:NEBULA_API_KEY = "sk-nebula-..."
```

为当前用户持久设置：

```powershell
[Environment]::SetEnvironmentVariable("NEBULA_API_KEY", "sk-nebula-...", "User")
```

设置持久变量后请打开新终端。

## 4. 运行 Codex

在项目目录下：

```bash
cd your-project
codex
```

在提示中输入任务，例如 "add unit tests for the pricing module"。CLI 会使用 `NEBULA_API_KEY` 中的 bearer token，把请求发送到 `{{base_url}}/v1/chat/completions`，token 消耗从你的 Nebula 余额中扣除。

也可以非交互式地执行单条指令：

```bash
codex "explain the layout of this repository"
```

## 切换模型

把 `config.toml` 顶层的 `model` 值改成你账户下任意走 OpenAI 协议的 model id：

```toml
model = "deepseek-chat"
model_provider = "nebula"
```

有效 id 的确切列表取决于你账户启用了哪些模型。随时可以拉取最新目录：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

## 更新 Codex CLI

用相同的全局安装命令升级：

```bash
npm i -g @openai/codex@latest
```

打开新终端并运行 `codex --version` 确认。升级会保留 `~/.codex/config.toml` 中的供应商配置，也不会改动 `NEBULA_API_KEY` 环境变量。

## 故障排查

### 401 invalid_api_key

key 无法通过鉴权。请检查运行 `codex` 的同一个 shell 中是否设置了 `NEBULA_API_KEY`、值是否带有多余引号或结尾空格，以及 key 是否已在 [Tokens](/dashboard/tokens) 页面被吊销。

### 404 或 "model not found"

要么 `model` id 拼写错误，要么它是一个走 Anthropic 协议的模型。Codex 供应商使用 OpenAI 网关，因此这里只能填 OpenAI 协议的 model id。请以 `GET /v1/models` 的返回为准核对。

### 402 insufficient_balance

预付余额已用完。在控制台充值后重试即可——失败的请求在到达上游之前就被拦截，不会扣费。

### 请求仍然发到 OpenAI 默认端点

检查 `model_provider = "nebula"` 是否位于 `config.toml` 顶层（任何 section 之外），以及 `[model_providers.nebula]` 表名是否完全一致。修改文件后重启 CLI。

### 代理或网络错误

在受限的公司网络中，导出代理设置以便 CLI 访问网关：

```bash
export HTTPS_PROXY="http://your-provider-host:port"
```

完整状态码与重试行为见 [错误处理](/docs/errors) 页面。
