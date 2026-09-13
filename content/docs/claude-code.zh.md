---
title: Claude Code
category: 客户端
sort: 40
---

# 使用 Claude Code 接入 Nebula API

Claude Code 是 Anthropic 官方的命令行编码助手。它使用与 Anthropic Messages API 兼容的协议，因此只需修改两个环境变量，就能把它指向 Nebula API。之后所有请求按 token 从你的 Nebula 预付余额扣费——无需单独订阅 Anthropic 服务。

## 准备工作

- 一个已充值、余额为正的 Nebula API 账户。
- 一个在 [Tokens](/dashboard/tokens) 页面创建的 API key（`sk-nebula-...`）。
- 本机已安装 Node.js 18 或更高版本（可用 `node --version` 检查）。

## 1. 安装 Claude Code

使用 npm 全局安装 CLI：

```bash
npm i -g @anthropic-ai/claude-code
```

验证安装：

```bash
claude --version
```

## 2. 配置端点与 key

Claude Code 会读取两个环境变量：

- `ANTHROPIC_BASE_URL` 必须是 Nebula 的 Anthropic 网关，**包含** `/anthropic` 路径：`{{base_url}}/anthropic`。
- `ANTHROPIC_AUTH_TOKEN` 必须是你的 Nebula API key。

### bash 与 zsh（Linux、macOS）

在终端中临时导出变量以便快速测试：

```bash
export ANTHROPIC_BASE_URL="{{base_url}}/anthropic"
export ANTHROPIC_AUTH_TOKEN="sk-nebula-..."
```

要永久生效，把同样两行追加到 `~/.bashrc` 或 `~/.zshrc`，然后执行 `source ~/.bashrc`（或重启终端）。

### Windows PowerShell

在当前 PowerShell 会话中设置：

```powershell
$env:ANTHROPIC_BASE_URL = "{{base_url}}/anthropic"
$env:ANTHROPIC_AUTH_TOKEN = "sk-nebula-..."
```

要永久生效，可以在 Windows 系统设置的 **环境变量** 中添加，或写入 PowerShell 配置文件：

```powershell
[Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL", "{{base_url}}/anthropic", "User")
[Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "sk-nebula-...", "User")
```

设置持久变量后，请打开一个新终端使其生效。

## 3. 运行 Claude Code

在任意项目目录下：

```bash
cd your-project
claude
```

首次启动可能会要求你确认主题并信任当前工作目录。之后，你的每条 prompt 都会通过 Nebula API 发送给 Claude 模型，并从预付余额扣费。

## 4. 使用 `/status` 检查

在 Claude Code 会话中运行：

```text
/status
```

确认以下几点：

- API 连接显示为已连接（没有鉴权错误）。
- 配置的 base URL 为 `{{base_url}}/anthropic`。
- 已选择一个 Claude 模型。

你也可以在控制台的 **Usage（用量）** 页面看到每次请求累积的 token 消耗。

## 更新 Claude Code

用与安装时相同的方式升级全局安装：

```bash
npm i -g @anthropic-ai/claude-code@latest
```

然后确认新版本：

```bash
claude --version
```

如果 shell 仍然解析到旧的可执行文件，可能是全局 npm bin 目录在 `PATH` 中被其他 Node 安装遮蔽。用 `npm bin -g`（或 `npm prefix -g`）查看其位置，并确保该目录排在其他 Node 安装之前。升级不会影响你的 `ANTHROPIC_BASE_URL` 与 `ANTHROPIC_AUTH_TOKEN` 环境变量。

## 常见坑

### 401 鉴权错误

出现 `401` 或 "invalid x-api-key" 提示，几乎总是以下原因之一：

- token 错误，或粘贴时带上了引号、空格。
- key 已在 [Tokens](/dashboard/tokens) 页面被吊销。
- 变量是在另一个终端或另一个 shell 配置里导出的，不是运行 `claude` 的那个。

可以打印变量值进行核对：

```bash
echo "$ANTHROPIC_BASE_URL"
echo "$ANTHROPIC_AUTH_TOKEN"
```

### base URL 格式错误

这是最常见的配置错误。值必须严格为：

```text
{{base_url}}/anthropic
```

**不要**追加 `/v1`——Claude Code 会自行拼接 `/v1/messages`，写成 `{{base_url}}/anthropic/v1` 会得到无效路径。也**不要**带结尾斜杠；某些版本中 `{{base_url}}/anthropic/` 会破坏路径拼接。

| 错误写法 | 正确写法 |
| --- | --- |
| `{{base_url}}` | `{{base_url}}/anthropic` |
| `{{base_url}}/anthropic/v1` | `{{base_url}}/anthropic` |
| `{{base_url}}/anthropic/` | `{{base_url}}/anthropic` |
| `{{base_url}}/v1` | `{{base_url}}/anthropic` |

### 公司代理与 TLS 拦截

在公司网络中，拦截式代理可能替换 TLS 证书，导致证书错误或连接错误。可选方案：

- 正确配置代理（`HTTPS_PROXY` / `HTTP_PROXY` 环境变量），让 CLI 信任该代理。
- 在没有 TLS 拦截的网络下运行。
- 请网络团队将 `{{base_url}}` 主机加入白名单。

不建议关闭证书校验（即使是临时的），因为这会暴露你的 API key。

### 402 余额不足

如果请求突然开始返回 `402`，说明预付余额已用完。在控制台充值后重试即可——被拦截的请求不会扣费。

## 卸载或切回默认端点

要停止使用 Nebula API，从 shell 配置文件中删除这两个环境变量（或在 Windows 用户环境变量中删除），然后重启终端。Claude Code 即恢复使用默认端点。
