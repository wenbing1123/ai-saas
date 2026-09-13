'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { marketingEn } from '@/lib/i18n/dict-marketing';

type HeroDict = (typeof marketingEn)['landing']['hero'];
type StatsDict = (typeof marketingEn)['landing']['stats'];

const AUTOPLAY_MS = 5500;

/**
 * Switchable hero banner: auto-rotating slides with manual dots/arrows.
 * Autoplay pauses on hover/focus and when the user prefers reduced motion.
 */
export function HeroCarousel({ hero, stats }: { hero: HeroDict; stats: StatsDict }) {
  const slides = hero.slides;
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((next: number) => setIndex((i) => ((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  const slide = slides[index];

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={hero.slideDot.replace('{n}', String(index + 1))}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent 55%)]" />
      <div className="container flex flex-col items-center py-24 text-center">
        {/* keyed remount gives a clean fade-in without fixed-height overlays */}
        <div key={index} className="flex animate-in flex-col items-center fade-in-0 duration-700">
          <Badge variant="secondary" className="mb-6">
            <Zap className="mr-2 h-3 w-3" />
            {slide.badge}
          </Badge>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            {slide.titlePrefix}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              {slide.titleHighlight}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{slide.subtitle}</p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">
              {hero.ctaPrimary} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">{hero.ctaSecondary}</Link>
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label={hero.prevSlide}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2" role="tablist" aria-label="Banners">
            {slides.map((s, i) => (
              <button
                key={s.titleHighlight}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={hero.slideDot.replace('{n}', String(i + 1))}
                onClick={() => go(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60',
                )}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            aria-label={hero.nextSlide}
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-6 text-left sm:grid-cols-4">
          <Stat value="8+" label={stats.models} />
          <Stat value="<30s" label={stats.provisioning} />
          <Stat value="2" label={stats.protocols} />
          <Stat value="0" label={stats.noLockIn} />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
