import { useState, useEffect } from "react"
import { Search, Lock } from "lucide-react"
import { decryptAdminMessage } from "@/lib/e2ee"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getRelated(row: any, key: string) { const v = row[key]; return Array.isArray(v) ? v[0] : v }

export function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    async function fetch() {
      try {
        const { data, count, error } = await supabase
          .from('messages')
          .select('id, content, is_read, created_at, sender_id, sender:profiles!messages_sender_id_fkey(username), receiver:profiles!messages_receiver_id_fkey(username, public_key)', { count: 'exact' })
          .order('created_at', { ascending: false }).limit(50)
        if (error) throw error
        
        const decryptedData = await Promise.all((data || []).map(async (m: any) => {
          const receiver = getRelated(m, 'receiver');
          const result = await decryptAdminMessage(m.sender_id, receiver?.public_key, m.content);
          return { ...m, decryptedContent: result.text, isE2EE: result.decrypted };
        }));

        setMessages(decryptedData)
        setTotalCount(count ?? 0)
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetch()
  }, [])

  const filtered = search ? messages.filter((m: any) => (m.decryptedContent || m.content)?.toLowerCase().includes(search.toLowerCase())) : messages

  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Messages</h1><p className="text-sm text-muted-foreground mt-1">{totalCount.toLocaleString()} messages</p></div>
      <Card><CardContent className="py-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search messages..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-48" /></TableCell><TableCell><Skeleton className="h-5 w-14" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell></TableRow>
            )) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No messages found</TableCell></TableRow>
            ) : filtered.map((m: any) => { const sender = getRelated(m, 'sender'); const receiver = getRelated(m, 'receiver'); return (
              <TableRow key={m.id}>
                <TableCell><div className="flex items-center gap-2"><Avatar className="size-6"><AvatarFallback className="text-[10px]">{(sender?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><span className="text-sm">@{sender?.username || 'deleted'}</span></div></TableCell>
                <TableCell><span className="text-sm">@{receiver?.username || 'deleted'}</span></TableCell>
                <TableCell className="max-w-[300px]">
                  <div className="flex items-center gap-1.5">
                    {m.isE2EE && <span title="E2EE Decrypted by Master Key"><Lock className="size-3 text-green-500 flex-shrink-0" /></span>}
                    <p className="text-sm truncate" title={m.decryptedContent || m.content}>{m.decryptedContent || m.content}</p>
                  </div>
                </TableCell>
                <TableCell>{m.is_read ? <Badge variant="secondary" className="text-xs">Read</Badge> : <Badge className="text-xs">Unread</Badge>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(m.created_at)}</TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
