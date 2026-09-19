'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormError, FormSuccess } from '@/components/ui/form';
import { apiPostForm } from '@/lib/client/api';
import { CampaignType } from '@/lib/db/enums';

export type CampaignDefaults = {
  id?: string;
  type: number;
  name: string;
  /** Reward amount in dollars, formatted for a numeric input. */
  rewardInput: string;
  perUserLimit: number;
  startsAtInput: string;
  endsAtInput: string;
  totalBudgetInput: string;
  enabled: boolean;
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CampaignForm({ defaults }: { defaults: CampaignDefaults }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const editing = Boolean(defaults.id);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await apiPostForm('/api/admin/campaigns', new FormData(e.currentTarget));
      if (res.code === '0000') {
        setSuccess(true);
        router.push('/admin/campaigns');
        router.refresh();
      } else {
        setError(res.msg);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={defaults.id ?? ''} />

      <div className="space-y-1.5">
        <Label htmlFor="type">活动类型</Label>
        <select
          id="type"
          name="type"
          className="h-9 rounded-md border px-3"
          defaultValue={defaults.type}
        >
          <option value={CampaignType.Register}>注册奖励</option>
          <option value={CampaignType.Invite}>邀请奖励</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">活动名称</Label>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="如新用户注册奖励" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rewardCents">奖励金额 ($)</Label>
        <Input
          id="rewardCents"
          name="rewardCents"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults.rewardInput}
          placeholder="6.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="perUserLimit">每人限领次数</Label>
        <Input
          id="perUserLimit"
          name="perUserLimit"
          type="number"
          min="1"
          defaultValue={defaults.perUserLimit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="startsAt">开始时间</Label>
        <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={defaults.startsAtInput} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="endsAt">结束时间（留空=永久）</Label>
        <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={defaults.endsAtInput} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="totalBudgetCents">总预算 ($)（留空=不限）</Label>
        <Input
          id="totalBudgetCents"
          name="totalBudgetCents"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults.totalBudgetInput}
          placeholder="如 1000.00"
        />
      </div>

      <div className="flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={defaults.enabled} />
          启用
        </label>
      </div>

      <div className="md:col-span-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? '保存' : '创建'}
          </Button>
          {editing && (
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/campaigns">取消</Link>
            </Button>
          )}
        </div>
        {success && <FormSuccess message="已保存" />}
        <FormError message={error ?? undefined} />
      </div>
    </form>
  );
}
