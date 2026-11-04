import { LogOut, Monitor, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sessions } from "../data"

const statusConfig: Record<string, string> = {
  active: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent",
  inactive: "text-slate-600 border-slate-300 dark:border-slate-700",
  expired: "text-amber-600 border-amber-300 dark:border-amber-800",
  terminated: "text-red-600 bg-red-50 dark:bg-red-950 border-transparent",
}

export function SessionsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sessions.length} sessions found</p>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => toast.warning("All non-current sessions terminated")}>
          <LogOut className="size-3" />Terminate All Sessions
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Session ID</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => {
                const Icon = s.device.toLowerCase().includes("iphone") ? Smartphone : Monitor
                return (
                  <TableRow key={s.id} className={s.status === "active" ? "bg-muted/20" : ""}>
                    <TableCell className="pl-6">
                      <code className="text-xs font-mono">{s.id}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="size-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">{s.device}</p>
                          <p className="text-[10px] text-muted-foreground">{s.os}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.location}</TableCell>
                    <TableCell>
                      <code className="text-[11px] font-mono text-muted-foreground">{s.ip}</code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.started}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.duration}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1 capitalize", statusConfig[s.status])}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">
                      {s.status === "active" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => toast.warning(`Session ${s.id} terminated`)}>
                          <LogOut className="size-3" />End
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
