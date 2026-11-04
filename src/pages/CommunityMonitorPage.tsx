import { useState, useEffect } from "react"
import { useNavigation } from "@/contexts/NavigationContext"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"
import { 
  ArrowLeft, Shield, Users, Activity, Trash2, Edit, Save, 
  Lock, Globe, AlertTriangle, Search, CheckCircle2,
  Ban, ShieldAlert, ArrowUpRight
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function CommunityMonitorPage() {
  const { navigate, targetUserId } = useNavigation() // targetUserId holds community ID here
  const communityId = targetUserId
  
  const [community, setCommunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Tab states
  const [members, setMembers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any[]>([])
  
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', privacy: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!communityId) {
      navigate("communities")
      return
    }
    fetchCommunity()
  }, [communityId])

  useEffect(() => {
    if (community) {
      fetchAnalytics()
      fetchMembers()
      fetchPosts()
    }
  }, [community])

  async function fetchCommunity() {
    setLoading(true)
    const { data, error } = await supabase
      .from('communities')
      .select('*, owner:profiles!communities_owner_id_fkey(username, avatar_url)')
      .eq('id', communityId)
      .single()
      
    if (error) {
      toast.error("Failed to load community")
      navigate("communities")
    } else {
      setCommunity(data)
      setEditForm({
        name: data.name,
        description: data.description || '',
        privacy: data.privacy || 'public'
      })
    }
    setLoading(false)
  }

  async function fetchAnalytics() {
    setLoadingAnalytics(true)
    // Fetch last 30 days of posts for this community
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data, error } = await supabase
      .from('threads')
      .select('created_at')
      .eq('community_id', communityId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      
    if (!error && data) {
      // Group by day
      const counts: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        counts[d.toISOString().split('T')[0]] = 0
      }
      
      data.forEach(p => {
        const date = p.created_at.split('T')[0]
        if (counts[date] !== undefined) counts[date]++
      })
      
      const chartData = Object.keys(counts).map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        posts: counts[date]
      }))
      
      setAnalyticsData(chartData)
    }
    setLoadingAnalytics(false)
  }

  async function fetchMembers() {
    setLoadingMembers(true)
    const { data, error } = await supabase
      .from('community_members')
      .select('*, user:profiles(id, username, full_name, avatar_url, is_verified)')
      .eq('community_id', communityId)
      .order('role', { ascending: false }) // admin -> moderator -> member
      
    if (!error && data) setMembers(data)
    setLoadingMembers(false)
  }

  async function fetchPosts() {
    setLoadingPosts(true)
    const { data, error } = await supabase
      .from('threads')
      .select('*, author:profiles(id, username, avatar_url)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(50)
      
    if (!error && data) setPosts(data)
    setLoadingPosts(false)
  }

  // Actions
  async function handleSaveSettings() {
    setSavingSettings(true)
    const { error } = await supabase
      .from('communities')
      .update(editForm)
      .eq('id', communityId)
      
    if (error) toast.error("Failed to update settings")
    else {
      toast.success("Community updated successfully")
      setCommunity({ ...community, ...editForm })
      setIsEditing(false)
    }
    setSavingSettings(false)
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return
    const { error } = await supabase.from('threads').delete().eq('id', postId)
    if (error) toast.error("Failed to delete post")
    else {
      toast.success("Post deleted")
      setPosts(posts.filter(p => p.id !== postId))
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    const { error } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('id', memberId)
      
    if (error) toast.error("Failed to update role")
    else {
      toast.success("Role updated")
      fetchMembers()
    }
  }

  async function handleKickMember(memberId: string, username: string) {
    if (!confirm(`Are you sure you want to kick @${username} from this community?`)) return
    const { error } = await supabase.from('community_members').delete().eq('id', memberId)
    if (error) toast.error("Failed to kick member")
    else {
      toast.success(`@${username} has been removed`)
      fetchMembers()
    }
  }

  if (loading || !community) {
    return <div className="p-6"><Skeleton className="h-[200px] w-full" /></div>
  }

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("communities")} className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="size-14 border shadow-sm rounded-lg">
                <AvatarFallback className="text-xl rounded-lg bg-primary/10 text-primary">
                  <Users className="size-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{community.name}</h1>
                  <Badge variant={community.privacy === 'public' ? 'secondary' : 'outline'} className="capitalize flex items-center gap-1">
                    {community.privacy === 'public' ? <Globe className="size-3" /> : <Lock className="size-3" />}
                    {community.privacy}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">Created {formatTimeAgo(community.created_at)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
               {isEditing ? <ArrowLeft className="size-4 mr-2" /> : <Edit className="size-4 mr-2" />}
               {isEditing ? "Cancel Edit" : "Edit Settings"}
             </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3 mb-6">
            <TabsTrigger value="overview"><Activity className="size-4 mr-2"/> Overview & Settings</TabsTrigger>
            <TabsTrigger value="members"><Users className="size-4 mr-2"/> Members ({community.member_count})</TabsTrigger>
            <TabsTrigger value="feed"><Activity className="size-4 mr-2"/> Community Feed</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & SETTINGS */}
          <TabsContent value="overview" className="flex-1 overflow-auto m-0">
            <div className="grid lg:grid-cols-3 gap-6 max-w-6xl pb-10">
              {/* Left Column: Edit Form or Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Community Information</CardTitle>
                    <CardDescription>View or manage the community's core details and rules.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Community Name</label>
                          <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Privacy Settings</label>
                          <Select value={editForm.privacy} onValueChange={v => setEditForm({...editForm, privacy: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public (Anyone can view and join)</SelectItem>
                              <SelectItem value="restricted">Restricted (Anyone can view, approval to join)</SelectItem>
                              <SelectItem value="private">Private (Invite only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} />
                        </div>
                        <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
                          {savingSettings ? "Saving..." : <><Save className="size-4 mr-2" /> Save Changes</>}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in fade-in">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                          <p className="text-sm">{community.description || <span className="italic text-muted-foreground">No description provided.</span>}</p>
                        </div>
                        <div className="flex items-center gap-3 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">Created by</span>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6"><AvatarImage src={community.owner?.avatar_url} /><AvatarFallback>?</AvatarFallback></Avatar>
                            <span className="text-sm font-medium">@{community.owner?.username || 'unknown'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Analytics */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      Activity (30d) <ArrowUpRight className="size-4 text-emerald-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAnalytics ? <Skeleton className="h-[200px] w-full" /> : (
                      <div className="h-[200px] w-full mt-4 -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                              itemStyle={{ color: 'hsl(var(--primary))' }}
                            />
                            <Line type="monotone" dataKey="posts" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-destructive/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-destructive flex items-center gap-2"><AlertTriangle className="size-4" /> Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">Deleting this community will remove all associated posts, members, and data permanently.</p>
                    <Button variant="destructive" className="w-full" onClick={() => alert("Requires Super Admin confirmation.")}>Delete Community</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: MEMBERS */}
          <TabsContent value="members" className="flex-1 overflow-auto m-0">
             <div className="max-w-4xl pb-10">
               <Card>
                 <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                   <div className="relative w-64">
                     <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                     <Input placeholder="Search members..." className="pl-9 bg-background" />
                   </div>
                   <Badge variant="outline">{members.length} Total Members</Badge>
                 </div>
                 <ScrollArea className="h-[500px]">
                   {loadingMembers ? <div className="p-4"><Skeleton className="h-20 w-full" /></div> : members.length === 0 ? (
                     <div className="p-12 text-center text-muted-foreground">No members found</div>
                   ) : members.map(m => {
                     const u = Array.isArray(m.user) ? m.user[0] : m.user;
                     if (!u) return null;
                     return (
                       <div key={m.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                         <div className="flex items-center gap-4">
                           <Avatar className="size-10 cursor-pointer" onClick={() => navigate("user-monitor", u.id)}>
                             <AvatarImage src={u.avatar_url} />
                             <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                           </Avatar>
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="font-medium hover:underline cursor-pointer" onClick={() => navigate("user-monitor", u.id)}>@{u.username}</span>
                               {u.is_verified && <CheckCircle2 className="size-3.5 text-blue-500" />}
                               {m.role === 'admin' && <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] h-5 px-1.5 border-0"><ShieldAlert className="size-3 mr-1"/> Admin</Badge>}
                               {m.role === 'moderator' && <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-[10px] h-5 px-1.5 border-0"><Shield className="size-3 mr-1"/> Mod</Badge>}
                             </div>
                             <p className="text-xs text-muted-foreground">Joined {formatTimeAgo(m.joined_at)}</p>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <Select value={m.role} onValueChange={(v) => handleChangeRole(m.id, v)}>
                             <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="member">Member</SelectItem>
                               <SelectItem value="moderator">Moderator</SelectItem>
                               <SelectItem value="admin">Admin</SelectItem>
                             </SelectContent>
                           </Select>
                           <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleKickMember(m.id, u.username)}>
                             <Ban className="size-4" />
                           </Button>
                         </div>
                       </div>
                     )
                   })}
                 </ScrollArea>
               </Card>
             </div>
          </TabsContent>

          {/* TAB 3: FEED */}
          <TabsContent value="feed" className="flex-1 overflow-auto m-0">
             <div className="max-w-3xl space-y-4 pb-10">
                {loadingPosts ? <Skeleton className="h-40 w-full" /> : posts.length === 0 ? (
                  <div className="text-center p-12 bg-background border rounded-xl"><p className="text-muted-foreground">No posts in this community yet.</p></div>
                ) : posts.map(post => {
                  const author = Array.isArray(post.author) ? post.author[0] : post.author
                  return (
                    <Card key={post.id} className="overflow-hidden border group">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-10 cursor-pointer" onClick={() => navigate("user-monitor", author?.id)}>
                              <AvatarImage src={author?.avatar_url} />
                              <AvatarFallback>{author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium hover:underline cursor-pointer" onClick={() => navigate("user-monitor", author?.id)}>@{author?.username || 'unknown'}</p>
                              <p className="text-xs text-muted-foreground">{formatTimeAgo(post.created_at)}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="size-3.5 mr-2" /> Delete Post
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {post.media_urls.map((url: string, i: number) => (
                                <img key={i} src={url} alt="Post media" className="rounded-md border bg-muted object-cover h-40 w-full" />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 pt-3 mt-3 border-t text-xs text-muted-foreground font-medium">
                             <span>{post.likes_count || 0} Likes</span>
                             <span>{post.comments_count || 0} Comments</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
