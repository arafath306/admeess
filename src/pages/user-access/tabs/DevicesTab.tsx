import { LogOut, Monitor, Shield, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { devices } from "../data"

export function DevicesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Registered Devices</CardTitle>
          <CardDescription>{devices.length} devices associated with this account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.map((d) => {
            const Icon = d.name.toLowerCase().includes("iphone") ? Smartphone : Monitor
            return (
              <div key={d.id} className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                d.current && "bg-muted/30 border-primary/20"
              )}>
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", d.trusted ? "bg-emerald-500/10" : "bg-muted")}>
                  <Icon className={cn("size-5", d.trusted ? "text-emerald-500" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.current && <Badge variant="secondary" className="text-[10px] h-4 px-1 text-blue-600 bg-blue-50 dark:bg-blue-950">Current Session</Badge>}
                    {d.trusted && <Badge variant="outline" className="text-[10px] h-4 px-1 text-emerald-600 border-emerald-300 dark:border-emerald-800 gap-0.5"><Shield className="size-2.5" />Trusted</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.browser} · {d.os}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <code className="font-mono">{d.ip}</code>
                    <span>·</span>
                    <span>Last active: {d.lastActive}</span>
                    <span>·</span>
                    <span>{d.method}</span>
                  </div>
                </div>
                {!d.current && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => toast.warning(`Session revoked on ${d.name}`)}>
                    <LogOut className="size-3" />Revoke
                  </Button>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
