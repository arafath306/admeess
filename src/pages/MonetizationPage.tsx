import { useState, useEffect } from "react"
import { Search, CheckCircle, XCircle, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

function getUser(row: any, key = 'user') { return Array.isArray(row[key]) ? row[key][0] : row[key] }

export function MonetizationPage() {
  const [globalToggle, setGlobalToggle] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch global setting
      const { data: setting } = await supabase.from('system_settings').select('value').eq('key', 'enable_monetization').single()
      if (setting) setGlobalToggle(setting.value === 'true')

      // Fetch users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, can_monetize, followers_count, is_verified, badge_type')
        .order('followers_count', { ascending: false })
        .limit(50)
      setUsers(profiles || [])

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('creator_subscriptions')
        .select('*, subscriber:profiles!creator_subscriptions_subscriber_id_fkey(username, full_name, avatar_url), creator:profiles!creator_subscriptions_creator_id_fkey(username, full_name)')
        .order('created_at', { ascending: false })
        .limit(50)
      setSubs(subscriptions || [])

      // Fetch payout requests
      const { data: payoutData } = await supabase
        .from('payout_requests')
        .select('*, user:profiles!payout_requests_user_id_fkey(username, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50)
      setPayouts(payoutData || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function toggleGlobalMonetization(checked: boolean) {
    setGlobalToggle(checked)
    const { error } = await supabase.from('system_settings').upsert({ key: 'enable_monetization', value: checked ? 'true' : 'false' })
    if (error) toast.error("Failed to update global setting")
    else toast.success(`Monetization globally ${checked ? 'enabled' : 'disabled'}`)
  }

  async function toggleUserAccess(userId: string, checked: boolean, isVerified: boolean) {
    if (checked && !isVerified) {
      toast.error("User must have an approved verified badge before getting monetization access!")
      return
    }
    const { error } = await supabase.from('profiles').update({ can_monetize: checked }).eq('id', userId)
    if (error) toast.error("Failed to update user access")
    else {
      toast.success("User access updated")
      setUsers(users.map(u => u.id === userId ? { ...u, can_monetize: checked } : u))
    }
  }

  async function handleApproveSub(subId: string) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days from now

    const { error } = await supabase.from('creator_subscriptions').update({ 
      status: 'active', 
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }).eq('id', subId)
    
    if (error) toast.error("Failed to approve subscription")
    else { toast.success("Subscription approved"); fetchData() }
  }

  async function handleRejectSub(subId: string) {
    const { error } = await supabase.from('creator_subscriptions').update({ status: 'rejected' }).eq('id', subId)
    if (error) toast.error("Failed to reject subscription")
    else { toast.success("Subscription rejected"); fetchData() }
  }

  async function handleApprovePayout(id: string) {
    const { error } = await supabase.from('payout_requests').update({ status: 'paid' }).eq('id', id)
    if (error) toast.error("Failed to mark payout as paid")
    else { toast.success("Payout marked as Paid!"); fetchData() }
  }

  async function handleRejectPayout(id: string) {
    const { error } = await supabase.from('payout_requests').update({ status: 'rejected' }).eq('id', id)
    if (error) toast.error("Failed to reject payout")
    else { toast.success("Payout request rejected"); fetchData() }
  }

  const filteredUsers = search ? users.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())) : users

  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Monetization</h1><p className="text-sm text-muted-foreground mt-1">Manage creator subscriptions and access</p></div>
      
      {/* Global Setting */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1"><CardTitle className="text-lg">Global Monetization Toggle</CardTitle><CardDescription>Enable or disable the monetization feature across the entire app.</CardDescription></div>
          <Switch checked={globalToggle} onCheckedChange={toggleGlobalMonetization} />
        </CardHeader>
      </Card>

      {/* Subscription Requests */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Pending bKash Subscriptions</CardTitle><CardDescription>Review manual payments sent to the admin bKash number.</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Subscriber</TableHead><TableHead>Creator</TableHead><TableHead>bKash Sender</TableHead><TableHead>TrxID</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 2 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
               : subs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No subscriptions found</TableCell></TableRow>
               : subs.map(s => { const sub = getUser(s, 'subscriber'); const cre = getUser(s, 'creator'); return (
                <TableRow key={s.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{(sub?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium text-sm">@{sub?.username}</p></div></div></TableCell>
                  <TableCell className="text-sm">@{cre?.username}</TableCell>
                  <TableCell className="text-sm font-mono">{s.bkash_sender}</TableCell>
                  <TableCell className="text-sm font-mono">{s.bkash_trx_id}</TableCell>
                  <TableCell>{s.status === 'pending' ? <Badge className="bg-amber-500/10 text-amber-600">Pending</Badge> : s.status === 'active' ? <Badge className="bg-emerald-500/10 text-emerald-600">Active</Badge> : <Badge variant="destructive">Rejected</Badge>}</TableCell>
                  <TableCell>{s.status === 'pending' && (
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleApproveSub(s.id)}><CheckCircle className="size-4 text-emerald-500" /> Approve</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRejectSub(s.id)}><XCircle className="size-4" /> Reject</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}</TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Creator Payout Requests */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Creator Payout Requests (Withdrawals)</CardTitle><CardDescription>Review and approve payout requests from creators (bKash, Nagad, Bank).</CardDescription></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Creator</TableHead><TableHead>Method</TableHead><TableHead>Account Details</TableHead><TableHead>Amount</TableHead><TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 2 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
               : payouts.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payout requests found</TableCell></TableRow>
               : payouts.map(p => { const creator = getUser(p, 'user'); return (
                <TableRow key={p.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{(creator?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium text-sm">@{creator?.username || 'user'}</p><p className="text-xs text-muted-foreground">{creator?.full_name}</p></div></div></TableCell>
                  <TableCell className="text-sm font-semibold">{p.payout_method}</TableCell>
                  <TableCell className="text-sm font-mono">{p.account_details}</TableCell>
                  <TableCell className="text-sm font-bold text-emerald-600">৳{p.amount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{p.status === 'pending' ? <Badge className="bg-amber-500/10 text-amber-600">Pending (24h)</Badge> : p.status === 'paid' ? <Badge className="bg-emerald-500/10 text-emerald-600">Paid</Badge> : <Badge variant="destructive">Rejected</Badge>}</TableCell>
                  <TableCell>{p.status === 'pending' && (
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleApprovePayout(p.id)}><CheckCircle className="size-4 text-emerald-500" /> Mark as Paid</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleRejectPayout(p.id)}><XCircle className="size-4" /> Reject</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}</TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Creator Access List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1"><CardTitle className="text-lg">Creator Access List</CardTitle><CardDescription>Grant specific users permission to monetize.</CardDescription></div>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search user..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Followers</TableHead><TableHead>Badge Status</TableHead><TableHead className="text-right">Can Monetize?</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
               : filteredUsers.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
               : filteredUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{(u.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium text-sm">@{u.username}</p><p className="text-xs text-muted-foreground">{u.full_name}</p></div></div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.followers_count?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    {u.is_verified ? (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                        {u.badge_type ? u.badge_type.toUpperCase() : 'VERIFIED'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Verified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={u.can_monetize}
                      disabled={!u.is_verified}
                      onCheckedChange={(c) => toggleUserAccess(u.id, c, !!u.is_verified)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
