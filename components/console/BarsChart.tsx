import { cn } from '@/lib/utils';

export interface BarPoint {
  label: string;
  value: number;
}

/** Lightweight CSS bar chart — no chart dependency. */
export function BarsChart({ points, height = 160, formatValue }: { points: BarPoint[]; height?: number; formatValue?: (v: number) => string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {points.map((p, i) => (
          <div key={`${p.label}-${i}`} className="group flex flex-1 flex-col justify-end">
            <div
              className={cn(
                'w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary',
                p.value === 0 && 'bg-muted',
              )}
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
              title={formatValue ? `${p.label}: ${formatValue(p.value)}` : `${p.label}: ${p.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1 text-[10px] text-muted-foreground">
        {points.map((p, i) => (
          <div key={`l-${p.label}-${i}`} className="flex-1 truncate text-center">
            {i % Math.ceil(points.length / 7) === 0 ? p.label.slice(5) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
