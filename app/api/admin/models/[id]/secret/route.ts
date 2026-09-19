import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { withApi, ok, unauthorized, notFound, businessRule } from '@/lib/server/wrappers';
import { verifyPassword } from '@/lib/server/crypto';
import { getDb } from '@/lib/db/client';
import { users, models } from '@/lib/db/schema';

const revealSchema = z.object({
  password: z.string().min(1, 'Password is required').max(200),
});

/**
 * POST /api/admin/models/:id/secret — reveal the per-model upstream API key.
 * Requires the current admin to re-enter their login password (step-up auth);
 * keys are stored encrypted and are never echoed in list/detail endpoints.
 */
export const POST = withApi(
  { role: 'admin', schema: revealSchema },
  async ({ input, params, user }) => {
    if (!user) throw unauthorized();
    const { password } = input as z.infer<typeof revealSchema>;

    const db = getDb();
    const rows = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, user.id), eq(users.deleted, 0)))
      .limit(1);
    if (!rows[0] || !verifyPassword(password, rows[0].passwordHash)) {
      throw unauthorized('密码不正确');
    }

    const rowsModel = await db
      .select({ upstreamApiKey: models.upstreamApiKey })
      .from(models)
      .where(and(eq(models.id, params.id), eq(models.deleted, 0)))
      .limit(1);
    if (!rowsModel[0]) throw notFound('Model not found.');
    if (!rowsModel[0].upstreamApiKey) throw businessRule('该模型未配置上游密钥');

    return ok({ secret: rowsModel[0].upstreamApiKey });
  },
);
