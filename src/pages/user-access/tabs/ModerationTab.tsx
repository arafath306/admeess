import { CheckCircle, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ModerationTab() {
  const warnings = [] as { id: number; type: string; description: string; moderator: string; date: string; expiry: string | null }[]
  const suspensions = [] as { id: number; duration: string; reason: string; moderator: string; date: string }[]
  const restrictions = [] as { id: number; type: string; date: string }[]
  const appeals = [] as { id: number; against: string; status: string; date: string }[]

  const goodStanding = warnings.length === 0 && suspensions.length === 0

  return (
    <div className="space-y-4">
      {goodStanding && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
          <CheckCircle className="size-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Account in Good Standing</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">No active warnings, suspensions, or restrictions on this account.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Warning History</CardTitle>
            <CardDescription>All warnings issued to this account</CardDescription>
          </CardHeader>
          <CardContent>
            {warnings.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Shield className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No warnings on record</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Suspension History</CardTitle>
            <CardDescription>All account suspensions</CardDescription>
          </CardHeader>
          <CardContent>
            {suspensions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Shield className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No suspensions on record</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Restrictions</CardTitle>
            <CardDescription>Active feature restrictions</CardDescription>
          </CardHeader>
          <CardContent>
            {restrictions.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">No active restrictions</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Appeals</CardTitle>
            <CardDescription>Appeal submissions by this user</CardDescription>
          </CardHeader>
          <CardContent>
            {appeals.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Shield className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No appeals filed</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Moderator Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted/40 border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              "Account in good standing. Verified creator with consistent, high-quality content. 3 years with no violations. Recommended for expedited support tier."
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">— mod_sarah · Jan 2, 2026</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
