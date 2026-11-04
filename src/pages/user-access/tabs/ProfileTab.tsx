import { AtSign, BadgeCheck, Clock, ExternalLink, Globe, Link2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usernameHistory, displayNameHistory, badgeHistory } from "../data"

function HistoryRow({ label, sub, current }: { label: string; sub: string; current: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {current && <Badge variant="secondary" className="text-[10px] h-4 px-1">Current</Badge>}
    </div>
  )
}

export function ProfileTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cover + avatar */}
            <div className="relative">
              <div className="h-24 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <div className="absolute -bottom-6 left-4">
                <Avatar className="size-14 ring-4 ring-background">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">AR</AvatarFallback>
                </Avatar>
              </div>
            </div>
            <div className="pt-7 space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Alex Rivera</p>
                <BadgeCheck className="size-4 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">@photo_artist</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Award-winning photographer based in Los Angeles. Specializing in street, portrait, and landscape photography.
                Sharing tips, tutorials, and behind-the-scenes content.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="size-3.5" />
                <span>alexrivera.photo</span>
                <ExternalLink className="size-3 ml-auto" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="size-3.5" />
                <span>Instagram: @photo_artist</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AtSign className="size-3.5" />
                <span>X: @alexrivera_photo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Verification & Badge History</CardTitle>
            <CardDescription>All badges granted or removed over account lifetime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {badgeHistory.map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <BadgeCheck className="size-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{b.badge}</p>
                      {b.active && <Badge variant="secondary" className="text-[10px] h-4 px-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Granted {b.granted} · by {b.by}</p>
                    <p className="text-xs text-muted-foreground">via {b.method}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Username History</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {usernameHistory.map((u, i) => (
              <HistoryRow key={i} label={`@${u.username}`} sub={`Since ${u.since}`} current={u.current} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Display Name History</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {displayNameHistory.map((d, i) => (
              <HistoryRow key={i} label={d.name} sub={`Since ${d.since}`} current={d.current} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Profile edit history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Profile Edit History</CardTitle>
          <CardDescription>Recent changes to profile fields</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { field: "Bio", oldValue: "Photographer & visual storyteller", newValue: "Award-winning photographer based in Los Angeles...", date: "Jan 2, 2026", by: "User" },
              { field: "Profile Photo", oldValue: "Previous photo", newValue: "Current photo", date: "Dec 15, 2025", by: "User" },
              { field: "Links", oldValue: "instagram.com/ar_photo", newValue: "alexrivera.photo", date: "Nov 28, 2025", by: "User" },
            ].map((edit, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Clock className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{edit.field} updated</p>
                    <p className="text-[10px] text-muted-foreground">{edit.date}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="line-through mr-1">{edit.oldValue}</span>
                    → {edit.newValue.length > 40 ? edit.newValue.slice(0, 40) + "..." : edit.newValue}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
