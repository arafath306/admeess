import { useState, useEffect } from "react"
import { Shield, Plus, Copy, Check, Trash, ShieldAlert, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { PageId } from "@/contexts/NavigationContext"

const AVAILABLE_PERMISSIONS: { id: PageId; label: string; desc: string }[] = [
  { id: "dashboard", label: "Dashboard", desc: "Overview cards and activity graphs" },
  { id: "analytics", label: "Analytics", desc: "Detailed statistics and retention tracking" },
  { id: "users", label: "Users Management", desc: "View and edit user profile details" },
  { id: "user-access", label: "Live User Tracker", desc: "Real-time presence monitoring" },
  { id: "communities", label: "Communities", desc: "Topic groups and member counts" },
  { id: "posts", label: "Posts", desc: "Manage posts/threads in the system" },
  { id: "comments", label: "Comments", desc: "Moderation of nested replies and comment logs" },
  { id: "messages", label: "Messages (DMs)", desc: "Track conversation logs and active chats" },
  { id: "reports", label: "Reports Queue", desc: "Review user reports for threads & comments" },
  { id: "moderation-queue", label: "Moderation Queue", desc: "Detailed feed moderation screen" },
  { id: "verification", label: "Verification Requests", desc: "Approve or deny Blue Verified badges" },
  { id: "chat-moderation", label: "Chat Moderation", desc: "System chat logs and E2EE tracking" },
  { id: "ai-moderation", label: "AI Moderation", desc: "AI-based filter settings and thresholds" },
  { id: "monetization", label: "Monetization", desc: "Configure store items and products" },
  { id: "ads", label: "Ads", desc: "Manage system advertisement banners" },
  { id: "payments", label: "Payments", desc: "Transaction logs and payout checks" },
  { id: "notifications", label: "Notifications", desc: "Broadcast push notifications to all users" },
  { id: "storage", label: "Storage & Buckets", desc: "Media files upload size and bucket configs" },
  { id: "feature-flags", label: "Feature Flags", desc: "Enable or disable parts of mobile app dynamically" },
  { id: "api", label: "API & Developer", desc: "API configurations and tokens" },
  { id: "audit-logs", label: "Audit Logs", desc: "View admin audit trails and logs" },
  { id: "support", label: "Support Tickets", desc: "Reply and close user helpdesk queries" },
  { id: "system-status", label: "System Status", desc: "Database health, CPU & API response times" },
  { id: "settings", label: "System Settings", desc: "Admin configuration, sign-up control, global blocks" },
]

export function ModeratorManagementPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [selectedPerms, setSelectedPerms] = useState<PageId[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("moderator_keys")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load moderator keys")
      console.error(error)
    } else {
      setKeys(data || [])
    }
    setLoading(false)
  }

  const generateCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let part1 = ""
    let part2 = ""
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length))
      part2 += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `MOD-${part1}-${part2}`
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPerms.length === 0) {
      toast.warning("Please select at least one permission")
      return
    }

    const newCode = generateCode()
    const { error } = await supabase.from("moderator_keys").insert({
      code: newCode,
      permissions: selectedPerms,
      description: description.trim() || null,
      is_active: true,
    })

    if (error) {
      toast.error("Failed to generate moderator key")
      console.error(error)
    } else {
      toast.success(`Access code ${newCode} generated successfully!`)
      setDialogOpen(false)
      setDescription("")
      setSelectedPerms([])
      fetchKeys()
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("moderator_keys")
      .update({ is_active: !currentStatus })
      .eq("id", id)

    if (error) {
      toast.error("Failed to update status")
      console.error(error)
    } else {
      toast.success(`Key ${currentStatus ? "deactivated" : "activated"} successfully`)
      setKeys(prev =>
        prev.map(k => (k.id === id ? { ...k, is_active: !currentStatus } : k))
      )
    }
  }

  const handleDeleteKey = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to permanently delete code ${code}?`)) return

    const { error } = await supabase.from("moderator_keys").delete().eq("id", id)

    if (error) {
      toast.error("Failed to delete key")
      console.error(error)
    } else {
      toast.success(`Key ${code} deleted`)
      setKeys(prev => prev.filter(k => k.id !== id))
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedKey(code)
    toast.success("Code copied to clipboard")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleTogglePermission = (permId: PageId) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moderator Key Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage access codes for custom-scoped moderator access
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              New Permission Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Generate Access Key</DialogTitle>
              <DialogDescription>
                Assign specific dashboard permissions. Pressing generate will create a code.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateKey} className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <Input
                  placeholder="e.g. Content Reviewer, support-staff-01..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0 border rounded-lg">
                <div className="bg-muted/40 p-2 text-xs font-semibold text-muted-foreground uppercase border-b tracking-wider">
                  Select Scope Permissions ({selectedPerms.length} chosen)
                </div>
                <div className="flex-1 overflow-y-auto divide-y">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <div
                      key={perm.id}
                      className="p-3 flex items-start gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleTogglePermission(perm.id)}
                    >
                      <Checkbox
                        checked={selectedPerms.includes(perm.id)}
                        onCheckedChange={() => handleTogglePermission(perm.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <span className="font-medium text-sm">{perm.label}</span>
                        <span className="text-xs text-muted-foreground">{perm.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={selectedPerms.length === 0}>
                  Generate Code
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-primary" /> Active Access Codes
          </CardTitle>
          <CardDescription>
            Moderators can use these codes in the login page to access assigned subsets of features
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading access keys...</div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <ShieldAlert className="size-8 text-yellow-500" />
              <div>No custom access keys found. Generate one to delegate access.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Access Code</TableHead>
                  <TableHead className="w-[200px]">Description</TableHead>
                  <TableHead>Permissions / Scope</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(key => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <span>{key.code}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => handleCopy(key.code)}
                        >
                          {copiedKey === key.code ? (
                            <Check className="size-3.5 text-green-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {key.description || <span className="text-muted-foreground italic">No desc</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.map((p: string) => {
                          const permInfo = AVAILABLE_PERMISSIONS.find(item => item.id === p)
                          return (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {permInfo?.label || p}
                            </Badge>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={() => handleToggleActive(key.id, key.is_active)}
                        />
                        <span className={`text-xs ${key.is_active ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
                          {key.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteKey(key.id, key.code)}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 border rounded-lg bg-blue-500/5 border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
        <Info className="size-4 shrink-0" />
        <span>
          <strong>Security Note:</strong> Moderators do not need a password. They enter the generated code on the login screen to sign in. To revoke their access instantly, toggle their switch to "Inactive" or delete the key.
        </span>
      </div>
    </div>
  )
}
