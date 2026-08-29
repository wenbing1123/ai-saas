import { NextResponse } from 'next/server';
import { DEMO_KNOWLEDGE_BASES } from '@/lib/mock-data';
import { KnowledgeCreateSchema } from '@/lib/validators';

export async function GET() {
  return NextResponse.json({ data: DEMO_KNOWLEDGE_BASES });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = KnowledgeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true, input: parsed.data } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}