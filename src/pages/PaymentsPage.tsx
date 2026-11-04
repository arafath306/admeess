import { useState, useEffect } from "react"
import { Search, CreditCard, CheckCircle2, XCircle, Clock, Copy, RefreshCw, BadgeCheck, Filter } from "lucide-react"
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

export function PaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedGateway, setSelectedGateway] = useState<string>("all")

  // Detail Modal State
  const [inspectItem, setInspectItem] = useState<any | null>(null)

  useEffect(() => {
    fetchPayments()

    // ⚡ Realtime Listener for new payment verification submissions
    const channel = supabase
      .channel('verification-payments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verification_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('💰 New Payment Transaction Submitted!', {
              description: 'A user submitted a new bKash/Nagad verification payment.',
            })
            fetchPayments()
          } else {
            fetchPayments()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchPayments() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          id,
          status,
          payment_method,
          transaction_id,
          phone_number,
          amount,
          badge_type,
          selected_plan_id,
          created_at,
          user_id,
          user:profiles!verification_requests_user_id_fkey(id, username, full_name, avatar_url, is_verified, badge_type)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setTransactions(data || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to fetch payment transactions')
    } finally {
      setLoading(false)
    }
  }

  // 1-Click Approve Payment & Grant Badge
  async function handleApprovePayment(item: any) {
    if (!confirm(`Are you sure you want to APPROVE payment of ৳${item.amount || '1000'} and grant ${item.badge_type || 'blue'} badge to @${getUser(item)?.username}?`)) return
    try {
      // 1. Update verification_requests status to approved
      const { error: reqError } = await supabase
        .from('verification_requests')
        .update({ status: 'approved' })
        .eq('id', item.id)

      if (reqError) throw reqError

      // 2. Grant Verification Badge & status to user's profile
      const targetBadge = item.badge_type || 'blue'
      const { error: profError } = await supabase
        .from('profiles')
        .update({
          is_verified: true,
          badge_type: targetBadge,
        })
        .eq('id', item.user_id)

      if (profError) throw profError

      toast.success(`🎉 Payment Approved! Verified ${targetBadge.toUpperCase()} badge granted to @${getUser(item)?.username}`)
      if (inspectItem?.id === item.id) setInspectItem(null)
      fetchPayments()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve payment')
    }
  }

  // 1-Click Reject Payment
  async function handleRejectPayment(item: any) {
    if (!confirm(`Are you sure you want to REJECT payment request for @${getUser(item)?.username}?`)) return
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({ status: 'rejected' })
        .eq('id', item.id)

      if (error) throw error
      toast.info('Payment request rejected.')
      if (inspectItem?.id === item.id) setInspectItem(null)
      fetchPayments()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject payment')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success(`Copied TrxID: ${text}`)
  }

  // Filter transactions
  const filteredTransactions = transactions.filter((t: any) => {
    const u = getUser(t)
    const matchesSearch = !search || (
      t.transaction_id?.toLowerCase().includes(search.toLowerCase()) ||
      t.phone_number?.toLowerCase().includes(search.toLowerCase()) ||
      u?.username?.toLowerCase().includes(search.toLowerCase()) ||
      u?.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus
    const matchesGateway = selectedGateway === 'all' || (t.payment_method || '').toLowerCase().includes(selectedGateway.toLowerCase())

    return matchesSearch && matchesStatus && matchesGateway
  })

  // Calculate totals
  const totalRevenue = transactions
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + (Number(t.amount) || 1000), 0)

  const pendingCount = transactions.filter(t => t.status === 'pending' || !t.status).length
  const approvedCount = transactions.filter(t => t.status === 'approved').length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CreditCard className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Payments & bKash / Nagad Transactions</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Verify manual TrxIDs, approve verification badge purchases, and monitor revenue in real-time.
          </p>
        </div>
        <Button onClick={fetchPayments} variant="outline" size="sm" className="gap-2 self-start md:self-auto">
          <RefreshCw className="size-4" /> Refresh Payments
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-500 font-medium">Total Approved Revenue</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-500">৳ {totalRevenue.toLocaleString()} BDT</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-500 font-medium">Pending Approvals</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-500">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved Badges</CardDescription>
            <CardTitle className="text-3xl font-bold">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-3xl font-bold">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Control Bar: Search & Filters */}
      <Card>
        <CardContent className="py-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by TrxID, sender phone number, or username..." 
              className="pl-9" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <div className="flex gap-2">
            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px] gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="approved">✅ Approved</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Gateway Filter */}
            <Select value={selectedGateway} onValueChange={setSelectedGateway}>
              <SelectTrigger className="w-[160px] gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <SelectValue placeholder="All Gateways" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                <SelectItem value="bkash">📱 bKash</SelectItem>
                <SelectItem value="nagad">🟠 Nagad</SelectItem>
                <SelectItem value="rocket">🟣 Rocket</SelectItem>
                <SelectItem value="card">💳 Card / Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Customer</TableHead>
                <TableHead>Gateway & Sender</TableHead>
                <TableHead>TrxID (Transaction ID)</TableHead>
                <TableHead>Badge Requested</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No payment transactions found matching filter criteria.
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.map((item: any) => {
                const u = getUser(item)
                const isPending = !item.status || item.status === 'pending'
                const isApproved = item.status === 'approved'
                const isRejected = item.status === 'rejected'
                const method = (item.payment_method || 'bKash').toUpperCase()

                return (
                  <TableRow key={item.id} className={isPending ? "bg-amber-500/5 font-medium" : ""}>
                    {/* User Profile */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 border">
                          {u?.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="text-xs font-bold">{(u?.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">@{u?.username || 'user'}</span>
                          <span className="text-xs text-muted-foreground">{u?.full_name || 'Customer'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Gateway & Sender */}
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge variant="outline" className="w-fit text-xs gap-1 font-semibold">
                          {method.includes('BKASH') ? '📱 bKash' : method.includes('NAGAD') ? '🟠 Nagad' : '💳 ' + method}
                        </Badge>
                        <span className="text-xs text-muted-foreground mt-0.5">{item.phone_number || 'N/A'}</span>
                      </div>
                    </TableCell>

                    {/* TrxID with Copy Button */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-muted/40 px-2 py-1 rounded w-fit border">
                        <span>{item.transaction_id || 'NO_TRX_ID'}</span>
                        {item.transaction_id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="size-5 hover:bg-muted"
                            onClick={() => copyToClipboard(item.transaction_id)}
                          >
                            <Copy className="size-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </TableCell>

                    {/* Badge Requested */}
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`capitalize font-bold text-xs gap-1 ${
                          (item.badge_type || '').toLowerCase() === 'gold' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                        }`}
                      >
                        <BadgeCheck className="size-3.5" />
                        {item.badge_type || 'Blue'} Badge
                      </Badge>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="font-bold text-sm">
                      ৳ {Number(item.amount || 1000).toLocaleString()} BDT
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      {isPending && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs">
                          <Clock className="size-3" /> Pending
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                          <CheckCircle2 className="size-3" /> Approved
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <XCircle className="size-3" /> Rejected
                        </Badge>
                      )}
                    </TableCell>

                    {/* Submitted Time */}
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimeAgo(item.created_at)}
                    </TableCell>

                    {/* 1-Click Enforcement Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setInspectItem(item)}
                          className="h-8 text-xs"
                        >
                          Inspect
                        </Button>

                        {isPending && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleApprovePayment(item)}
                              className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1"
                            >
                              <CheckCircle2 className="size-3.5" /> Approve
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRejectPayment(item)}
                              className="h-8 text-xs text-rose-500 hover:bg-rose-500/10 gap-1"
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspection Modal Dialog */}
      <Dialog open={!!inspectItem} onOpenChange={(open) => !open && setInspectItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <CreditCard className="size-5" /> Transaction Inspection
            </DialogTitle>
          </DialogHeader>

          {inspectItem && (
            <div className="flex flex-col gap-4 py-2 text-sm">
              <div className="p-3 rounded-lg border bg-muted/40 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-bold">@{getUser(inspectItem)?.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-emerald-500">৳ {inspectItem.amount || 1000} BDT</p>
                </div>
              </div>

              <div className="space-y-2 border rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gateway:</span>
                  <span className="font-semibold uppercase">{inspectItem.payment_method || 'bKash'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sender Mobile:</span>
                  <span className="font-mono font-semibold">{inspectItem.phone_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded text-xs">
                    {inspectItem.transaction_id || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Badge:</span>
                  <span className="font-semibold capitalize">{inspectItem.badge_type || 'blue'} Badge</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted At:</span>
                  <span>{new Date(inspectItem.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {(!inspectItem.status || inspectItem.status === 'pending') && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRejectPayment(inspectItem)}
                      className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                    >
                      <XCircle className="size-4" /> Reject Payment
                    </Button>

                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleApprovePayment(inspectItem)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <CheckCircle2 className="size-4" /> Approve & Grant Badge
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
