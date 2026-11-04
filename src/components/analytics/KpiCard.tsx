import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
}

function formatChange(change: number) {
  const abs = Math.abs(change).toFixed(1);
  return (change >= 0 ? "+" : "-") + abs + "%";
}

export function KpiCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  loading = false,
}: KpiCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  return (
    <Card className="py-4 transition-shadow hover:shadow-md">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{value}</p>
            )}
            <div className="flex items-center gap-1 mt-1.5">
              {change !== undefined && !loading ? (
                <>
                  {isPositive && <TrendingUp className="size-3 text-emerald-500" />}
                  {isNegative && <TrendingDown className="size-3 text-red-500" />}
                  {isNeutral && <Minus className="size-3 text-muted-foreground" />}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isPositive && "text-emerald-500",
                      isNegative && "text-red-500",
                      isNeutral && "text-muted-foreground"
                    )}
                  >
                    {formatChange(change!)}
                  </span>
                  <span className="text-xs text-muted-foreground">vs prev period</span>
                </>
              ) : subtitle ? (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              ) : null}
            </div>
          </div>
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={cn("size-4", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}