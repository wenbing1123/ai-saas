'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, Bell, Shield, CreditCard, Palette, Cpu, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AppHeader } from '@/components/dashboard/AppShell';

const tabs = [
  { id: 'profile', key: 'section_profile', icon: User },
  { id: 'billing', key: 'section_billing', icon: CreditCard },
  { id: 'agents', key: 'section_agents', icon: Cpu },
  { id: 'notifications', key: 'section_notifications', icon: Bell },
  { id: 'security', key: 'section_security', icon: Shield },
  { id: 'appearance', key: 'section_appearance', icon: Palette },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [active, setActive] = useState<TabId>('profile');

  return (
    <>
      <AppHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="flex-1 overflow-auto">
        <div className="container grid gap-6 py-6 md:grid-cols-[220px_1fr]">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(tab.key)}
                </button>
              );
            })}
          </nav>

          <div className="space-y-6">
            {active === 'profile' && <ProfileSection />}
            {active === 'billing' && <BillingSection />}
            {active === 'agents' && <AgentsSection />}
            {active === 'notifications' && <NotificationsSection />}
            {active === 'security' && <SecuritySection />}
            {active === 'appearance' && <AppearanceSection />}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileSection() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('displayName')} defaultValue="Scott Agent" />
          <Field label={t('emailLabel')} defaultValue="scott@nebula.ai" type="email" />
          <Field label={tc('role') ?? 'Role'} defaultValue="Founder / Builder" />
          <Field label={tc('timezone') ?? 'Timezone'} defaultValue="Asia/Shanghai" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('bioLabel')}</label>
          <Textarea
            defaultValue="Building delightful AI products for modern teams."
            className="min-h-[100px]"
          />
        </div>
        <div className="flex justify-end">
          <Button>
            <Save className="h-4 w-4" />
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingSection() {
  const t = useTranslations('settings');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('plan') ?? 'Current plan'}</CardTitle>
              <CardDescription>{t('onTeamPlan') ?? "You're on the Team plan."}</CardDescription>
            </div>
            <Badge>{t('teamName') ?? 'Team'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>{t('usageCycle') ?? 'Usage this cycle'}</span>
            <span className="font-medium">42,000 / 100,000 requests</span>
          </div>
          <Progress value={42} />
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline">{t('manageSubscription') ?? 'Manage subscription'}</Button>
            <Button>{t('upgrade') ?? 'Upgrade'}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentMethod') ?? 'Payment method'}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-12 items-center justify-center rounded-md bg-primary/10 text-xs font-bold">
              VISA
            </div>
            <div className="text-sm">
              <div>•••• 4242</div>
              <div className="text-xs text-muted-foreground">Expires Dec 2027</div>
            </div>
          </div>
          <Button variant="outline" size="sm">{t('update') ?? 'Update'}</Button>
        </CardContent>
      </Card>
    </>
  );
}

function AgentsSection() {
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('defaultAgentSettings') ?? 'Default agent settings'}</CardTitle>
        <CardDescription>{t('defaultAgentSettingsDesc') ?? 'Configure the default model, temperature and tools for new agents.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('defaultModel') ?? 'Default model'} defaultValue="gpt-4o" />
          <Field label={t('defaultTemp') ?? 'Default temperature'} defaultValue="0.4" />
          <Field label={t('maxTokens') ?? 'Max tokens'} defaultValue="4096" />
          <Field label={t('maxTurns') ?? 'Max turns'} defaultValue="20" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('systemPromptTemplate') ?? 'System prompt (template)'}</label>
          <Textarea
            defaultValue="You are a helpful, harmless, honest AI assistant."
            className="min-h-[100px] font-mono text-xs"
          />
        </div>
        <div className="flex justify-end">
          <Button>
            <Save className="h-4 w-4" />
            {t('saveDefaults') ?? 'Save defaults'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  const t = useTranslations('settings');

  const items = [
    { title: t('notifProductUpdates') ?? 'Product updates', desc: t('notifProductUpdatesDesc') ?? 'New features and improvements' },
    { title: t('notifAgentAlerts') ?? 'Agent alerts', desc: t('notifAgentAlertsDesc') ?? 'When an agent fails or exceeds latency thresholds' },
    { title: t('notifWeeklyDigest') ?? 'Weekly digest', desc: t('notifWeeklyDigestDesc') ?? 'Summary of your agent activity every Monday' },
    { title: t('notifMarketing') ?? 'Marketing', desc: t('notifMarketingDesc') ?? 'Events, case studies and research reports' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notificationsTitle')}</CardTitle>
        <CardDescription>{t('notificationsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <label key={item.title} className="flex cursor-pointer items-start justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <input type="checkbox" defaultChecked className="mt-1 h-4 w-4" />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('securityTitle')}</CardTitle>
        <CardDescription>{t('securityDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{t('twoFactor')}</div>
            <div className="text-xs text-muted-foreground">{t('twoFactorDesc')}</div>
          </div>
          <Button variant="outline" size="sm">{t('enable') ?? 'Enable'}</Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{t('apiTokens') ?? 'API tokens'}</div>
            <div className="text-xs text-muted-foreground">{t('apiTokensDesc') ?? '2 active tokens · last used 2 hours ago'}</div>
          </div>
          <Button variant="outline" size="sm">{t('manageTokens') ?? 'Manage tokens'}</Button>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">{t('samlSso') ?? 'SAML SSO'}</div>
            <div className="text-xs text-muted-foreground">{t('samlSsoDesc') ?? 'Enabled for your workspace'}</div>
          </div>
          <Button variant="outline" size="sm">{t('configure') ?? 'Configure'}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSection() {
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('appearanceTitle')}</CardTitle>
        <CardDescription>{t('appearanceDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">{t('theme') ?? 'Theme'}</label>
          <div className="grid grid-cols-3 gap-3">
            {[t('light') ?? 'Light', t('dark') ?? 'Dark', t('system') ?? 'System'].map((label, i) => (
              <button
                key={label}
                className={`rounded-lg border p-3 text-sm font-medium ${i === 0 ? 'border-primary bg-primary/5' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">{t('accentColor') ?? 'Accent color'}</label>
          <div className="flex gap-2">
            {['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'].map((c) => (
              <button
                key={c}
                className="h-8 w-8 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  defaultValue,
  type = 'text',
}: {
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input defaultValue={defaultValue} type={type} />
    </div>
  );
}