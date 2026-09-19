import { revalidatePath } from 'next/cache';
import { withApi, ok } from '@/lib/server/wrappers';
import { destroySession } from '@/lib/server/auth';

export const POST = withApi({ role: 'user' }, async () => {
  await destroySession();
  revalidatePath('/');
  return ok({ redirect: '/login' });
});
