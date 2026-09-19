'use client';

import { useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

/**
 * Minimal dependency-free toast store. `toast.success/error` are safe to call
 * from anywhere client-side (event handlers, transitions); the single <Toaster/>
 * in the root layout renders the stack. Every toast auto-dismisses after 5s.
 */
const TOAST_DURATION_MS = 5000;

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  if (!items.some((t) => t.id === id)) return;
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(type: ToastType, message: string) {
  const id = ++seq;
  items = [...items, { id, type, message }];
  emit();
  setTimeout(() => dismiss(id), TOAST_DURATION_MS);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

const EMPTY: ToastItem[] = [];

function getServerSnapshot(): ToastItem[] {
  return EMPTY;
}

export function Toaster() {
  const stack = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (stack.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {stack.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const success = item.type === 'success';
  return (
    <div
      role="status"
      className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-background p-3 shadow-lg ${
        success ? 'border-emerald-500/40' : 'border-red-500/40'
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      )}
      <p className="flex-1 break-words text-sm leading-5">{item.message}</p>
      <button
        type="button"
        aria-label="关闭"
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => onDismiss(item.id)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
