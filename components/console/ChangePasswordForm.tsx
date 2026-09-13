'use client';

import { useFormState } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Field, FormError, FormSuccess, SubmitButton } from '@/components/ui/form';
import { changePasswordAction } from '@/lib/server/actions/auth';
import { getDict, type Locale } from '@/lib/i18n';
import type { ActionResult } from '@/lib/validators';

const initial: ActionResult = { ok: false };

export function ChangePasswordForm({ locale }: { locale: Locale }) {
  const t = getDict(locale).console.settings;
  const [state, formAction] = useFormState(changePasswordAction, initial);
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <FormError message={state.error} />
      {state.ok && <FormSuccess message={t.passwordUpdated} />}
      <Field label={t.currentPassword} htmlFor="currentPassword" error={state.fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label={t.newPassword} htmlFor="newPassword" hint={t.passwordHint} error={state.fieldErrors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label={t.confirmPassword} htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <SubmitButton>{t.updatePassword}</SubmitButton>
    </form>
  );
}
