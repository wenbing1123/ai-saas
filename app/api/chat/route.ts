import { NextRequest, NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/lib/validators';
import { chatService } from '@/lib/services/chat';
import { AGENT_CATALOG } from '@/lib/mock-data';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', issues: parsed.error.flatten() }, { status: 400 });
    }

    const { agentId, messages, stream } = parsed.data;
    const agent = AGENT_CATALOG.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of chatService.stream(agent, messages)) {
              const payload = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(payload));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`));
          }
          controller.close();
        },
      });

      return new NextResponse(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const result = await chatService.chat(agent, messages);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}