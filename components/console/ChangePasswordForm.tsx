'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { apiPostForm } from '@/lib/client/api';
import { getDict, type Locale } from '@/lib/i18n';
import { type ApiResponse, fieldErrorsOf, initialApiResponse } from '@/lib/server/api-response';

export function ChangePasswordForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).console.settings;
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ApiResponse>(initialApiResponse());
  const fieldErrors = fieldErrorsOf(state);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await apiPostForm('/api/auth/change-password', new FormData(e.currentTarget));
      setState(res);
      if (res.code === '0000') toast.success(t.passwordUpdated);
      else toast.error(res.msg);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <Field label={t.currentPassword} htmlFor="currentPassword" error={fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={t.newPassword} htmlFor="newPassword" hint={t.passwordHint} error={fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label={t.confirmPassword} htmlFor="confirmPassword" error={fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t.updatePassword}
      </Button>
    </form>
  );
}
