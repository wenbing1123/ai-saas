import { NextResponse } from 'next/server';
import { AGENT_CATALOG } from '@/lib/mock-data';
import { AgentCreateSchema } from '@/lib/validators';

export async function GET() {
  return NextResponse.json({ data: AGENT_CATALOG });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AgentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true, input: parsed.data } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}