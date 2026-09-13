---
title: 模型列表
category: 参考
sort: 100
---

# 模型列表

Nebula API 用一个 key 和一个预付余额，为每个账户提供来自多家供应商的精选 chat 模型目录——包括 DeepSeek、OpenAI GPT、Anthropic Claude 与 Google Gemini 系列。本页说明目录的组织方式，以及如何通过接口随时获取最新列表。

## 模型如何分组

每个模型只属于一种**协议（protocol）**，协议决定了你必须使用的端点、请求头与请求结构：

- **OpenAI 协议**——调用 `POST {{base_url}}/v1/chat/completions`，使用 `Authorization: Bearer sk-nebula-...`。OpenAI、DeepSeek 等大多数模型系列，以及 Codex CLI 和通用 OpenAI 兼容工具都走该协议。
- **Anthropic 协议**——调用 `POST {{base_url}}/anthropic/v1/messages`，使用 `x-api-key` 与 `anthropic-version: 2023-06-01`。Claude 模型、Anthropic SDK 与 Claude Code 走该协议。

model id 只在其所属协议下有效。发到另一个网关会返回 `400` 或 `404` 错误——见 [错误处理](/docs/errors)。

## 能力说明

目录会标注每个模型支持的额外能力：

- **Vision**——模型可在文本之外接受图片输入（多模态消息）。适用于截图、照片、扫描文档与图表。
- **Tools**——模型支持 tool / function calling：它可以请求你的应用执行某个函数，再把结果带回对话。
- **Reasoning**——模型在回答前会进行扩展的链式思考推理，在困难的分析或编码任务上效果更好，但每个 token 的耗时可能更长。

如果某个模型未列出某项能力，就不要发送对应的参数，否则请求可能被拒绝。

## 上下文窗口与最大输出

两个数值决定了请求的大小：

- **上下文窗口（context window）**——模型在单次请求中能够处理的 token 总数，包括 system prompt、对话历史、工具结果与你的新消息。
- **最大输出（maximum output）**——模型在一次响应中最多生成的 token 数。在 Anthropic 协议中通过 `max_tokens` 参数传入；OpenAI 协议也有等效的输出上限。

较长的对话应当做摘要、裁剪或分块，以保持在上下文窗口之内。超出限制的输入会根据模型不同而被拒绝或截断。

## 缓存 token 折扣

目录中的部分模型支持 **prompt caching（提示缓存）**：当同一段前缀（例如很长的 system prompt 或一组参考文档）被重复发送时，输入中被缓存的部分将按折扣后的缓存费率计费，而不是全价输入费率。当供应商标记重复的前缀 token 为缓存命中时，缓存会自动生效——无需调用单独的 API 开启。构造请求时，请把稳定、相同的前缀放在前面、把变化的部分放在最后，以提高缓存命中率、降低成本。

## 计费如何计算

每笔账单包含三类 token：

- **输入 token（input tokens）**——发送给模型的全部内容：system prompt、对话历史、工具结果与图片（vision 模型会把图片折算为 token 块）。
- **输出 token（output tokens）**——模型生成的全部内容。输出 token 的单价通常高于输入 token。
- **缓存输入 token（cached input tokens）**——命中 prompt cache 的重复前缀 token，按折扣后的缓存费率而非标准输入费率计费。

每个非流式响应的 `usage` 对象——以及每条流的最终事件——都会报告这些数量。可与控制台用量页面核对，按环境监控支出。

## 如何阅读目录表

下方每一行显示你在 `model` 字段中传入的 model id、所属协议、上下文窗口、最大输出、支持的能力以及每 token 价格。选择时请从自己的约束出发：在满足任务质量门槛的前提下，选择最便宜、上下文窗口最小的模型，把旗舰模型留给真正需要的步骤。

## 成本控制建议

- 复用稳定、相同的前缀，让 prompt cache 有机会命中。
- 对较早的对话历史做摘要或裁剪，而不是全部重发。
- 设置 `max_tokens`（Anthropic）或等效的输出上限（OpenAI），限制失控生成。
- 路由、分类、草稿等任务使用中档模型；只在最后的困难步骤调用旗舰模型。
- 为每个环境签发独立 key，并在控制台用量页面分别观察。

## 实时模型表

下方是你所在区域的当前目录。价格、上下文窗口与能力会自动保持更新；如果本页与 `GET /v1/models` 端点的信息不一致，以接口返回为准。

{{models_table}}

> 上表根据实时数据渲染。如果你正在阅读本页的缓存或导出版本，请运行下一节中的接口调用，获取最新目录。

## 通过接口获取列表

权威的实时列表始终可以从网关获取。它会返回你账户已启用的模型，包括新发布的版本：

```bash
curl {{base_url}}/v1/models \
  -H "Authorization: Bearer $NEBULA_API_KEY"
```

响应示例（节选）：

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

同样的端点也可以用 Python 标准库访问，无需额外依赖即可验证 key 并查看目录：

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

也可以使用 OpenAI SDK，它会把响应解析成对象：

```python
from openai import OpenAI

client = OpenAI(
    base_url="{{base_url}}/v1",
    api_key=os.environ["NEBULA_API_KEY"],
)

for model in client.models.list().data:
    print(model.id)
```

## 选择与固定模型

- 日常对话和高并发任务，建议从中档均衡模型起步，只有质量不够时再升级。
- 复杂的编码或推理任务，选择带 **reasoning** 能力的模型。
- 处理截图和文档，选择带 **vision** 能力的模型。
- 在生产代码中，固定使用你测试通过的那个带日期或版本号的精确 model id。需要升级时，先从 `GET /v1/models` 获取最新 id，测试通过后再有意切换。

## 版本策略

模型版本会随时间更新：供应商会发布新的快照版本，旧快照可能被弃用。上方实时表与 `GET /v1/models` 端点始终反映当前实际提供的模型，并在可行时标注弃用状态。下线前我们会尽可能提前公告，但集成代码应当能够容忍某个模型消失，并准备好回退到列表中的另一个 id。
