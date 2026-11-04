import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { reports } from "../data"

const statusConfig: Record<string, string> = {
  resolved: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent",
  dismissed: "text-slate-600 border-slate-300 dark:border-slate-700",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-transparent",
}

export function ReportsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Reports", value: "3", color: "text-foreground" },
          { label: "Resolved", value: "2", color: "text-emerald-500" },
          { label: "Dismissed", value: "1", color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <CardContent className="px-4">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Reports Against This Account</CardTitle>
          <CardDescription>All reports filed against @photo_artist</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Report ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Moderator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6">
                    <code className="text-xs font-mono">{r.id}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Flag className="size-3 text-amber-500" />
                      <span className="text-xs">{r.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[9px]">{r.reporter[1].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{r.reporter}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{r.evidence}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.resolution}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.moderator}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", statusConfig[r.status])}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground pr-6">{r.created}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
