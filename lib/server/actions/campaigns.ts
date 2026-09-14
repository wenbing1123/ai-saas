'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/server/auth';
import { upsertCampaign } from '@/lib/server/campaign-service';
import { CampaignType } from '@/lib/db/enums';

export async function saveCampaignAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = (formData.get('id') as string) || undefined;
  const type = Number(formData.get('type')) as CampaignType;
  const name = (formData.get('name') as string).trim();
  const rewardCents = Math.round(Number(formData.get('rewardCents')) * 100);
  const startsAt = new Date(formData.get('startsAt') as string);
  const endsAtRaw = formData.get('endsAt') as string;
  const endsAt = endsAtRaw ? new Date(endsAtRaw) : null;
  const enabled = formData.get('enabled') === 'on';
  const perUserLimit = Number(formData.get('perUserLimit')) || 1;
  const budgetRaw = formData.get('totalBudgetCents') as string;
  const totalBudgetCents = budgetRaw ? Math.round(Number(budgetRaw) * 100) : null;

  if (!name) throw new Error('Name is required.');
  if (!(type in CampaignType)) throw new Error('Invalid campaign type.');
  if (rewardCents < 0) throw new Error('Reward must be non-negative.');
  if (perUserLimit < 1) throw new Error('Per-user limit must be at least 1.');
  if (totalBudgetCents != null && totalBudgetCents < 0) {
    throw new Error('Budget must be non-negative.');
  }
  if (endsAt && endsAt <= startsAt) {
    throw new Error('End time must be after start time.');
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
  redirect('/admin/campaigns');
}
