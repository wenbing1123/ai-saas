'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('language');

  const handleChange = (newLocale: string) => {
    document.cookie = `next-intl-locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  return (
    <div className="relative flex items-center gap-1">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="cursor-pointer rounded-md border bg-transparent px-2 py-1 text-sm font-medium text-foreground outline-none hover:bg-accent"
        aria-label={t('label')}
      >
        <option value="en">{t('en')}</option>
        <option value="zh">{t('zh')}</option>
      </select>
    </div>
  );
}

export function LanguageSwitcherButton() {
  const t = useTranslations('language');

  const handleChange = (newLocale: string) => {
    document.cookie = `next-intl-locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange('en')}
        className="h-7 px-2 text-xs"
      >
        EN
      </Button>
      <span className="text-xs text-muted-foreground">/</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleChange('zh')}
        className="h-7 px-2 text-xs"
      >
        中文
      </Button>
    </div>
  );
}