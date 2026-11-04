import type { ComponentType } from "react"
import { BadgeCheck, DollarSign, Shield, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { timelineEvents } from "../data"

const categoryConfig: Record<string, { icon: ComponentType<{ className?: string }>; color: string; bg: string; badgeClass: string }> = {
  account: { icon: UserPlus, color: "text-blue-500", bg: "bg-blue-500/10", badgeClass: "text-blue-600 bg-blue-50 dark:bg-blue-950 border-transparent" },
  verification: { icon: BadgeCheck, color: "text-purple-500", bg: "bg-purple-500/10", badgeClass: "text-purple-600 bg-purple-50 dark:bg-purple-950 border-transparent" },
  moderation: { icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10", badgeClass: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-transparent" },
  monetization: { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", badgeClass: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent" },
}

export function TimelineTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Account Timeline</CardTitle>
          <CardDescription>Chronological history of all significant account events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {timelineEvents.map((event) => {
                const cfg = categoryConfig[event.category] ?? categoryConfig.account
                const Icon = cfg.icon
                return (
                  <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
                    <div className={cn("relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-background", cfg.bg)}>
                      <Icon className={cn("size-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{event.title}</p>
                            <Badge variant="outline" className={cn("text-[10px] h-4 px-1 capitalize", cfg.badgeClass)}>
                              {event.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{event.date}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">by {event.admin}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
