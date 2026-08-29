'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, Workflow, Database, Activity, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const iconMap = {
  workflow: Workflow,
  database: Database,
  activity: Activity,
  users: Users,
} as const;

export default function MarketingPage() {
  return (
    <main className="flex flex-col">
      <MarketingNav />
      <HeroSection />
      <FeatureSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function MarketingNav() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">Nebula AI</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t('features')}
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t('pricing')}
          </Link>
          <Link href="/chat" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {t('playground')}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">{t('signIn')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/chat">{t('tryDemo')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const t = useTranslations('marketing');
  const tm = useTranslations('meta');
  const tc = useTranslations('common');

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_50%)]" />
      <div className="container flex flex-col items-center py-24 text-center">
        <Badge variant="secondary" className="mb-6 animate-fade-in">
          <Sparkles className="mr-2 h-3 w-3" />
          {t('badge')}
        </Badge>
        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl animate-slide-in">
          {t('heroTitle')}{' '}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {t('heroTitleHighlight')}
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground animate-slide-in">
          {tm('description')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/chat">{t('launchPlayground')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">{t('exploreFeatures')}</Link>
          </Button>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 text-left sm:gap-16">
          <Stat label={t('agentsShipped')} value="12k+" />
          <Stat label={t('dailyRuns')} value="4.8M" />
          <Stat label={t('avgLatency')} value="420ms" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureSection() {
  const t = useTranslations('marketing');
  const tf = useTranslations('marketing.feature');

  const features = [
    { title: tf('visualStudioTitle'), description: tf('visualStudioDesc'), icon: 'workflow' },
    { title: tf('knowledgeRagTitle'), description: tf('knowledgeRagDesc'), icon: 'database' },
    { title: tf('observabilityTitle'), description: tf('observabilityDesc'), icon: 'activity' },
    { title: tf('teamCollabTitle'), description: tf('teamCollabDesc'), icon: 'users' },
  ];

  return (
    <section id="features" className="border-t bg-muted/40 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('everythingYouNeed')}</h2>
          <p className="mt-4 text-muted-foreground">
            {t('everythingYouNeedDesc')}
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <Card key={feature.title} className="transition hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const t = useTranslations('marketing');
  const tp = useTranslations('marketing.plan');

  const plans = [
    {
      name: tp('starterName'),
      price: tp('starterPrice'),
      interval: tp('starterInterval'),
      description: tp('starterDesc'),
      features: [tp('starterFeature1'), tp('starterFeature2'), tp('starterFeature3'), tp('starterFeature4')],
      cta: tp('starterCta'),
    },
    {
      name: tp('teamName'),
      price: tp('teamPrice'),
      interval: tp('teamInterval'),
      description: tp('teamDesc'),
      features: [tp('teamFeature1'), tp('teamFeature2'), tp('teamFeature3'), tp('teamFeature4'), tp('teamFeature5')],
      cta: tp('teamCta'),
      highlighted: true,
    },
    {
      name: tp('enterpriseName'),
      price: tp('enterprisePrice'),
      interval: '',
      description: tp('enterpriseDesc'),
      features: [tp('enterpriseFeature1'), tp('enterpriseFeature2'), tp('enterpriseFeature3'), tp('enterpriseFeature4')],
      cta: tp('enterpriseCta'),
    },
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('simplePricing')}</h2>
          <p className="mt-4 text-muted-foreground">{t('simplePricingDesc')}</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t('popular')}</Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {plan.interval && (
                    <span className="ml-2 text-sm text-muted-foreground">{plan.interval}</span>
                  )}
                </div>
                <ul className="mb-8 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-auto" variant={plan.highlighted ? 'default' : 'outline'}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const t = useTranslations('marketing');
  const tn = useTranslations('nav');

  return (
    <section className="border-t bg-muted/40 py-24">
      <div className="container">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.15),transparent_50%)]" />
          <CardContent className="flex flex-col items-center justify-between gap-6 p-12 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('readyToShip')}</h2>
              <p className="mt-2 text-muted-foreground">
                {t('readyToShipDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="lg" asChild>
                <Link href="/chat">{t('openPlayground')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/agents">{tn('browseAgents')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  const t = useTranslations('marketing');
  const tn = useTranslations('nav');

  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Nebula AI — {t('tagline')}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground">{tn('docs')}</Link>
          <Link href="#" className="hover:text-foreground">{tn('github')}</Link>
          <Link href="#" className="hover:text-foreground">{tn('privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}