'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  LayoutDashboard,
  KeyRound,
  BarChart3,
  CreditCard,
  Settings,
  ShieldCheck,
  Cpu,
  Package,
  Receipt,
  Users,
  SlidersHorizontal,
  ShieldHalf,
  BookOpen,
  Gift,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { apiPostJson } from '@/lib/client/api';
import { hasPermission } from '@/lib/permissions';
import { getDict, type Dictionary, type Locale } from '@/lib/i18n';
import type { AuthUser } from '@/lib/types';

interface NavItem<K extends string> {
  href: string;
  labelKey: K;
  icon: typeof LayoutDashboard;
  /** Permission code (module:action) required to see this entry. */
  permission: string;
}

const CONSOLE_NAV: Array<NavItem<keyof Dictionary['console']['nav']>> = [
  { href: '/dashboard', labelKey: 'overview', icon: LayoutDashboard, permission: 'console:view' },
  { href: '/dashboard/tokens', labelKey: 'apiKeys', icon: KeyRound, permission: 'apikey:manage' },
  { href: '/dashboard/usage', labelKey: 'usage', icon: BarChart3, permission: 'usage:view' },
  { href: '/dashboard/billing', labelKey: 'billing', icon: CreditCard, permission: 'billing:manage' },
  { href: '/dashboard/settings', labelKey: 'settings', icon: Settings, permission: 'account:manage' },
];

const ADMIN_NAV: Array<NavItem<keyof Dictionary['console']['shell']['adminNav']>> = [
  { href: '/admin', labelKey: 'overview', icon: ShieldCheck, permission: 'admin:view' },
  { href: '/admin/models', labelKey: 'models', icon: Cpu, permission: 'model:view' },
  { href: '/admin/plans', labelKey: 'plans', icon: Package, permission: 'plan:view' },
  { href: '/admin/orders', labelKey: 'orders', icon: Receipt, permission: 'order:view_all' },
  { href: '/admin/users', labelKey: 'users', icon: Users, permission: 'user:view' },
  { href: '/admin/roles', labelKey: 'roles', icon: ShieldHalf, permission: 'role:view' },
  { href: '/admin/docs', labelKey: 'docs', icon: BookOpen, permission: 'doc:manage' },
  { href: '/admin/usage', labelKey: 'usage', icon: BarChart3, permission: 'usage:view_all' },
  { href: '/admin/campaigns', labelKey: 'campaigns', icon: Gift, permission: 'admin:view' },
  { href: '/admin/settings', labelKey: 'settings', icon: SlidersHorizontal, permission: 'setting:view' },
];

export function ConsoleShell({
  user,
  locale,
  children,
}: {
  user: AuthUser;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getDict(locale);
  const pathname = usePathname();
  const initials = user.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const consoleNav = CONSOLE_NAV.filter((item) => hasPermission(user, item.permission)).map((item) => ({
    href: item.href,
    label: t.console.nav[item.labelKey],
    icon: item.icon,
  }));
  const adminNav = ADMIN_NAV.filter((item) => hasPermission(user, item.permission)).map((item) => ({
    href: item.href,
    label: t.console.shell.adminNav[item.labelKey],
    icon: item.icon,
  }));

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2" aria-label={t.common.nav.dashboard}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">{t.common.brand}</span>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavGroup label={t.console.shell.groupConsole} items={consoleNav} pathname={pathname} />
          {adminNav.length > 0 && (
            <div className="pt-4">
              <NavGroup label={t.console.shell.groupAdmin} items={adminNav} pathname={pathname} />
            </div>
          )}
        </nav>
        <Separator />
        <div className="space-y-3 p-4">
          <Link href="/dashboard/billing" className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{initials || 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </Link>
          <div className="flex justify-end">
            <LocaleSwitcher current={locale} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              const res = await apiPostJson<{ redirect: string }>('/api/auth/logout');
              window.location.assign(res.data?.redirect ?? '/login');
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t.common.nav.signOut}
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: Array<{ href: string; label: string; icon: typeof LayoutDashboard }>;
  pathname: string;
}) {
  return (
    <div>
      <div className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {items.map((item) => {
        // Group roots (/dashboard, /admin) must match exactly, otherwise
        // every sub-page would keep the root highlighted.
        const isGroupRoot = item.href.replace(/^\//, '').split('/').length === 1;
        const active = isGroupRoot ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
