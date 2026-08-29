'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Sparkles,
  MessageSquare,
  Bot,
  BookOpen,
  Settings,
  ChevronsLeft,
  Zap,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LanguageSwitcherButton } from '@/components/LanguageSwitcher';

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const td = useTranslations('dashboard');

  const navItems = [
    { href: '/chat', label: t('playground'), icon: MessageSquare },
    { href: '/agents', label: t('agents'), icon: Bot },
    { href: '/knowledge', label: t('knowledge'), icon: BookOpen },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card/30">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">Nebula AI</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3 w-3" /> {td('usage')}
            </span>
            <span className="font-medium">42k / 100k</span>
          </div>
          <Progress value={42} />
        </div>

        <div className="flex items-center justify-between rounded-lg p-2 hover:bg-accent">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-sm">SA</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Scott Agent</div>
              <div className="truncate text-xs text-muted-foreground">scott@nebula.ai</div>
            </div>
          </div>
          <LanguageSwitcherButton />
        </div>
      </div>
    </aside>
  );
}

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useTranslations('dashboard');

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>{t('systemsOperational')}</span>
        </div>
        <Button size="sm" variant="outline">
          {t('upgrade')}
        </Button>
      </div>
    </header>
  );
}