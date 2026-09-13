---
title: TypeScript SDK
category: SDK
sort: 70
---

# TypeScript SDK

Nebula API 无需任何改造即可与官方 `openai` 和 `@anthropic-ai/sdk` 包配合使用。你只需覆盖 base URL 并提供 `sk-nebula-...` key。以下示例使用 TypeScript 与 async/await，同时也可作为现代 JavaScript（ESM）直接运行。

## 安装

需要 Node.js 18 或更高版本。

```bash
npm i openai @anthropic-ai/sdk
```

请从环境变量读取 key，避免其被提交到 git：

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

## OpenAI 协议

创建客户端时把 `baseURL` 设为 `{{base_url}}/v1`：

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '{{base_url}}/v1',
  apiKey: process.env.NEBULA_API_KEY,
});

async function main(): Promise<void> {
  const response = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: 'Give me one practical tip for visiting Mumbai.' },
    ],
    temperature: 0.7,
  });

  console.log(response.choices[0]?.message.content ?? '');
  console.log('tokens used:', response.usage?.total_tokens);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

修改 `model` 的值即可调用账户下任意走 OpenAI 协议的模型，例如 `'deepseek-chat'`。

### 使用 OpenAI SDK 进行流式调用

设置 `stream: true`，并用 `for await` 消费异步迭代器：

```typescript
async function streamDemo(): Promise<void> {
  const stream = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    stream: true,
    messages: [
      { role: 'user', content: 'Count from 1 to 5, one number per line.' },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta.content;
    if (delta) {
      process.stdout.write(delta);
    }
  }
  process.stdout.write('\n');
}

streamDemo();
```

## Anthropic 协议

创建 Anthropic 客户端时把 `baseURL` 设为 `{{base_url}}/anthropic`（必须带 `/anthropic` 前缀，不要加 `/v1`）。`max_tokens` 参数为必填：

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  baseURL: '{{base_url}}/anthropic',
  apiKey: process.env.NEBULA_API_KEY,
});

async function claudeDemo(): Promise<void> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: 'You are a concise assistant.',
    messages: [
      { role: 'user', content: 'Give me one practical tip for visiting Mumbai.' },
    ],
  });

  for (const block of message.content) {
    if (block.type === 'text') {
      console.log(block.text);
    }
  }
  console.log('input tokens:', message.usage.input_tokens);
  console.log('output tokens:', message.usage.output_tokens);
}

claudeDemo();
```

### 使用 Anthropic SDK 进行流式调用

使用 `.stream()`，并通过 `for await...of` 迭代 `textStream`：

```typescript
async function claudeStreamDemo(): Promise<void> {
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Count from 1 to 5, one number per line.' },
    ],
  });

  for await (const text of stream.textStream) {
    process.stdout.write(text);
  }
  process.stdout.write('\n');
}

claudeStreamDemo();
```

SDK 会把 `content_block_delta` SSE 事件转换为纯文本增量。

## 每种协议一个客户端

在一个应用中同时支持两个网关的典型写法：

```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.NEBULA_API_KEY;

const openai = new OpenAI({
  baseURL: '{{base_url}}/v1',
  apiKey,
});

const anthropic = new Anthropic({
  baseURL: '{{base_url}}/anthropic',
  apiKey,
});

async function chat(protocol: 'openai' | 'anthropic', model: string, prompt: string): Promise<string> {
  if (protocol === 'openai') {
    const resp = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    return resp.choices[0]?.message.content ?? '';
  }

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

chat('openai', 'deepseek-chat', 'Hello!').then(console.log);
```

## 错误处理

两个 SDK 抛出的错误都带有 HTTP 状态码，可以据此分支处理：

```typescript
try {
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: 'Hi' }],
  });
  console.log(response.choices[0]?.message.content);
} catch (err) {
  const status = (err as { status?: number }).status;
  if (status === 401) {
    console.error('Invalid or revoked API key.');
  } else if (status === 402) {
    console.error('Insufficient balance — top up and retry.');
  } else if (status === 429) {
    console.error('Rate limited — use exponential backoff.');
  } else {
    console.error('Request failed:', err);
  }
}
```

- 对 `429` 和 `503` 错误加重试封装，采用带抖动的指数退避。
- 如果服务端返回 `Retry-After` 头，重试前至少等待该秒数。
- 绝不要在浏览器 bundle 或客户端代码中暴露 key；这些 SDK 只能在服务端运行。

完整状态码表与重试指引见 [错误处理](/docs/errors) 页面。
