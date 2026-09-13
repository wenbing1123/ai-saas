/** Model listing under the /anthropic base alias. Same handler as /v1/models. */
import { handleListModels } from '@/lib/server/gateway/handle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  return handleListModels(req);
}
