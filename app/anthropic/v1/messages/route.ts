/**
 * Path alias for Anthropic-native clients:
 *   ANTHROPIC_BASE_URL = https://<host>/anthropic
 * The official SDK / Claude Code then calls POST /anthropic/v1/messages,
 * which is the same handler as the root /v1/messages route.
 */
import { handleMessages } from '@/lib/server/gateway/handle';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  return handleMessages(req);
}
