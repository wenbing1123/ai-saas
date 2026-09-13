import { handleListModels } from '@/lib/server/gateway/handle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  return handleListModels(req);
}
