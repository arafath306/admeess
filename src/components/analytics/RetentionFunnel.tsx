import { cn } from "@/lib/utils";

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

interface RetentionFunnelProps {
  steps: FunnelStep[];
  loading?: boolean;
}

export function RetentionFunnel({ steps, loading = false }: RetentionFunnelProps) {
  const maxCount = Math.max(...steps.map(s => s.count), 1);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-3 w-12 bg-muted rounded" />
            </div>
            <div className="h-8 bg-muted rounded-lg" style={{ width: (100 - i * 15) + "%" }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      {steps.map((step, i) => {
        const pct = (step.count / maxCount) * 100;
        const conversionFromPrev =
          i > 0 && steps[i - 1].count > 0
            ? ((step.count / steps[i - 1].count) * 100).toFixed(1)
            : null;

        return (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: step.color }}
                />
                <span className="font-medium">{step.label}</span>
                {conversionFromPrev && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {conversionFromPrev}% of prev
                  </span>
                )}
              </div>
              <span className="font-bold tabular-nums">{step.count.toLocaleString()}</span>
            </div>
            <div className="h-8 w-full bg-muted/50 rounded-lg overflow-hidden">
              <div
                className={cn("h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3")}
                style={{ width: pct + "%", backgroundColor: step.color + "cc" }}
              >
                {pct > 20 && (
                  <span className="text-xs font-medium text-white/90">{pct.toFixed(1)}%</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}