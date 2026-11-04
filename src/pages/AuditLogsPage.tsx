import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
        if (error) throw error
        setLogs(data || [])
      } catch (err) { console.error(err) } finally { setLoading(false) }
    }
    fetch()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1><p className="text-sm text-muted-foreground mt-1">System activity and admin actions</p></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>IP</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-40" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell></TableRow>
            )) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs yet</TableCell></TableRow>
            ) : logs.map((l: any) => (
              <TableRow key={l.id}>
                <TableCell className="text-sm font-medium">{l.admin_id}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{l.action}</Badge></TableCell>
                <TableCell className="max-w-[300px]"><p className="text-sm truncate text-muted-foreground">{l.details || '—'}</p></TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.ip_address || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(l.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
