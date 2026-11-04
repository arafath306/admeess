import { useState } from "react"
import {
  AlertTriangle, Ban, CheckCircle, FileText,
  MessageSquare, Plus, Send, ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminNotes, caseHistory } from "./data"

const actionCategories = [
  { value: "warning", label: "Issue Warning", color: "text-amber-600" },
  { value: "restrict", label: "Restrict Account", color: "text-orange-600" },
  { value: "suspend_1d", label: "Suspend 1 Day", color: "text-red-500" },
  { value: "suspend_7d", label: "Suspend 7 Days", color: "text-red-600" },
  { value: "ban", label: "Permanent Ban", color: "text-red-700" },
  { value: "content_remove", label: "Remove Content", color: "text-slate-600" },
  { value: "clear", label: "Clear Violations", color: "text-emerald-600" },
]

export function RightPanel() {
  const [note, setNote] = useState("")
  const [selectedAction, setSelectedAction] = useState("")
  const [notes, setNotes] = useState(adminNotes)
  const [reason, setReason] = useState("")

  const handleAddNote = () => {
    if (!note.trim()) return
    setNotes([{ id: Date.now(), author: "super_admin", text: note, date: "Just now" }, ...notes])
    setNote("")
    toast.success("Note added to case file")
  }

  const handleAction = () => {
    if (!selectedAction) return
    const action = actionCategories.find((a) => a.value === selectedAction)
    toast.success(`Action applied: ${action?.label}`)
    setSelectedAction("")
    setReason("")
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Quick moderation actions */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Moderation</p>

          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {actionCategories.map((a) => (
                <SelectItem key={a.value} value={a.value} className={cn("text-xs", a.color)}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAction && (
            <div className="space-y-1.5">
              <Textarea
                placeholder="Reason for action (required for audit log)..."
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs resize-none"
              />
              <Button size="sm" className="w-full h-7 text-xs gap-1.5 bg-destructive hover:bg-destructive/90" onClick={handleAction}>
                <ShieldAlert className="size-3" />Apply Action
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-amber-600 border-amber-200 dark:border-amber-900 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => toast.warning("Warning issued")}>
              <AlertTriangle className="size-3" />Warn
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-orange-600 border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-950" onClick={() => toast.warning("Account restricted")}>
              <Ban className="size-3" />Restrict
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={() => toast.success("Violations cleared")}>
              <CheckCircle className="size-3" />Clear
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.info("Opening messages...")}>
              <MessageSquare className="size-3" />Message
            </Button>
          </div>
        </div>

        <Separator />

        {/* Admin notes */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes</p>

          <div className="space-y-1.5">
            <Textarea
              placeholder="Add internal note (visible to admins only)..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs resize-none"
            />
            <Button size="sm" className="w-full h-7 text-xs gap-1.5" disabled={!note.trim()} onClick={handleAddNote}>
              <Send className="size-3" />Add Note
            </Button>
          </div>

          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-4">
                      <AvatarFallback className="text-[8px]">{n.author[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium">{n.author}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{n.date}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Case history */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Case History</p>
          <div className="space-y-2">
            {caseHistory.map((c) => (
              <div key={c.id} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card">
                <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-medium truncate">{c.summary}</p>
                    <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1 shrink-0",
                      c.status === "resolved" ? "text-emerald-600 border-emerald-300" : "text-slate-600"
                    )}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{c.id} · {c.date}</p>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1.5 text-muted-foreground" onClick={() => toast.info("Opening full case history...")}>
              <Plus className="size-3" />Open Full History
            </Button>
          </div>
        </div>

        <Separator />

        {/* Recent warnings */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Warnings</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle className="size-4 text-emerald-500 shrink-0" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">No warnings — account in good standing</p>
          </div>
        </div>

        <Separator />

        {/* Recent reports */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Reports</p>
          <div className="space-y-1.5">
            {[
              { type: "Spam", reporter: "@user_84291", status: "resolved", date: "Jan 2" },
              { type: "Misinformation", reporter: "@user_28491", status: "resolved", date: "Dec 20" },
              { type: "Copyright", reporter: "@photo_corp", status: "dismissed", date: "Nov 15" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border">
                <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">{r.type}</p>
                  <p className="text-[10px] text-muted-foreground">{r.reporter} · {r.date}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-emerald-600 border-emerald-300 dark:border-emerald-800 shrink-0">
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Enforcement */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enforcement Actions</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle className="size-4 text-emerald-500 shrink-0" />
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">No active enforcement actions</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
