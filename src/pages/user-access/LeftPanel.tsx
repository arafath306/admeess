import {
  BadgeCheck, Bell, Crown, Eye, Key,
  Shield, ShieldAlert, ShieldOff, Trash2, UserCheck,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { mockUser } from "./data"

const statusConfig = {
  active: { label: "Active", className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent" },
  suspended: { label: "Suspended", className: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-transparent" },
  disabled: { label: "Disabled", className: "text-slate-600 bg-slate-100 dark:bg-slate-900 border-transparent" },
  banned: { label: "Banned", className: "text-red-600 bg-red-50 dark:bg-red-950 border-transparent" },
}

const riskConfig = {
  low: { label: "Low Risk", color: "text-emerald-500" },
  medium: { label: "Medium Risk", color: "text-amber-500" },
  high: { label: "High Risk", color: "text-orange-500" },
  critical: { label: "Critical", color: "text-red-500" },
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-xs break-all", mono && "font-mono")}>{value}</p>
    </div>
  )
}

export function LeftPanel() {
  const user = mockUser
  const sc = statusConfig[user.status]
  const rc = riskConfig[user.riskLevel]

  const trustColor = user.trustScore >= 80 ? "text-emerald-500" : user.trustScore >= 60 ? "text-amber-500" : "text-red-500"
  const trustBarColor = user.trustScore >= 80 ? "bg-emerald-500" : user.trustScore >= 60 ? "bg-amber-500" : "bg-red-500"

  return (
    <div className="p-4 space-y-4">
      {/* Avatar + core identity */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="relative">
          <Avatar className="size-20 ring-2 ring-border">
            <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              AR
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
            <div className="size-2 rounded-full bg-white" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <p className="font-semibold text-sm">{user.displayName}</p>
            <BadgeCheck className="size-3.5 text-blue-500 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground">@{user.username}</p>
          <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{user.id}</p>
        </div>

        <div className="flex gap-1.5 flex-wrap justify-center">
          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", sc.className)}>
            {sc.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-300 dark:border-amber-800">
            Pro
          </Badge>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-purple-600 border-purple-300 dark:border-purple-800">
            Monetized
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Trust score */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Trust Score</span>
          <span className={cn("text-xs font-bold", trustColor)}>{user.trustScore}/100</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", trustBarColor)} style={{ width: `${user.trustScore}%` }} />
        </div>
        <p className={cn("text-[10px]", rc.color)}>{rc.label}</p>
      </div>

      <Separator />

      {/* Account info */}
      <div className="space-y-2.5">
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Phone" value={user.phone} />
        <InfoRow label="Created" value={user.createdAt} />
        <InfoRow label="Last Login" value={user.lastLogin} />
        <InfoRow label="Last Active" value={user.lastActive} />
        <InfoRow label="Location" value={user.location} />
      </div>

      <Separator />

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Followers", value: user.followers.toLocaleString() },
          { label: "Following", value: user.following.toLocaleString() },
          { label: "Posts", value: user.totalPosts.toLocaleString() },
          { label: "Warnings", value: user.warningCount.toString() },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-xs font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Separator />

      {/* Quick actions */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>

        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => toast.info("Opening profile...")}>
          <Eye className="size-3.5" />View Public Profile
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => toast.info("Opening notification composer...")}>
          <Bell className="size-3.5" />Send Notification
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => toast.info("Password reset email sent to alex@example.com")}>
          <Key className="size-3.5" />Reset Password
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-blue-600 hover:text-blue-600 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => toast.success("User verified")}>
          <UserCheck className="size-3.5" />Verify User
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => toast.info("Verification removed")}>
          <ShieldOff className="size-3.5" />Remove Verification
        </Button>

        <Separator className="my-1" />

        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-amber-600 hover:text-amber-600 border-amber-200 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => toast.warning("Account suspended")}>
          <ShieldAlert className="size-3.5" />Suspend Account
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-slate-600 hover:text-slate-600" onClick={() => toast.warning("Account disabled")}>
          <Shield className="size-3.5" />Disable Account
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5">
              <Trash2 className="size-3.5" />Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete @{user.username}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all content, data, and history for <strong>{user.displayName}</strong>. This action cannot be undone and will be logged in the audit trail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => toast.error("Account deleted — this would be permanent")}>
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground" onClick={() => toast.info("Opening audit logs...")}>
          <Crown className="size-3.5" />View Audit Logs
        </Button>
      </div>
    </div>
  )
}
