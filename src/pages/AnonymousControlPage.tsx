import { useState, useEffect } from "react"
import { Search, Trash2, EyeOff, ShieldAlert, UserX, Globe, Calendar, RefreshCw, MessageSquare, Heart, Eye } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getUser(post: any) {
  if (!post.user) return null
  return Array.isArray(post.user) ? post.user[0] : post.user
}

export function AnonymousControlPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [totalCount, setTotalCount] = useState(0)
  const [selectedCountry, setSelectedCountry] = useState<string>("all")
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all")

  // Detail Modal State
  const [inspectPost, setInspectPost] = useState<any | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    fetchAnonymousPosts()

    // ⚡ Supabase Realtime Listener: Automatically updates table when new anonymous post is created
    const channel = supabase
      .channel('anonymous-threads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads',
          filter: 'is_anonymous=eq.true',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('⚡ New anonymous post created in real-time!', {
              description: payload.new.content ? payload.new.content.substring(0, 60) + '...' : 'Media post',
            })
            fetchAnonymousPosts()
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            fetchAnonymousPosts()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDateFilter])

  async function fetchAnonymousPosts() {
    setLoading(true)
    try {
      let query = supabase
        .from('threads')
        .select('id, content, is_anonymous, likes_count, replies_count, views_count, created_at, user_id, user:profiles!threads_user_id_fkey(id, username, full_name, avatar_url, country, is_shadowbanned)', { count: 'exact' })
        .eq('is_anonymous', true)
        .order('created_at', { ascending: false })

      if (selectedDateFilter === "today") {
        const todayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', todayStr)
      } else if (selectedDateFilter === "week") {
        const weekStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', weekStr)
      } else if (selectedDateFilter === "month") {
        const monthStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', monthStr)
      }

      const { data, count, error } = await query.limit(100)
      if (error) throw error

      setPosts(data || [])
      setTotalCount(count ?? 0)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to fetch anonymous posts')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePost(id: string) {
    if (!confirm("Are you sure you want to delete this anonymous post? It will be removed immediately from all feeds.")) return
    try {
      const { error } = await supabase.from('threads').delete().eq('id', id)
      if (error) throw error
      toast.success('Anonymous post deleted successfully')
      if (inspectPost?.id === id) setInspectPost(null)
      fetchAnonymousPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete post')
    }
  }

  async function handleToggleShadowban(userId: string, currentShadowbanned: boolean) {
    const actionName = currentShadowbanned ? "un-shadowban" : "shadowban"
    if (!confirm(`Are you sure you want to ${actionName} this user?`)) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_shadowbanned: !currentShadowbanned })
        .eq('id', userId)

      if (error) throw error
      toast.success(`User ${currentShadowbanned ? 'removed from shadowban' : 'shadowbanned successfully'}`)
      fetchAnonymousPosts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update shadowban status')
    }
  }

  async function handleInspectPost(post: any) {
    setInspectPost(post)
    setCommentsLoading(true)
    try {
      const { data } = await supabase
        .from('comments')
        .select('id, content, created_at, user:profiles!comments_user_id_fkey(username, full_name, avatar_url)')
        .eq('thread_id', post.id)
        .order('created_at', { ascending: false })
      setComments(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setCommentsLoading(false)
    }
  }

  // Filter posts by search query & country selection
  const filteredPosts = posts.filter((p: any) => {
    const u = getUser(p)
    const matchesSearch = !search || (
      p.content?.toLowerCase().includes(search.toLowerCase()) || 
      u?.username?.toLowerCase().includes(search.toLowerCase()) ||
      u?.full_name?.toLowerCase().includes(search.toLowerCase())
    )
    const userCountry = u?.country?.toLowerCase() || 'unknown'
    const matchesCountry = selectedCountry === 'all' || userCountry.includes(selectedCountry.toLowerCase())
    
    return matchesSearch && matchesCountry
  })

  // Extract unique countries for filter dropdown
  const availableCountries = Array.from(new Set(posts.map(p => getUser(p)?.country).filter(Boolean)))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <EyeOff className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Anonymous Posts Control Center</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time 24/7 moderation, author unmasking, country filters, and instant enforcement for anonymous content.
          </p>
        </div>
        <Button onClick={fetchAnonymousPosts} variant="outline" size="sm" className="gap-2 self-start md:self-auto">
          <RefreshCw className="size-4" /> Refresh Feed
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-indigo-500/5 border-indigo-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-indigo-400 font-medium">Total Anonymous Posts</CardDescription>
            <CardTitle className="text-3xl font-bold text-indigo-500">{totalCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Countries Represented</CardDescription>
            <CardTitle className="text-3xl font-bold">{availableCountries.length || 1}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Results</CardDescription>
            <CardTitle className="text-3xl font-bold">{filteredPosts.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-500 font-medium">Shadowbanned Authors</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-500">
              {posts.filter(p => getUser(p)?.is_shadowbanned).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Control Bar: Search & Filters */}
      <Card>
        <CardContent className="py-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search anonymous post content or unmasked username..." 
              className="pl-9" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <div className="flex gap-2">
            {/* Country Selector Filter */}
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-[180px] gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌍 All Countries</SelectItem>
                <SelectItem value="bangladesh">🇧🇩 Bangladesh</SelectItem>
                <SelectItem value="usa">🇺🇸 United States</SelectItem>
                <SelectItem value="india">🇮🇳 India</SelectItem>
                <SelectItem value="uae">🇦🇪 UAE</SelectItem>
                <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="malaysia">🇲🇾 Malaysia</SelectItem>
                {availableCountries.map((c: any) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range Selector Filter */}
            <Select value={selectedDateFilter} onValueChange={setSelectedDateFilter}>
              <SelectTrigger className="w-[160px] gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Last 24 Hours</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table View */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unmasked Author (Admin View)</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="w-[35%]">Post Content</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Posted Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )) : filteredPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No anonymous posts found matching criteria.
                  </TableCell>
                </TableRow>
              ) : filteredPosts.map((post: any) => {
                const u = getUser(post)
                const isShadowbanned = u?.is_shadowbanned === true

                return (
                  <TableRow key={post.id} className={isShadowbanned ? "bg-amber-500/5" : ""}>
                    {/* Unmasked Author Info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 border">
                          {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold">{(u?.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">@{u?.username || 'deleted_user'}</span>
                            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 text-[10px] font-semibold px-1 py-0">
                              <EyeOff className="size-3 mr-0.5" /> Anon
                            </Badge>
                            {isShadowbanned && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">Shadowbanned</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{u?.full_name || 'No Name'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Country Badge */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        📍 {u?.country || 'Unknown'}
                      </Badge>
                    </TableCell>

                    {/* Content Preview */}
                    <TableCell>
                      <p 
                        className="text-sm cursor-pointer hover:text-indigo-500 transition-colors line-clamp-2"
                        onClick={() => handleInspectPost(post)}
                      >
                        {post.content || <span className="italic text-muted-foreground">[Media/Voice Post]</span>}
                      </p>
                    </TableCell>

                    {/* Engagement Counts */}
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="size-3.5 text-rose-500" /> {post.likes_count || 0}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="size-3.5 text-blue-500" /> {post.replies_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="size-3.5" /> {post.views_count || 0}</span>
                      </div>
                    </TableCell>

                    {/* Posted Time */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimeAgo(post.created_at)}
                    </TableCell>

                    {/* Moderation Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleInspectPost(post)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="size-3.5" /> Inspect
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <ShieldAlert className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-amber-500 gap-2 cursor-pointer"
                              onClick={() => u && handleToggleShadowban(u.id, isShadowbanned)}
                            >
                              <UserX className="size-4" />
                              {isShadowbanned ? "Un-Shadowban Author" : "Shadowban Author"}
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="text-destructive gap-2 cursor-pointer font-medium"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="size-4" />
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspect & Comments Dialog Modal */}
      <Dialog open={!!inspectPost} onOpenChange={(open) => !open && setInspectPost(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="size-5 text-indigo-500" /> Anonymous Post Details
            </DialogTitle>
          </DialogHeader>

          {inspectPost && (
            <div className="flex flex-col gap-4 py-2">
              {/* Author & Country Header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    {getUser(inspectPost)?.avatar_url && <AvatarImage src={getUser(inspectPost).avatar_url} />}
                    <AvatarFallback>{(getUser(inspectPost)?.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">@{getUser(inspectPost)?.username} ({getUser(inspectPost)?.full_name})</p>
                    <p className="text-xs text-muted-foreground">Location: {getUser(inspectPost)?.country || 'Unknown'}</p>
                  </div>
                </div>
                <Badge variant="outline">Posted {formatTimeAgo(inspectPost.created_at)}</Badge>
              </div>

              {/* Full Content */}
              <div className="p-4 rounded-lg border bg-card text-sm leading-relaxed whitespace-pre-wrap">
                {inspectPost.content}
              </div>

              {/* Comment Thread */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="size-4" /> Comments ({comments.length})
                </h4>

                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {commentsLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No comments on this post yet.</p>
                  ) : (
                    comments.map((c: any) => {
                      const cu = getUser(c)
                      return (
                        <div key={c.id} className="p-2 rounded bg-muted/30 text-xs flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">@{cu?.username || 'user'}</span>
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-muted-foreground">{c.content}</p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                  onClick={() => getUser(inspectPost) && handleToggleShadowban(getUser(inspectPost).id, getUser(inspectPost)?.is_shadowbanned)}
                >
                  <UserX className="size-3.5" /> Toggle Shadowban
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => handleDeletePost(inspectPost.id)}
                >
                  <Trash2 className="size-3.5" /> Delete Post
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
