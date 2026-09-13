---
title: TypeScript SDK
category: SDKs
sort: 70
---

# TypeScript SDK

Nebula API works with the official `openai` and `@anthropic-ai/sdk` packages without modification. You only override the base URL and supply your `sk-nebula-...` key. These examples use TypeScript with async/await and also run unchanged as modern JavaScript (ESM).

## Install

Node.js 18 or newer is required.

```bash
npm i openai @anthropic-ai/sdk
```

Load your key from the environment so it never gets committed to git:

```bash
export NEBULA_API_KEY="sk-nebula-..."
```

## OpenAI protocol

Create the client with `baseURL` set to `{{base_url}}/v1`:

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

Change the `model` value to call any OpenAI-protocol model on your account — for example `'deepseek-chat'`.

### Streaming with the OpenAI SDK

Set `stream: true` and consume the async iterator with `for await`:

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

## Anthropic protocol

Create the Anthropic client with `baseURL` set to `{{base_url}}/anthropic` (the `/anthropic` prefix is required; do not add `/v1`). The `max_tokens` parameter is mandatory:

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

### Streaming with the Anthropic SDK

Use `.stream()` and iterate the `textStream` with `for await...of`:

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

The SDK converts the `content_block_delta` SSE events into plain text chunks.

## One client per protocol

A typical setup that supports both gateways in one application:

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

## Handling errors

Both SDKs surface the HTTP status code on errors, so you can branch on it:

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

- Add a retry wrapper around `429` and `503` errors with exponential backoff and jitter.
- If the server sends a `Retry-After` header, wait at least that many seconds before retrying.
- Never expose the key in browser bundles or client-side code; run these SDKs on a server only.

See the [Errors](/docs/errors) page for the full status code table and retry guidance.
