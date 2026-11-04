import { CheckCircle, Pause, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { monetizationData, payoutHistory } from "../data"

const chartConfig = {
  earnings: { label: "Earnings ($)", color: "var(--chart-1)" },
}

const payoutStatus: Record<string, string> = {
  paid: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-transparent",
  failed: "text-red-600 bg-red-50 dark:bg-red-950 border-transparent",
}

export function MonetizationTab() {
  const m = monetizationData
  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Monetization Active</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Creator program enabled since June 2023</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => toast.warning("Monetization paused")}>
            <Pause className="size-3" />Pause
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => toast.error("Monetization revoked")}>
            <XCircle className="size-3" />Revoke
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Earnings", value: `$${m.totalEarnings.toLocaleString()}`, color: "text-foreground" },
          { label: "Pending Payout", value: `$${m.pendingPayout.toLocaleString()}`, color: "text-amber-500" },
          { label: "Avg. CPM", value: `$${m.cpm}`, color: "text-blue-500" },
          { label: "Subscribers", value: m.subscribers.toLocaleString(), color: "text-purple-500" },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <CardContent className="px-4">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={cn("text-xl font-bold tabular-nums mt-0.5", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Monthly Revenue</CardTitle>
          <CardDescription>Earnings in USD over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={m.monthlyRevenue} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="earnings" fill="var(--color-earnings)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Payout history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Payout History</CardTitle>
          <CardDescription>All payouts processed for this account</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Payout ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutHistory.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-6"><code className="text-xs font-mono">{p.id}</code></TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums">${p.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.method}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", payoutStatus[p.status])}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground pr-6">{p.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
