import { useState, useEffect } from "react"
import { CheckCircle2, Eye, MoreHorizontal, Search, Trash2, Mail, MessageSquare, LifeBuoy, Clock, User, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getUser(row: any) {
  if (!row) return null
  return Array.isArray(row.user) ? row.user[0] : row.user
}

export function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [totalCount, setTotalCount] = useState(0)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchTickets() }, [statusFilter])

  async function fetchTickets() {
    setLoading(true)
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user:profiles!user_id(username, full_name, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50)

      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.or('status.eq.pending,status.eq.open')
        } else {
          query = query.eq('status', statusFilter)
        }
      }

      const { data, count, error } = await query
      if (error) throw error
      setTickets(data || [])
      setTotalCount(count ?? 0)
    } catch (err: any) {
      console.error("Fetch support tickets error:", err)
      toast.error("Failed to fetch support tickets: " + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string) {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      toast.success('Support ticket marked as resolved!')
      if (selectedTicket?.id === id) setSelectedTicket(null)
      fetchTickets()
    } catch (err: any) {
      toast.error('Failed to resolve ticket: ' + err.message)
    }
  }

  async function handleDeleteTicket(id: string) {
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Ticket deleted successfully')
      if (selectedTicket?.id === id) setSelectedTicket(null)
      fetchTickets()
    } catch (err: any) {
      toast.error('Failed to delete ticket: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  function handleCopyEmail(email: string) {
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    toast.success("Copied email address to clipboard!")
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const filtered = search
    ? tickets.filter((t: any) => {
        const u = getUser(t)
        const q = search.toLowerCase()
        return (
          t.message?.toLowerCase().includes(q) ||
          t.subject?.toLowerCase().includes(q) ||
          t.email?.toLowerCase().includes(q) ||
          u?.username?.toLowerCase().includes(q) ||
          u?.full_name?.toLowerCase().includes(q)
        )
      })
    : tickets

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <LifeBuoy className="size-6 text-blue-500" /> Support Tickets & Help Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount.toLocaleString()} total user support inquiries • Review detailed user messages and manage resolutions
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets by message content, email, subject, or user..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending / Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Sender</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead className="min-w-[280px]">Message Snippet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-7 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No support tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t: any) => {
                  const u = getUser(t)
                  const isPending = t.status === 'pending' || t.status === 'open'

                  return (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTicket(t)}
                    >
                      {/* User Column */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 border">
                            {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                            <AvatarFallback className="text-[10px]">
                              {(u?.username || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium block">@{u?.username || 'Guest'}</span>
                            <span className="text-[11px] text-muted-foreground block">{u?.full_name}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email Column */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {t.email || 'N/A'}
                        </span>
                      </TableCell>

                      {/* Message Preview Column */}
                      <TableCell className="max-w-[320px]">
                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                          {t.message || t.subject || 'No message content'}
                        </p>
                      </TableCell>

                      {/* Status Column */}
                      <TableCell>
                        {isPending ? (
                          <Badge variant="destructive" className="text-xs bg-amber-500/10 text-amber-600 border-amber-300">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            Resolved
                          </Badge>
                        )}
                      </TableCell>

                      {/* Priority Column */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {t.priority || 'Normal'}
                        </Badge>
                      </TableCell>

                      {/* Submitted Time */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeAgo(t.created_at)}
                      </TableCell>

                      {/* Action Dropdown */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setSelectedTicket(t)}>
                              <Eye className="size-4 mr-2" /> Read Full Ticket
                            </DropdownMenuItem>

                            {isPending && (
                              <DropdownMenuItem onClick={() => handleResolve(t.id)}>
                                <CheckCircle2 className="size-4 mr-2 text-emerald-500" /> Mark Resolved
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteTicket(t.id)}
                              disabled={deletingId === t.id}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete Ticket
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Full Support Ticket Inspection Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Support Ticket Inspection</DialogTitle>
                <DialogDescription className="text-xs">
                  Full message submitted by user • Ticket ID: {selectedTicket?.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedTicket && (() => {
            const u = getUser(selectedTicket)
            const isPending = selectedTicket.status === 'pending' || selectedTicket.status === 'open'

            return (
              <div className="flex flex-col gap-4 py-2">
                {/* User & Ticket Metadata Header */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium flex items-center gap-1">
                      <User className="size-3" /> Submitted By
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="size-7 border">
                        {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {(u?.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-xs font-semibold block">@{u?.username || 'Guest'}</span>
                        <span className="text-[11px] text-muted-foreground block">{u?.full_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block font-medium flex items-center justify-end gap-1">
                      <Clock className="size-3" /> Created
                    </span>
                    <span className="text-xs font-semibold block mt-1">
                      {formatTimeAgo(selectedTicket.created_at)}
                    </span>
                    <div className="mt-1">
                      {isPending ? (
                        <Badge variant="destructive" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-300">
                          Pending Action
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-600">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Action Bar */}
                {selectedTicket.email && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                      <Mail className="size-4 text-blue-500" />
                      <span className="font-mono">{selectedTicket.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleCopyEmail(selectedTicket.email)}
                      >
                        {copiedEmail ? <Check className="size-3.5 mr-1 text-emerald-500" /> : <Copy className="size-3.5 mr-1" />}
                        {copiedEmail ? 'Copied!' : 'Copy'}
                      </Button>
                      <a
                        href={`mailto:${selectedTicket.email}?subject=Re: Support Ticket ${selectedTicket.id}`}
                        className="inline-flex items-center justify-center h-7 px-3 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Send Email Reply
                      </a>
                    </div>
                  </div>
                )}

                {/* Full Ticket Message Display Box */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <MessageSquare className="size-3.5 text-primary" /> Full Ticket Message:
                  </span>
                  <div className="p-4 rounded-xl bg-card border shadow-sm text-xs text-foreground font-sans whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                    {selectedTicket.message || selectedTicket.subject || <em className="text-muted-foreground">No message body provided</em>}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 font-medium"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    disabled={deletingId === selectedTicket.id}
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    {deletingId === selectedTicket.id ? 'Deleting...' : 'Delete Ticket'}
                  </Button>

                  {isPending ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => handleResolve(selectedTicket.id)}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" /> Mark Resolved
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                      Close
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

