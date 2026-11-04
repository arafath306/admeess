import { Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export function SystemStatusPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">System Status</h1><p className="text-sm text-muted-foreground mt-1">Infrastructure health monitoring</p></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { name: "Supabase Database", status: "Operational" },
          { name: "Supabase Auth", status: "Operational" },
          { name: "Supabase Storage", status: "Operational" },
          { name: "Supabase Realtime", status: "Operational" },
          { name: "Firebase Cloud Messaging", status: "Operational" },
          { name: "Admin Panel", status: "Operational" },
        ].map((s) => (
          <Card key={s.name}>
            <CardContent className="py-4 px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10"><Activity className="size-4 text-emerald-500" /></div>
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-xs">{s.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
