import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  data: { hour: number; dayOfWeek: number; count: number }[];
  loading?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12a";
  if (i === 12) return "12p";
  if (i < 12) return i + "a";
  return (i - 12) + "p";
});

function getColor(count: number, maxCount: number): string {
  if (count === 0) return "bg-muted";
  const intensity = count / maxCount;
  if (intensity < 0.15) return "bg-emerald-200/60 dark:bg-emerald-900/40";
  if (intensity < 0.35) return "bg-emerald-300/70 dark:bg-emerald-800/60";
  if (intensity < 0.6) return "bg-emerald-400/80 dark:bg-emerald-600/80";
  if (intensity < 0.85) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-600 dark:bg-emerald-400";
}

export function ActivityHeatmap({ data, loading = false }: HeatmapProps) {
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    data.forEach(({ hour, dayOfWeek, count }) => {
      if (dayOfWeek >= 0 && dayOfWeek < 7 && hour >= 0 && hour < 24) {
        g[dayOfWeek][hour] += count;
      }
    });
    return g;
  }, [data]);

  const maxCount = useMemo(() => Math.max(...grid.flat(), 1), [grid]);

  if (loading) {
    return (
      <div className="flex flex-col gap-1 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-1">
            <div className="w-8 h-5 bg-muted rounded" />
            {Array.from({ length: 24 }).map((_, j) => (
              <div key={j} className="flex-1 h-5 bg-muted rounded-sm" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-1 mb-1 pl-9">
        {HOURS.map((h, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground leading-tight">
            {i % 4 === 0 ? h : ""}
          </div>
        ))}
      </div>
      {DAYS.map((day, di) => (
        <div key={day} className="flex gap-1 mb-1 items-center">
          <span className="w-8 text-[10px] text-muted-foreground text-right pr-1 shrink-0">{day}</span>
          {grid[di].map((count, hi) => (
            <div
              key={hi}
              title={day + " " + HOURS[hi] + ": " + count + " posts"}
              className={cn(
                "flex-1 h-5 rounded-sm transition-all cursor-default hover:ring-1 hover:ring-emerald-400",
                getColor(count, maxCount)
              )}
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-muted-foreground">Less</span>
        <div className="size-3.5 rounded-sm bg-muted" />
        <div className="size-3.5 rounded-sm bg-emerald-200/60 dark:bg-emerald-900/40" />
        <div className="size-3.5 rounded-sm bg-emerald-400/80 dark:bg-emerald-600/80" />
        <div className="size-3.5 rounded-sm bg-emerald-500" />
        <div className="size-3.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}