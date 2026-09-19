import { revalidatePath } from 'next/cache';
import { withApi, ok, businessRule } from '@/lib/server/wrappers';
import { upsertCampaign } from '@/lib/server/campaign-service';
import { CampaignType } from '@/lib/db/enums';

/** POST /api/admin/campaigns — create or update (id present) a campaign. */
export const POST = withApi({ role: 'admin', body: 'form' }, async ({ formData }) => {
  const fd = formData!;
  const id = (fd.get('id') as string) || undefined;
  const type = Number(fd.get('type')) as CampaignType;
  const name = (fd.get('name') as string).trim();
  const rewardCents = Math.round(Number(fd.get('rewardCents')) * 100);
  const startsAt = new Date(fd.get('startsAt') as string);
  const endsAtRaw = fd.get('endsAt') as string;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const enabled = fd.get('enabled') === 'on';
  const perUserLimit = Number(fd.get('perUserLimit')) || 1;
  const budgetRaw = fd.get('totalBudgetCents') as string;
  const totalBudgetCents = budgetRaw ? Math.round(Number(budgetRaw) * 100) : null;

  if (!name) throw businessRule('Name is required.');
  if (!(type in CampaignType)) throw businessRule('Invalid campaign type.');
  if (rewardCents < 0) throw businessRule('Reward must be non-negative.');
  if (perUserLimit < 1) throw businessRule('Per-user limit must be at least 1.');
  if (totalBudgetCents != null && totalBudgetCents < 0) {
    throw businessRule('Budget must be non-negative.');
  }
  if (endsAt && endsAt <= startsAt) {
    throw businessRule('End time must be after start time.');
  }

  await upsertCampaign({
    id,
    type,
    name,
    rewardCents,
    startsAt,
    endsAt,
    enabled,
    perUserLimit,
    totalBudgetCents,
  });

  revalidatePath('/admin/campaigns');
  return ok({ id }, '已保存');
});
