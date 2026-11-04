import { useState, useEffect } from "react"
import { MoreHorizontal, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getUser(row: any) { return Array.isArray(row.user) ? row.user[0] : row.user }

export function CommentsPage() {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => { fetchComments() }, [])

  async function fetchComments() {
    setLoading(true)
    try {
      const { data, count, error } = await supabase
        .from('comments')
        .select('id, content, likes_count, image_url, created_at, user:profiles!comments_user_id_fkey(username)', { count: 'exact' })
        .order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      setComments(data || [])
      setTotalCount(count ?? 0)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (!error) { toast.success('Comment deleted'); fetchComments() } else toast.error('Failed to delete')
  }

  const filtered = search ? comments.filter((c: any) => c.content?.toLowerCase().includes(search.toLowerCase())) : comments

  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Comments</h1><p className="text-sm text-muted-foreground mt-1">{totalCount.toLocaleString()} total comments</p></div>
      <Card><CardContent className="py-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search comments..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Comment</TableHead><TableHead>Likes</TableHead><TableHead>Posted</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-48" /></TableCell><TableCell><Skeleton className="h-4 w-8" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No comments found</TableCell></TableRow>
            ) : filtered.map((c: any) => { const u = getUser(c); return (
              <TableRow key={c.id}>
                <TableCell><div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="text-xs">{(u?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm">@{u?.username || 'deleted'}</span></div></TableCell>
                <TableCell className="max-w-[400px]"><p className="text-sm truncate">{c.content}</p></TableCell>
                <TableCell className="text-sm">{c.likes_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(c.created_at)}</TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="size-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
