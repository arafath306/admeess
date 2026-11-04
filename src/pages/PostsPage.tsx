import { useState, useEffect, useRef } from "react";
import {
  MoreHorizontal, Search, Trash2, Pencil, EyeOff, Eye,
  Pin, PinOff, Flag, RefreshCw, ChevronLeft, ChevronRight,
  X, Video, BarChart3, Heart, MessageSquare, Repeat2,
  BookmarkIcon, Share2, TrendingUp, AlertTriangle, Lock,
  Unlock, SortAsc, SortDesc, Download, Copy, Zap, Globe
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { formatTimeAgo } from "@/hooks/use-supabase";

const PAGE_SIZE = 25;
type SortKey = "created_at" | "likes_count" | "views_count" | "replies_count" | "spam_score";
type FilterTab = "all" | "pinned" | "anonymous" | "boosted" | "subscriber_only" | "with_media";

function getUser(post: any) {
  if (!post.user) return null;
  return Array.isArray(post.user) ? post.user[0] : post.user;
}

function formatCount(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function getSpamBadge(score: number) {
  if (!score || score < 0.3) return null;
  if (score < 0.6)
    return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">Spam Risk</Badge>;
  return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">High Spam</Badge>;
}

export function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [viewingPost, setViewingPost] = useState<any | null>(null);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [boostingPost, setBoostingPost] = useState<any | null>(null);
  const [boostBudget, setBoostBudget] = useState("100");
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 400);
  }, [search]);

  useEffect(() => { fetchPosts(); }, [page, sortKey, sortAsc, filterTab, debouncedSearch]);

  async function fetchPosts() {
    setLoading(true); setSelectedIds(new Set());
    try {
      let query = supabase
        .from("threads")
        .select(
          "id, content, image_urls, video_url, audio_url, likes_count, replies_count, reposts_count, saves_count, shares_count, views_count, is_pinned, is_anonymous, is_boosted, boost_status, boost_spend, is_subscriber_only, spam_score, category, audience, created_at, user:profiles!threads_user_id_fkey(id, username, full_name, avatar_url, is_verified, is_suspended)",
          { count: "exact" }
        )
        .order(sortKey, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (filterTab === "pinned") query = query.eq("is_pinned", true);
      else if (filterTab === "anonymous") query = query.eq("is_anonymous", true);
      else if (filterTab === "boosted") query = query.eq("is_boosted", true);
      else if (filterTab === "subscriber_only") query = query.eq("is_subscriber_only", true);
      else if (filterTab === "with_media") query = query.not("image_urls", "is", null);
      if (debouncedSearch) query = query.ilike("content", "%" + debouncedSearch + "%");
      const { data, count, error } = await query;
      if (error) throw error;
      setPosts(data || []); setTotalCount(count ?? 0);
    } catch (err) { console.error(err); toast.error("Failed to load posts"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("threads").delete().eq("id", id);
    if (!error) { toast.success("Post deleted"); setConfirmDelete(null); fetchPosts(); }
    else toast.error("Failed to delete");
  }
  async function handleTogglePin(post: any) {
    const { error } = await supabase.from("threads").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
    if (!error) { toast.success(post.is_pinned ? "Post unpinned" : "Post pinned"); fetchPosts(); }
  }
  async function handleToggleSubscriberOnly(post: any) {
    const { error } = await supabase.from("threads").update({ is_subscriber_only: !post.is_subscriber_only }).eq("id", post.id);
    if (!error) { toast.success(post.is_subscriber_only ? "Made public" : "Restricted to subscribers"); fetchPosts(); }
  }
  async function handleHideFromProfile(post: any) {
    const { error } = await supabase.from("threads").update({ hide_from_profile: true }).eq("id", post.id);
    if (!error) toast.success("Hidden from profile");
  }
  async function handleClearSpamScore(post: any) {
    const { error } = await supabase.from("threads").update({ spam_score: 0 }).eq("id", post.id);
    if (!error) { toast.success("Spam score cleared"); fetchPosts(); }
  }
  async function handleBoostPost() {
    if (!boostingPost) return;
    const { error } = await supabase.from("threads")
      .update({ is_boosted: true, boost_status: "active", boost_spend: parseFloat(boostBudget) })
      .eq("id", boostingPost.id);
    if (!error) { toast.success("Post boosted!"); setBoostingPost(null); fetchPosts(); }
    else toast.error("Failed to boost");
  }
  async function handleRemoveBoost(post: any) {
    const { error } = await supabase.from("threads").update({ is_boosted: false, boost_status: null }).eq("id", post.id);
    if (!error) { toast.success("Boost removed"); fetchPosts(); }
  }
  async function handleSaveEdit() {
    if (!editingPost) return; setIsSaving(true);
    try {
      const { error } = await supabase.from("threads").update({ content: editContent }).eq("id", editingPost.id);
      if (error) throw error;
      toast.success("Post updated"); setEditingPost(null); fetchPosts();
    } catch (err: any) { toast.error(err.message || "Failed to update"); }
    finally { setIsSaving(false); }
  }
  async function handleCreateReport(post: any) {
    const { error } = await supabase.from("reports").insert({ thread_id: post.id, reason: "admin_flagged", status: "pending" });
    if (!error) toast.success("Flagged for review"); else toast.error("Failed to flag");
  }
  async function handleBulkDelete() {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("threads").delete().in("id", ids);
    if (!error) { toast.success(ids.length + " posts deleted"); setSelectedIds(new Set()); setConfirmBulkDelete(false); fetchPosts(); }
    else toast.error("Bulk delete failed");
    setBulkLoading(false);
  }
  async function handleBulkPin(pin: boolean) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("threads").update({ is_pinned: pin }).in("id", ids);
    if (!error) { toast.success(ids.length + " posts " + (pin ? "pinned" : "unpinned")); setSelectedIds(new Set()); fetchPosts(); }
    setBulkLoading(false);
  }
  async function handleBulkLock(val: boolean) {
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("threads").update({ is_subscriber_only: val }).in("id", ids);
    if (!error) { toast.success(ids.length + " posts updated"); setSelectedIds(new Set()); fetchPosts(); }
    setBulkLoading(false);
  }
  function handleExportSelected() {
    const selected = posts.filter(p => selectedIds.has(p.id));
    const rows = [["id","author","content","likes","views","replies","reposts","saves","created_at"]];
    selected.forEach(p => {
      const u = getUser(p);
      rows.push([p.id, u?.username||"", (p.content||"").replace(/,/g,";"), String(p.likes_count), String(p.views_count), String(p.replies_count), String(p.reposts_count), String(p.saves_count), p.created_at]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv],{type:"text/csv"})), download: "posts_export.csv" });
    a.click(); toast.success("Exported " + selected.length + " posts");
  }

  const allSelected = posts.length > 0 && posts.every(p => selectedIds.has(p.id));
  function toggleSelectAll() { if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(posts.map(p => p.id))); }
  function toggleSelect(id: string) { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); }
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount.toLocaleString()} total &middot; Page {page + 1}/{Math.max(totalPages, 1)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPosts} className="gap-2">
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: "Total Posts", value: totalCount, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Zap, label: "Boosted", value: posts.filter(p => p.is_boosted).length, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: Pin, label: "Pinned", value: posts.filter(p => p.is_pinned).length, color: "text-purple-500", bg: "bg-purple-500/10" },
          { icon: AlertTriangle, label: "High Spam", value: posts.filter(p => p.spam_score > 0.6).length, color: "text-red-500", bg: "bg-red-500/10" },
        ].map(stat => (
          <Card key={stat.label} className="py-3">
            <CardContent className="px-4 flex items-center gap-3">
              <div className={"flex size-8 items-center justify-center rounded-lg shrink-0 " + stat.bg}>
                <stat.icon className={"size-4 " + stat.color} />
              </div>
              <div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="text-lg font-bold tabular-nums">{stat.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search post content..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-7" onClick={() => setSearch("")}><X className="size-3.5" /></Button>}
        </div>
        <Select value={sortKey} onValueChange={v => { setSortKey(v as SortKey); setPage(0); }}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Sort: Newest First</SelectItem>
            <SelectItem value="likes_count">Sort: Most Liked</SelectItem>
            <SelectItem value="views_count">Sort: Most Viewed</SelectItem>
            <SelectItem value="replies_count">Sort: Most Replied</SelectItem>
            <SelectItem value="spam_score">Sort: Spam Score</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setSortAsc(!sortAsc); setPage(0); }}>
          {sortAsc ? <SortAsc className="size-4" /> : <SortDesc className="size-4" />}
        </Button>
      </div>

      <Tabs value={filterTab} onValueChange={v => { setFilterTab(v as FilterTab); setPage(0); }}>
        <TabsList className="h-8 flex-wrap gap-0.5">
          <TabsTrigger value="all" className="h-6 text-xs px-2.5">All</TabsTrigger>
          <TabsTrigger value="pinned" className="h-6 text-xs px-2.5">Pinned</TabsTrigger>
          <TabsTrigger value="anonymous" className="h-6 text-xs px-2.5">Anonymous</TabsTrigger>
          <TabsTrigger value="boosted" className="h-6 text-xs px-2.5">Boosted</TabsTrigger>
          <TabsTrigger value="subscriber_only" className="h-6 text-xs px-2.5">Subscriber</TabsTrigger>
          <TabsTrigger value="with_media" className="h-6 text-xs px-2.5">With Media</TabsTrigger>
        </TabsList>
      </Tabs>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 flex-wrap">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <Separator orientation="vertical" className="h-4" />
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleBulkPin(true)} disabled={bulkLoading}><Pin className="size-3" /> Pin All</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleBulkPin(false)} disabled={bulkLoading}><PinOff className="size-3" /> Unpin All</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleBulkLock(true)} disabled={bulkLoading}><Lock className="size-3" /> Lock All</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => handleBulkLock(false)} disabled={bulkLoading}><Unlock className="size-3" /> Unlock All</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleExportSelected} disabled={bulkLoading}><Download className="size-3" /> Export CSV</Button>
          <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5" onClick={() => setConfirmBulkDelete(true)} disabled={bulkLoading}><Trash2 className="size-3" /> Delete All</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}><X className="size-3" /> Clear</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="py-3 px-4 text-left w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs">Author</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs min-w-[200px]">Content</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs">Status</th>
                  <th className="py-3 px-2 text-center font-medium text-muted-foreground w-12"><Heart className="size-3.5 mx-auto" /></th>
                  <th className="py-3 px-2 text-center font-medium text-muted-foreground w-12"><Eye className="size-3.5 mx-auto" /></th>
                  <th className="py-3 px-2 text-center font-medium text-muted-foreground w-12"><MessageSquare className="size-3.5 mx-auto" /></th>
                  <th className="py-3 px-2 text-center font-medium text-muted-foreground w-12"><Repeat2 className="size-3.5 mx-auto" /></th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground text-xs">Posted</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:8}).map((_,i)=>(
                  <tr key={i} className="border-b">
                    {Array.from({length:10}).map((_,j)=><td key={j} className="py-3 px-3"><Skeleton className="h-4 w-full" /></td>)}
                  </tr>
                )) : posts.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No posts found</td></tr>
                ) : posts.map((post: any) => {
                  const u = getUser(post);
                  const isSelected = selectedIds.has(post.id);
                  const hasMedia = (post.image_urls && post.image_urls.length > 0) || post.video_url;
                  return (
                    <tr key={post.id} className={"border-b transition-colors hover:bg-muted/30 " + (isSelected ? "bg-primary/5" : "")}>
                      <td className="py-3 px-4"><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(post.id)} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Avatar className="size-8">
                              {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                              <AvatarFallback className="text-xs">{(u?.username||"?").charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {u?.is_verified && <span className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate max-w-[90px]">@{u?.username||"deleted"}</span>
                            {u?.is_suspended && <Badge variant="destructive" className="text-[9px] h-4 px-1 w-fit">Suspended</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 max-w-[260px]">
                          <p className="text-sm line-clamp-2 cursor-pointer hover:text-primary transition-colors" onClick={() => setViewingPost(post)}>
                            {post.content || <span className="italic text-muted-foreground">(Media only)</span>}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {hasMedia && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{post.video_url ? "Video" : "Photo"}</Badge>}
                            {post.audio_url && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Audio</Badge>}
                            {post.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{post.category}</Badge>}
                            {getSpamBadge(post.spam_score)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          {post.is_pinned && <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] w-fit gap-1"><Pin className="size-2.5" />Pinned</Badge>}
                          {post.is_boosted && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] w-fit gap-1"><Zap className="size-2.5" />Boosted</Badge>}
                          {post.is_subscriber_only && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] w-fit gap-1"><Lock className="size-2.5" />Subscriber</Badge>}
                          {post.is_anonymous && <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[10px] w-fit gap-1"><EyeOff className="size-2.5" />Anon</Badge>}
                          {!post.is_pinned && !post.is_boosted && !post.is_subscriber_only && !post.is_anonymous && <span className="text-xs text-muted-foreground">Public</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-xs tabular-nums">{formatCount(post.likes_count)}</td>
                      <td className="py-3 px-2 text-center text-xs tabular-nums">{formatCount(post.views_count)}</td>
                      <td className="py-3 px-2 text-center text-xs tabular-nums">{formatCount(post.replies_count)}</td>
                      <td className="py-3 px-2 text-center text-xs tabular-nums">{formatCount(post.reposts_count)}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(post.created_at)}</td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">View</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewingPost(post)}><Eye className="size-4 mr-2 text-blue-500" /> View Full Post</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(post.id); toast.success("ID copied"); }}><Copy className="size-4 mr-2" /> Copy Post ID</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Edit</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setEditingPost(post); setEditContent(post.content || ""); }}><Pencil className="size-4 mr-2 text-yellow-500" /> Edit Content</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTogglePin(post)}>
                              {post.is_pinned ? <><PinOff className="size-4 mr-2 text-purple-500" /> Unpin Post</> : <><Pin className="size-4 mr-2 text-purple-500" /> Pin Post</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleSubscriberOnly(post)}>
                              {post.is_subscriber_only ? <><Unlock className="size-4 mr-2 text-blue-500" /> Make Public</> : <><Lock className="size-4 mr-2 text-blue-500" /> Subscriber Only</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleHideFromProfile(post)}><EyeOff className="size-4 mr-2 text-gray-500" /> Hide from Profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Boost</DropdownMenuLabel>
                            {!post.is_boosted
                              ? <DropdownMenuItem onClick={() => setBoostingPost(post)}><Zap className="size-4 mr-2 text-amber-500" /> Boost Post</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => handleRemoveBoost(post)}><Zap className="size-4 mr-2 text-gray-400" /> Remove Boost</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Moderation</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleCreateReport(post)}><Flag className="size-4 mr-2 text-orange-500" /> Flag for Review</DropdownMenuItem>
                            {post.spam_score > 0 && <DropdownMenuItem onClick={() => handleClearSpamScore(post)}><TrendingUp className="size-4 mr-2 text-green-500" /> Clear Spam Score</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(post)}><Trash2 className="size-4 mr-2" /> Delete Post</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(page * PAGE_SIZE + 1, totalCount)}&ndash;{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 gap-1.5"><ChevronLeft className="size-3.5" /> Prev</Button>
          <span className="text-sm tabular-nums">{page + 1} / {Math.max(totalPages, 1)}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-8 gap-1.5">Next <ChevronRight className="size-3.5" /></Button>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewingPost} onOpenChange={open => !open && setViewingPost(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="size-4" /> Post Detail</DialogTitle></DialogHeader>
          {viewingPost && (() => { const u = getUser(viewingPost); return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback>{(u?.username||"?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">@{u?.username||"deleted"}</p>
                    {u?.is_verified && <Badge className="bg-blue-500/10 text-blue-500 text-[10px]">Verified</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{viewingPost.created_at && format(new Date(viewingPost.created_at), "PPP p")}</p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-lg p-4"><p className="text-sm whitespace-pre-wrap">{viewingPost.content || "(No text)"}</p></div>
              {viewingPost.image_urls && viewingPost.image_urls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">IMAGES ({viewingPost.image_urls.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewingPost.image_urls.map((url: string, i: number) => <img key={i} src={url} alt="" className="rounded-lg object-cover aspect-video w-full" />)}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Heart, label: "Likes", value: viewingPost.likes_count, color: "text-pink-500" },
                  { icon: Eye, label: "Views", value: viewingPost.views_count, color: "text-blue-500" },
                  { icon: MessageSquare, label: "Replies", value: viewingPost.replies_count, color: "text-cyan-500" },
                  { icon: Repeat2, label: "Reposts", value: viewingPost.reposts_count, color: "text-green-500" },
                  { icon: BookmarkIcon, label: "Saves", value: viewingPost.saves_count, color: "text-amber-500" },
                  { icon: Share2, label: "Shares", value: viewingPost.shares_count, color: "text-purple-500" },
                ].map(m => (
                  <div key={m.label} className="bg-muted/40 rounded-lg p-3 text-center">
                    <m.icon className={"size-4 mx-auto mb-1 " + m.color} />
                    <p className="text-lg font-bold tabular-nums">{formatCount(m.value||0)}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {viewingPost.is_pinned && <Badge className="bg-purple-500/10 text-purple-600 gap-1"><Pin className="size-3" />Pinned</Badge>}
                {viewingPost.is_boosted && <Badge className="bg-amber-500/10 text-amber-600 gap-1"><Zap className="size-3" />Boosted ($" + (viewingPost.boost_spend||0) + ")</Badge>}
                {viewingPost.is_anonymous && <Badge className="bg-indigo-500/10 text-indigo-500 gap-1"><EyeOff className="size-3" />Anonymous</Badge>}
                {viewingPost.is_subscriber_only && <Badge className="bg-blue-500/10 text-blue-600 gap-1"><Lock className="size-3" />Subscribers Only</Badge>}
                {viewingPost.audience && <Badge variant="outline" className="gap-1"><Globe className="size-3" />{viewingPost.audience}</Badge>}
                {viewingPost.category && <Badge variant="outline">{viewingPost.category}</Badge>}
                {viewingPost.spam_score > 0 && <Badge className="bg-red-500/10 text-red-500 gap-1"><AlertTriangle className="size-3" />Spam: {(viewingPost.spam_score * 100).toFixed(0)}%</Badge>}
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-muted/30 rounded p-2 break-all">ID: {viewingPost.id}</div>
            </div>
          ); })()}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { if (viewingPost) { setEditingPost(viewingPost); setEditContent(viewingPost.content||""); setViewingPost(null); } }}><Pencil className="size-4 mr-2" /> Edit</Button>
            <Button variant="destructive" onClick={() => { setConfirmDelete(viewingPost); setViewingPost(null); }}><Trash2 className="size-4 mr-2" /> Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPost} onOpenChange={open => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="size-4 text-yellow-500" /> Edit Post</DialogTitle>
            <DialogDescription>Editing as admin. Changes are immediate.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Content</Label>
            <Textarea rows={6} value={editContent} onChange={e => setEditContent(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{editContent.length} chars</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="size-4" /> Delete Post</DialogTitle>
            <DialogDescription>This cannot be undone. Post and replies will be permanently deleted.</DialogDescription>
          </DialogHeader>
          {confirmDelete && <div className="bg-muted/40 rounded-lg p-3 text-sm line-clamp-3 italic text-muted-foreground">{confirmDelete.content || "(Media post)"}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete.id)}><Trash2 className="size-4 mr-2" /> Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete */}
      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="size-4" /> Bulk Delete</DialogTitle>
            <DialogDescription>Permanently delete {selectedIds.size} posts. Cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>{bulkLoading ? "Deleting..." : "Delete " + selectedIds.size + " Posts"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boost Dialog */}
      <Dialog open={!!boostingPost} onOpenChange={open => !open && setBoostingPost(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Zap className="size-4 text-amber-500" /> Boost Post</DialogTitle>
            <DialogDescription>Set admin boost to increase reach.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {boostingPost && <div className="bg-muted/40 rounded-lg p-3 text-sm line-clamp-2 italic text-muted-foreground">{boostingPost.content || "(Media post)"}</div>}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Budget ($)</Label>
              <Input type="number" min="1" value={boostBudget} onChange={e => setBoostBudget(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoostingPost(null)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleBoostPost}><Zap className="size-4 mr-2" /> Boost Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
