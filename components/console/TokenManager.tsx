'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Eye, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FormError } from '@/components/ui/form';
import { apiPostForm, apiDelete } from '@/lib/client/api';
import { type ApiResponse, fieldErrorsOf, initialApiResponse } from '@/lib/server/api-response';
import { gatewayBaseUrl } from '@/config/app';
import { formatRelativeTime } from '@/lib/utils';
import { getDict, type Locale } from '@/lib/i18n';
import type { ApiToken } from '@/lib/types';
import { TokenStatus } from '@/lib/db/enums';

type Dict = ReturnType<typeof getDict>;
type CreatedToken = { secret: string; prefix: string; name: string };

export function TokenManager({ tokens, locale }: { tokens: ApiToken[]; locale: Locale }) {
  const d = getDict(locale);
  const t = d.console.tokens;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ApiResponse<CreatedToken>>(initialApiResponse<CreatedToken>());
  const [copied, setCopied] = useState(false);
  const fieldErrors = fieldErrorsOf(state);

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await apiPostForm<CreatedToken>('/api/tokens', new FormData(e.currentTarget));
      setState(res);
      if (res.code === '0000') router.refresh();
    });
  }

  async function copyKey() {
    if (!state.data?.secret) return;
    await navigator.clipboard.writeText(state.data.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.createTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={t.keyName} htmlFor="name" error={fieldErrors?.name} className="flex-1">
              <Input id="name" name="name" placeholder={t.keyNamePlaceholder} maxLength={100} required />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.generate}
            </Button>
          </form>

          {state.code === '0000' && state.data && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <Eye className="h-4 w-4" />
                {t.copyNow}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <code className="flex-1 break-all rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
                  {state.data.secret}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={copyKey}>
                  {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied ? t.copied : t.copy}
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                {t.baseUrl} <code className="font-mono">{gatewayBaseUrl()}</code> · {t.openaiPath}{' '}
                <code className="font-mono">/v1</code> · {t.anthropicPath} <code className="font-mono">/v1/messages</code>
              </div>
            </div>
          )}
          <FormError message={state.msg} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.yourKeys.replace('{count}', String(tokens.length))}</CardTitle>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t.noKeys}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{t.colName}</th>
                    <th className="py-2 pr-4 font-medium">{t.colKey}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t.colRequests}</th>
                    <th className="py-2 pr-4 font-medium">{t.colLastUsed}</th>
                    <th className="py-2 pr-4 font-medium">{d.common.misc.createdAt}</th>
                    <th className="py-2 pr-4 text-right font-medium">{d.common.misc.status}</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <TokenRow key={token.id} token={token} d={d} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TokenRow({ token, d }: { token: ApiToken; d: Dict }) {
  const t = d.console.tokens;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function revoke() {
    startTransition(async () => {
      const res = await apiDelete(`/api/tokens/${token.id}`);
      if (res.code === '0000') router.refresh();
    });
  }

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 font-medium">{token.name}</td>
      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{token.prefix}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{token.requestCount.toLocaleString()}</td>
      <td className="py-3 pr-4 text-muted-foreground">
        {token.lastUsedAt ? formatRelativeTime(token.lastUsedAt) : t.never}
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{formatRelativeTime(token.createdAt)}</td>
      <td className="py-2 pr-4 text-right">
        <Badge variant={token.status === TokenStatus.Active ? 'secondary' : 'destructive'}>
          {d.common.enums.tokenStatus[token.status]}
        </Badge>
      </td>
      <td className="py-2 text-right">
        {token.status === TokenStatus.Active &&
          (confirming ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={revoke}>
                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> {t.confirm}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {t.cancel}
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> {t.revoke}
            </Button>
          ))}
      </td>
    </tr>
  );
}
