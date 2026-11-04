import { useState, useEffect } from "react"
import { Eye, MoreHorizontal, Search, Trash2, Users2 } from "lucide-react"
import { toast } from "sonner"
import { useNavigation } from "@/contexts/NavigationContext"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

type Community = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  member_count: number
  privacy: string
  created_at: string
}

export function CommunitiesPage() {
  const { navigate } = useNavigation()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => { fetchCommunities() }, [])

  async function fetchCommunities() {
    setLoading(true)
    try {
      const { data, count, error } = await supabase
        .from('communities')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setCommunities(data || [])
      setTotalCount(count ?? 0)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function handleDelete(id: string, name: string) {
    const { error } = await supabase.from('communities').delete().eq('id', id)
    if (!error) { toast.success(`"${name}" deleted`); fetchCommunities() }
    else toast.error('Failed to delete')
  }

  const filtered = search ? communities.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : communities

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communities</h1>
        <p className="text-sm text-muted-foreground mt-1">{totalCount.toLocaleString()} communities</p>
      </div>
      <Card><CardContent className="py-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search communities..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Community</TableHead><TableHead>Members</TableHead><TableHead>Privacy</TableHead><TableHead>Created</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell><Skeleton className="h-8 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No communities found</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 -m-1 rounded-md transition-colors" onClick={() => navigate("community-monitor", c.id)}>
                    <Avatar className="size-8"><AvatarFallback className="text-xs"><Users2 className="size-4" /></AvatarFallback></Avatar>
                    <div><p className="font-medium text-sm hover:underline">{c.name}</p>{c.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</p>}</div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{c.member_count?.toLocaleString() || 0}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{c.privacy || 'Public'}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(c.created_at)}</TableCell>
                <TableCell>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate("community-monitor", c.id)}><Eye className="size-4" /> Monitor Community</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id, c.name)}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
