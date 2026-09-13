import { handleMessages } from '@/lib/server/gateway/handle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleMessages(req);
}
