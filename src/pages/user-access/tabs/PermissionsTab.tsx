import { useState } from "react"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { permissions } from "../data"

export function PermissionsTab() {
  const [featureState, setFeatureState] = useState(() => {
    const state: Record<string, boolean> = {}
    permissions.features.forEach((cat) => {
      cat.items.forEach((item) => {
        state[item.name] = item.granted
      })
    })
    return state
  })

  const toggle = (name: string) => {
    setFeatureState((prev) => {
      const next = { ...prev, [name]: !prev[name] }
      toast.success(`${name} ${next[name] ? "enabled" : "disabled"}`)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Role badge */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Account Role</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-lg font-bold">{permissions.role}</p>
            <Badge className="text-[10px] h-4 px-1.5">Verified Creator</Badge>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("Opening role manager...")}>Change Role</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toast.info("Resetting to default permissions...")}>Reset Defaults</Button>
        </div>
      </div>

      {/* Permission categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        {permissions.features.map((category) => (
          <Card key={category.category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{category.category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              {category.items.map((item) => {
                const granted = featureState[item.name] ?? item.granted
                return (
                  <div key={item.name} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      {granted
                        ? <CheckCircle className="size-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="size-3.5 text-muted-foreground/50 shrink-0" />
                      }
                      <Label className={cn("text-xs cursor-pointer", !granted && "text-muted-foreground")}>{item.name}</Label>
                    </div>
                    <Switch
                      checked={granted}
                      onCheckedChange={() => toggle(item.name)}
                      className="scale-90"
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
