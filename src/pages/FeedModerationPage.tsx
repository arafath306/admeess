import { useState, useEffect } from "react"
import { Search, ShieldAlert, CheckCircle2, Trash2, UserX, AlertTriangle, RefreshCw, Eye, ShieldCheck, Filter } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getUser(entity: any) {
  if (!entity?.user) return null
  return Array.isArray(entity.user) ? entity.user[0] : entity.user
}

export function FeedModerationPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedReason, setSelectedReason] = useState<string>("all")

  // Inspection Modal State
  const [inspectReport, setInspectReport] = useState<any | null>(null)

  useEffect(() => {
    fetchModerationQueue()

    // ⚡ Realtime Listener for new user reports
    const channel = supabase
      .channel('reports-realtime-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.warning('⚠️ New content report submitted!', {
              description: 'A new post has been flagged for moderation.',
            })
            fetchModerationQueue()
          } else {
            fetchModerationQueue()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchModerationQueue() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reason,
          created_at,
          thread_id,
          user_id,
          reporter:profiles!reports_user_id_fkey(username, full_name, avatar_url),
          thread:threads!reports_thread_id_fkey(
            id, content, is_anonymous, likes_count, replies_count, created_at, user_id,
            author:profiles!threads_user_id_fkey(id, username, full_name, avatar_url, is_shadowbanned)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setReports(data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to fetch moderation queue')
    } finally {
      setLoading(false)
    }
  }

  // Action: Approve Post & Dismiss Report
  async function handleDismissReport(reportId: string) {
    try {
      const { error } = await supabase.from('reports').delete().eq('id', reportId)
      if (error) throw error
      toast.success('Report dismissed. Post remains active.')
      if (inspectReport?.id === reportId) setInspectReport(null)
      fetchModerationQueue()
    } catch (err: any) {
      toast.error(err.message || 'Failed to dismiss report')
    }
  }

  // Action: Delete Flagged Post & Clear Reports
  async function handleDeletePost(threadId: string, reportId: string) {
    if (!confirm('Are you sure you want to delete this reported post? It will be removed from all feeds.')) return
    try {
      const { error: postError } = await supabase.from('threads').delete().eq('id', threadId)
      if (postError) throw postError

      // Also clean up reports referencing this post
      await supabase.from('reports').delete().eq('thread_id', threadId)

      toast.success('Reported post deleted and removed from feed.')
      if (inspectReport?.id === reportId) setInspectReport(null)
      fetchModerationQueue()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  // Action: Shadowban Post Author
  async function handleToggleShadowban(userId: string, isCurrentlyShadowbanned: boolean) {
    const actionName = isCurrentlyShadowbanned ? "un-shadowban" : "shadowban"
    if (!confirm(`Are you sure you want to ${actionName} this post author?`)) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_shadowbanned: !isCurrentlyShadowbanned })
        .eq('id', userId)

      if (error) throw error
      toast.success(`Author ${isCurrentlyShadowbanned ? 'un-shadowbanned' : 'shadowbanned successfully'}`)
      fetchModerationQueue()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update author status')
    }
  }

  // Filter queue by search and reason
  const filteredReports = reports.filter((r: any) => {
    const thread = r.thread
    const reporter = getUser({ user: r.reporter })
    const author = getUser({ user: thread?.author })
    const contentText = thread?.content || ''

    const matchesSearch = !search || (
      contentText.toLowerCase().includes(search.toLowerCase()) ||
      reporter?.username?.toLowerCase().includes(search.toLowerCase()) ||
      author?.username?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase())
    )

    const matchesReason = selectedReason === 'all' || r.reason?.toLowerCase() === selectedReason.toLowerCase()

    return matchesSearch && matchesReason
  })

  // Unique report reasons
  const availableReasons = Array.from(new Set(reports.map(r => r.reason).filter(Boolean)))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Feed Moderation Queue</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review user-flagged posts, inspect reported content, and take immediate enforcement actions.
          </p>
        </div>
        <Button onClick={fetchModerationQueue} variant="outline" size="sm" className="gap-2 self-start md:self-auto">
          <RefreshCw className="size-4" /> Refresh Queue
        </Button>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-500 font-medium">Pending Reports</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-500">{reports.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Items</CardDescription>
            <CardTitle className="text-3xl font-bold">{filteredReports.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Report Categories</CardDescription>
            <CardTitle className="text-3xl font-bold">{availableReasons.length || 1}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-500 font-medium">Flagged Authors</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-500">
              {new Set(reports.map(r => r.thread?.user_id).filter(Boolean)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="py-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by post text, reporter, author, or reason..." 
              className="pl-9" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="w-[180px] gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hate_speech">Hate Speech</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="spam">Spam / Scam</SelectItem>
                <SelectItem value="nudity">Nudity / NSFW</SelectItem>
                <SelectItem value="fake_news">Misinformation</SelectItem>
                {availableReasons.map((reason: any) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Queue Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead className="w-[35%]">Reported Post Content</TableHead>
                <TableHead>Post Author</TableHead>
                <TableHead>Reported Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">Moderation Queue Clear!</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending content reports to review.</p>
                  </TableCell>
                </TableRow>
              ) : filteredReports.map((report: any) => {
                const reporter = getUser({ user: report.reporter })
                const thread = report.thread
                const author = getUser({ user: thread?.author })
                const isAuthorShadowbanned = author?.is_shadowbanned === true

                return (
                  <TableRow key={report.id} className={isAuthorShadowbanned ? "bg-amber-500/5" : ""}>
                    {/* Reason Badge */}
                    <TableCell>
                      <Badge variant="destructive" className="font-semibold gap-1 text-[11px]">
                        <AlertTriangle className="size-3" />
                        {report.reason || "Flagged Content"}
                      </Badge>
                    </TableCell>

                    {/* Reporter Info */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 border">
                          {reporter?.avatar_url && <AvatarImage src={reporter.avatar_url} />}
                          <AvatarFallback className="text-[10px]">{(reporter?.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">@{reporter?.username || 'reporter'}</span>
                      </div>
                    </TableCell>

                    {/* Post Content Preview */}
                    <TableCell>
                      <p 
                        className="text-sm cursor-pointer hover:text-rose-500 transition-colors line-clamp-2"
                        onClick={() => setInspectReport(report)}
                      >
                        {thread?.content || <span className="italic text-muted-foreground">[Media / Voice Post]</span>}
                      </p>
                    </TableCell>

                    {/* Post Author */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 border">
                          {author?.avatar_url && <AvatarImage src={author.avatar_url} />}
                          <AvatarFallback className="text-[10px]">{(author?.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">@{author?.username || 'unknown'}</span>
                          {isAuthorShadowbanned && (
                            <span className="text-[9px] text-amber-500 font-bold">Shadowbanned</span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Reported Time */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimeAgo(report.created_at)}
                    </TableCell>

                    {/* Quick 1-Click Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setInspectReport(report)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="size-3.5" /> View
                        </Button>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDismissReport(report.id)}
                          className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                        >
                          <ShieldCheck className="size-3.5" /> Approve
                        </Button>

                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => thread && handleDeletePost(thread.id, report.id)}
                          className="h-8 text-xs gap-1"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Inspection Modal */}
      <Dialog open={!!inspectReport} onOpenChange={(open) => !open && setInspectReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="size-5" /> Moderate Flagged Content
            </DialogTitle>
          </DialogHeader>

          {inspectReport && (
            <div className="flex flex-col gap-4 py-2">
              {/* Reason Summary */}
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
                <span>Reason: {inspectReport.reason || 'Content Violation'}</span>
                <span>Flagged {formatTimeAgo(inspectReport.created_at)}</span>
              </div>

              {/* Reported Content Box */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">FLAGGED POST CONTENT:</p>
                <div className="p-4 rounded-lg border bg-card text-sm leading-relaxed whitespace-pre-wrap">
                  {inspectReport.thread?.content || "[Media / Voice Post]"}
                </div>
              </div>

              {/* Author & Reporter Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded border bg-muted/30">
                  <p className="font-semibold text-muted-foreground mb-1">Post Author:</p>
                  <p className="font-bold text-sm">@{getUser({ user: inspectReport.thread?.author })?.username || 'unknown'}</p>
                </div>

                <div className="p-2.5 rounded border bg-muted/30">
                  <p className="font-semibold text-muted-foreground mb-1">Reporter:</p>
                  <p className="font-bold text-sm">@{getUser({ user: inspectReport.reporter })?.username || 'reporter'}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDismissReport(inspectReport.id)}
                  className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                >
                  <ShieldCheck className="size-4" /> Approve & Keep Post
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                  onClick={() => {
                    const authorId = inspectReport.thread?.user_id
                    if (authorId) handleToggleShadowban(authorId, getUser({ user: inspectReport.thread?.author })?.is_shadowbanned)
                  }}
                >
                  <UserX className="size-4" /> Shadowban Author
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => inspectReport.thread && handleDeletePost(inspectReport.thread.id, inspectReport.id)}
                  className="gap-1"
                >
                  <Trash2 className="size-4" /> Delete Post
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
