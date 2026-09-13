'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setLocaleAction } from '@/lib/server/actions/locale';
import type { Locale } from '@/lib/i18n/types';

/**
 * Top-right language toggle. Shows the language you would switch TO
 * (current zh → "English", current en → "中文").
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const target: Locale = current === 'zh' ? 'en' : 'zh';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setLocaleAction(target);
          router.refresh();
        })
      }
    >
      {pending ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Languages className="mr-1.5 h-3.5 w-3.5" />
      )}
      {current === 'zh' ? 'English' : '中文'}
    </Button>
  );
}
