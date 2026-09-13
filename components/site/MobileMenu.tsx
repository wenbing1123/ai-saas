'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MobileMenuItem {
  href: string;
  label: string;
  /** Render as a filled CTA button instead of a plain text row. */
  primary?: boolean;
}

/**
 * Hamburger menu for viewports below the `md` breakpoint.
 * Desktop nav is `hidden md:flex`; without this the whole marketing
 * navigation is unreachable on narrow / side-tiled windows.
 */
export function MobileMenu({ items, menuLabel }: { items: MobileMenuItem[]; menuLabel: string }) {
  const [open, setOpen] = useState(false);

  // Close on Escape and lock nothing else; route changes remount via key clicks.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <>
          {/* Click-away scrim */}
          <button
            type="button"
            aria-label={menuLabel}
            tabIndex={-1}
            className="fixed inset-0 top-16 z-40 cursor-default bg-black/20"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-x-0 top-16 z-50 border-b bg-background shadow-lg">
            <div className="container flex flex-col gap-1 py-3">
              {items.map((item) =>
                item.primary ? (
                  <Button key={item.href} size="sm" asChild className="mt-1">
                    <Link href={item.href} onClick={() => setOpen(false)}>
                      {item.label}
                    </Link>
                  </Button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
