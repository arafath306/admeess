import { useState, useEffect } from "react"
import { CheckCircle2, Eye, MoreHorizontal, Search, XCircle, Flag, Trash2, AlertTriangle, ExternalLink } from "lucide-react"
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

function getThread(row: any) {
  if (!row) return null
  return Array.isArray(row.thread) ? row.thread[0] : row.thread
}

export function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [totalCount, setTotalCount] = useState(0)
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchReports() }, [statusFilter])

  async function fetchReports() {
    setLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select(`
          id, reason, status, action_taken, created_at, thread_id, comment_id, user_id,
          user:profiles!user_id(username, full_name, avatar_url),
          thread:threads!thread_id(
            id, content, created_at, image_urls, video_url,
            user:profiles!user_id(username, full_name, avatar_url)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, count, error } = await query
      if (error) throw error
      setReports(data || [])
      setTotalCount(count ?? 0)
    } catch (err: any) {
      console.error("Fetch reports error:", err)
      toast.error("Failed to fetch reports: " + (err.message || 'Error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePostAndResolve(reportId: string, threadId: string) {
    if (!threadId) {
      toast.error("No post ID associated with this report")
      return
    }

    setDeletingId(reportId)
    try {
      // 1. Delete the post from threads table
      const { error: deleteErr } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId)

      if (deleteErr) throw deleteErr

      // 2. Mark report as resolved with action_taken
      const { error: reportErr } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          action_taken: 'Reported post deleted by admin'
        })
        .eq('id', reportId)

      if (reportErr) throw reportErr

      toast.success('Reported post deleted & report resolved successfully!')
      if (selectedReport?.id === reportId) setSelectedReport(null)
      fetchReports()
    } catch (err: any) {
      console.error("Delete post error:", err)
      toast.error("Failed to delete post: " + (err.message || 'Error'))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleResolve(id: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved', action_taken: 'Reviewed and resolved by admin' })
        .eq('id', id)

      if (error) throw error
      toast.success('Report resolved')
      if (selectedReport?.id === id) setSelectedReport(null)
      fetchReports()
    } catch (err: any) {
      toast.error('Failed to resolve report: ' + err.message)
    }
  }

  async function handleDismiss(id: string) {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved', action_taken: 'Dismissed (no violation)' })
        .eq('id', id)

      if (error) throw error
      toast.success('Report dismissed')
      if (selectedReport?.id === id) setSelectedReport(null)
      fetchReports()
    } catch (err: any) {
      toast.error('Failed to dismiss report: ' + err.message)
    }
  }

  const filtered = search
    ? reports.filter((r: any) => {
        const u = getUser(r)
        const t = getThread(r)
        const postUser = getUser(t)
        const q = search.toLowerCase()

        return (
          r.reason?.toLowerCase().includes(q) ||
          u?.username?.toLowerCase().includes(q) ||
          t?.content?.toLowerCase().includes(q) ||
          postUser?.username?.toLowerCase().includes(q)
        )
      })
    : reports

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Flag className="size-6 text-red-500" /> Content Reports & Moderation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount.toLocaleString()} total user reports submitted • Review reported posts and take instant deletion actions
        </p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by reason, reporter, post text, or author..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
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
                <TableHead>Reporter</TableHead>
                <TableHead>Report Reason</TableHead>
                <TableHead className="min-w-[280px]">Reported Post Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action Taken</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No content reports found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r: any) => {
                  const reporter = getUser(r)
                  const thread = getThread(r)
                  const postAuthor = getUser(thread)
                  const isPending = r.status === 'pending'

                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedReport(r)}
                    >
                      {/* Reporter Column */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 border">
                            {reporter?.avatar_url && <AvatarImage src={reporter.avatar_url} />}
                            <AvatarFallback className="text-[10px]">
                              {(reporter?.username || '?').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium block">@{reporter?.username || 'deleted'}</span>
                            <span className="text-[11px] text-muted-foreground block">{reporter?.full_name}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Reason Column */}
                      <TableCell className="max-w-[200px]">
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs font-semibold mb-1 block w-max">
                          <AlertTriangle className="size-3 mr-1 inline" /> Violation
                        </Badge>
                        <p className="text-xs text-foreground font-medium line-clamp-2">{r.reason}</p>
                      </TableCell>

                      {/* Reported Post Content Preview Column */}
                      <TableCell className="max-w-[340px]">
                        {thread ? (
                          <div className="p-2.5 rounded-lg bg-muted/60 border space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-primary">
                                Post by @{postAuthor?.username || 'unknown'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimeAgo(thread.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                              {thread.content || <em className="text-muted-foreground">(Media Post)</em>}
                            </p>
                          </div>
                        ) : r.thread_id ? (
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500">
                            <Trash2 className="size-3 mr-1" /> Post Already Deleted
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Comment / Direct Report</span>
                        )}
                      </TableCell>

                      {/* Status Column */}
                      <TableCell>
                        {isPending ? (
                          <Badge variant="destructive" className="text-xs">Pending Review</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            Resolved
                          </Badge>
                        )}
                      </TableCell>

                      {/* Action Taken */}
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {r.action_taken || '—'}
                      </TableCell>

                      {/* Reported Time */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeAgo(r.created_at)}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setSelectedReport(r)}>
                              <Eye className="size-4 mr-2" /> View Details & Post
                            </DropdownMenuItem>

                            {thread && isPending && (
                              <DropdownMenuItem
                                className="text-destructive font-medium"
                                onClick={() => handleDeletePostAndResolve(r.id, r.thread_id)}
                                disabled={deletingId === r.id}
                              >
                                <Trash2 className="size-4 mr-2 text-red-500" />
                                {deletingId === r.id ? 'Deleting...' : 'Delete Post & Resolve'}
                              </DropdownMenuItem>
                            )}

                            {isPending && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleResolve(r.id)}>
                                  <CheckCircle2 className="size-4 mr-2 text-emerald-500" /> Resolve Report
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismiss(r.id)}>
                                  <XCircle className="size-4 mr-2" /> Dismiss
                                </DropdownMenuItem>
                              </>
                            )}
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

      {/* Full Report & Reported Post Inspection Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                <Flag className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Report & Post Moderation</DialogTitle>
                <DialogDescription className="text-xs">
                  Inspect reported content and take direct administrative action
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedReport && (() => {
            const reporter = getUser(selectedReport)
            const thread = getThread(selectedReport)
            const postAuthor = getUser(thread)

            return (
              <div className="flex flex-col gap-4 py-2">
                {/* Header Meta Card */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Reporter User</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="size-6">
                        {reporter?.avatar_url && <AvatarImage src={reporter.avatar_url} />}
                        <AvatarFallback className="text-[10px]">
                          {(reporter?.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">@{reporter?.username || 'deleted'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block font-medium">Report Status</span>
                    <div className="mt-1">
                      {selectedReport.status === 'pending' ? (
                        <Badge variant="destructive" className="text-xs">Pending Action</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">Resolved</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason Box */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertTriangle className="size-3.5" /> Report Reason / User Complaint:
                  </span>
                  <div className="p-3.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedReport.reason}
                  </div>
                </div>

                {/* Reported Post Card */}
                <div className="space-y-1.5 pt-2 border-t">
                  <span className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Reported Post Content:</span>
                    {thread && (
                      <span className="text-[11px] text-muted-foreground font-normal">
                        Post ID: {thread.id}
                      </span>
                    )}
                  </span>

                  {thread ? (
                    <div className="p-4 rounded-xl bg-card border shadow-sm space-y-3">
                      {/* Post Author Bar */}
                      <div className="flex items-center gap-2.5 pb-2 border-b">
                        <Avatar className="size-8 border">
                          {postAuthor?.avatar_url && <AvatarImage src={postAuthor.avatar_url} />}
                          <AvatarFallback className="text-xs">
                            {(postAuthor?.username || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {postAuthor?.full_name || 'Post Author'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            @{postAuthor?.username || 'unknown'} • Posted {formatTimeAgo(thread.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Post Content Text */}
                      <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {thread.content || <em className="text-muted-foreground">No text content</em>}
                      </div>

                      {/* Post Media URLs if present */}
                      {((thread.image_urls && thread.image_urls.length > 0) || thread.video_url) && (
                        <div className="pt-2 border-t space-y-2">
                          {thread.image_urls && thread.image_urls.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {thread.image_urls.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block relative group">
                                  <img src={url} alt="Reported Media" className="size-16 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                          {thread.video_url && (
                            <a href={thread.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1 font-medium">
                              <ExternalLink className="size-3" /> Play Reported Video
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/40 border text-center text-xs text-muted-foreground">
                      This reported post has already been deleted from the database.
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
                  {thread && selectedReport.status === 'pending' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white font-medium"
                      onClick={() => handleDeletePostAndResolve(selectedReport.id, selectedReport.thread_id)}
                      disabled={deletingId === selectedReport.id}
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      {deletingId === selectedReport.id ? 'Deleting Post...' : 'Delete Post & Resolve'}
                    </Button>
                  )}

                  {selectedReport.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDismiss(selectedReport.id)}>
                        <XCircle className="size-4 mr-1.5" /> Dismiss
                      </Button>
                      <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleResolve(selectedReport.id)}>
                        <CheckCircle2 className="size-4 mr-1.5" /> Resolve Only
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
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

