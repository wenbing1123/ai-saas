import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    data: {
      user: {
        id: 'demo-user',
        name: 'Scott Agent',
        email: 'scott@nebula.ai',
        role: 'admin',
      },
      workspace: {
        id: 'demo-ws',
        name: 'Scott Workspace',
        plan: 'team',
      },
    },
  });
}

export async function POST() {
  return NextResponse.json({ ok: true });
}