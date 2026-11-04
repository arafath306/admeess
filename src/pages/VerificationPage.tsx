import { useState, useEffect } from "react"
import { CheckCircle, MoreHorizontal, Search, XCircle, Tag, DollarSign, Save, RefreshCw, Globe, Mail, Building, Landmark } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { formatTimeAgo } from "@/hooks/use-supabase"

function getUser(row: any) { return Array.isArray(row.user) ? row.user[0] : row.user }

const DEFAULT_PLANS = [
  // General Category (Blue Badge)
  { id: 'general_weekly_basic', name: 'General Weekly Basic', price: 60, discount_price: 59, interval_unit: 'week', tier: 'basic' },
  { id: 'general_weekly_premium', name: 'General Weekly Premium', price: 110, discount_price: 100, interval_unit: 'week', tier: 'premium' },
  { id: 'general_monthly_basic', name: 'General Monthly Basic', price: 210, discount_price: 199, interval_unit: 'month', tier: 'basic' },
  { id: 'general_monthly_premium', name: 'General Monthly Premium', price: 380, discount_price: 350, interval_unit: 'month', tier: 'premium' },
  { id: 'general_yearly_basic', name: 'General Yearly Basic', price: 1800, discount_price: 1599, interval_unit: 'year', tier: 'basic' },
  { id: 'general_yearly_premium', name: 'General Yearly Premium', price: 2800, discount_price: 2500, interval_unit: 'year', tier: 'premium' },
  { id: 'general_lifetime_basic', name: 'General Lifetime Basic', price: 5200, discount_price: 4999, interval_unit: 'lifetime', tier: 'basic' },
  { id: 'general_lifetime_premium', name: 'General Lifetime Premium', price: 9500, discount_price: 8999, interval_unit: 'lifetime', tier: 'premium' },

  // Business Category (Gold Badge)
  { id: 'business_weekly_basic', name: 'Business Weekly Basic', price: 150, discount_price: 139, interval_unit: 'week', tier: 'basic' },
  { id: 'business_weekly_premium', name: 'Business Weekly Premium', price: 290, discount_price: 250, interval_unit: 'week', tier: 'premium' },
  { id: 'business_monthly_basic', name: 'Business Monthly Basic', price: 499, discount_price: 450, interval_unit: 'month', tier: 'basic' },
  { id: 'business_monthly_premium', name: 'Business Monthly Premium', price: 899, discount_price: 799, interval_unit: 'month', tier: 'premium' },
  { id: 'business_yearly_basic', name: 'Business Yearly Basic', price: 3999, discount_price: 3499, interval_unit: 'year', tier: 'basic' },
  { id: 'business_yearly_premium', name: 'Business Yearly Premium', price: 6999, discount_price: 5999, interval_unit: 'year', tier: 'premium' },
  { id: 'business_lifetime_basic', name: 'Business Lifetime Basic', price: 9999, discount_price: 8999, interval_unit: 'lifetime', tier: 'basic' },
  { id: 'business_lifetime_premium', name: 'Business Lifetime Premium', price: 15999, discount_price: 14999, interval_unit: 'lifetime', tier: 'premium' },

  // Government Category (Gray Badge)
  { id: 'government_weekly_basic', name: 'Government Weekly Basic', price: 120, discount_price: 110, interval_unit: 'week', tier: 'basic' },
  { id: 'government_weekly_premium', name: 'Government Weekly Premium', price: 250, discount_price: 220, interval_unit: 'week', tier: 'premium' },
  { id: 'government_monthly_basic', name: 'Government Monthly Basic', price: 399, discount_price: 350, interval_unit: 'month', tier: 'basic' },
  { id: 'government_monthly_premium', name: 'Government Monthly Premium', price: 799, discount_price: 699, interval_unit: 'month', tier: 'premium' },
  { id: 'government_yearly_basic', name: 'Government Yearly Basic', price: 3200, discount_price: 2800, interval_unit: 'year', tier: 'basic' },
  { id: 'government_yearly_premium', name: 'Government Yearly Premium', price: 5999, discount_price: 4999, interval_unit: 'year', tier: 'premium' },
  { id: 'government_lifetime_basic', name: 'Government Lifetime Basic', price: 8999, discount_price: 7999, interval_unit: 'lifetime', tier: 'basic' },
  { id: 'government_lifetime_premium', name: 'Government Lifetime Premium', price: 13999, discount_price: 12999, interval_unit: 'lifetime', tier: 'premium' },
]

export function VerificationPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedBadge, setSelectedBadge] = useState("blue")
  const [selectedTier, setSelectedTier] = useState("basic")
  const [selectedDuration, setSelectedDuration] = useState("monthly")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Verification Plans & Price Control State
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS)
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)
  const [fetchingPlans, setFetchingPlans] = useState(false)

  useEffect(() => {
    fetchRequests()
    fetchPlans()
  }, [statusFilter])

  useEffect(() => {
    if (selectedRequest) {
      const planId = selectedRequest.plan_id || ''
      const isGov = selectedRequest.category === 'government' || planId.includes('government')
      const isBiz = selectedRequest.category === 'business' || planId.includes('business')
      setSelectedBadge(isGov ? "gray" : isBiz ? "gold" : "blue")

      const isPrem = planId.includes('premium')
      setSelectedTier(isPrem ? "premium" : "basic")

      if (planId.includes('weekly')) {
        setSelectedDuration("weekly")
      } else if (planId.includes('yearly')) {
        setSelectedDuration("yearly")
      } else if (planId.includes('lifetime')) {
        setSelectedDuration("lifetime")
      } else {
        setSelectedDuration("monthly")
      }
    }
  }, [selectedRequest])

  async function fetchRequests() {
    setLoading(true)
    try {
      let query = supabase
        .from('verification_requests')
        .select('*, user:profiles!verification_requests_user_id_fkey(username, full_name, avatar_url, followers_count, occupation, education, blood_group, city, country)', { count: 'exact' })
        .order('created_at', { ascending: false }).limit(50)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data, count, error } = await query
      if (error) throw error
      setRequests(data || [])
      setTotalCount(count ?? 0)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  async function fetchPlans() {
    setFetchingPlans(true)
    try {
      const { data, error } = await supabase.from('verification_plans').select('*').order('id')
      if (!error && data && data.length > 0) {
        const merged = DEFAULT_PLANS.map(def => {
          const found = data.find(d => d.id === def.id)
          return found ? { ...def, ...found } : def
        })
        setPlans(merged)
      } else {
        setPlans(DEFAULT_PLANS)
      }
    } catch (err) {
      console.error("Failed to fetch plans", err)
    } finally {
      setFetchingPlans(false)
    }
  }

  async function handlePlanChange(id: string, field: 'price' | 'discount_price', value: string) {
    const num = parseFloat(value) || 0
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: num } : p))
  }

  async function savePlanPrice(plan: any) {
    setSavingPlanId(plan.id)
    try {
      const payload = {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        discount_price: Number(plan.discount_price),
        interval_unit: plan.interval_unit,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('verification_plans').upsert(payload, { onConflict: 'id' })
      if (error) throw error
      toast.success(`Updated ${plan.name}! Price: ৳${plan.price}, Offer: ৳${plan.discount_price}`)
    } catch (err: any) {
      console.error("Error updating plan price", err)
      toast.error(`Failed to save ${plan.name}: ${err.message || 'Error'}`)
    } finally {
      setSavingPlanId(null)
    }
  }

  async function saveAllPlans() {
    setSavingPlanId('ALL')
    try {
      const payloads = plans.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        discount_price: Number(p.discount_price),
        interval_unit: p.interval_unit,
        updated_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('verification_plans').upsert(payloads, { onConflict: 'id' })
      if (error) throw error
      toast.success('All verification plan prices updated live!')
    } catch (err: any) {
      toast.error('Failed to save plans: ' + (err.message || 'Error'))
    } finally {
      setSavingPlanId(null)
    }
  }

  async function handleApprove(
    req: any,
    badgeType: string = 'blue',
    tier: string = 'basic',
    duration: string = 'monthly'
  ) {
    let expiresAt: string | null = null;
    const now = new Date();
    if (duration === 'weekly') {
      now.setDate(now.getDate() + 7);
      expiresAt = now.toISOString();
    } else if (duration === 'monthly') {
      now.setDate(now.getDate() + 30);
      expiresAt = now.toISOString();
    } else if (duration === 'yearly') {
      now.setDate(now.getDate() + 365);
      expiresAt = now.toISOString();
    } else {
      expiresAt = null;
    }

    const { error: e1 } = await supabase
      .from('verification_requests')
      .update({ status: 'approved' })
      .eq('id', req.id);

    const profileUpdate: any = {
      is_verified: true,
      badge_type: badgeType,
      can_monetize: true,
      verified_tier: tier,
      verified_expires_at: expiresAt
    };

    let { error: e2 } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', req.user_id);

    if (e2) {
      console.warn("Full profile update failed, retrying core verification fields:", e2.message);
      const fallbackUpdate = {
        is_verified: true,
        badge_type: badgeType,
      };
      const { error: retryErr } = await supabase
        .from('profiles')
        .update(fallbackUpdate)
        .eq('id', req.user_id);
      e2 = retryErr;
    }

    if (!e1 && !e2) {
      toast.success(`@${getUser(req)?.username || 'User'} verified: ${badgeType.toUpperCase()} badge (${tier.toUpperCase()} - ${duration.toUpperCase()})!`);
      fetchRequests();
      setSelectedRequest(null);
    } else {
      const errMsg = e1?.message || e2?.message || 'Error updating database';
      console.error("Approve error:", { e1, e2 });
      toast.error(`Failed to approve: ${errMsg}`);
    }
  }

  async function handleReject(id: string) {
    const { error } = await supabase.from('verification_requests').update({ status: 'rejected' }).eq('id', id)
    if (!error) { toast.success('Request rejected'); fetchRequests() } else toast.error('Failed')
  }

  const filtered = search ? requests.filter((r: any) => { const u = getUser(r); return u?.username?.toLowerCase().includes(search.toLowerCase()) || u?.full_name?.toLowerCase().includes(search.toLowerCase()) }) : requests

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Verification Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review Personal, Business & Government verification requests live</p>
        </div>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="requests">User Requests ({totalCount})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Offers Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card><CardContent className="py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input placeholder="Search by username..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
            </div>
          </CardContent></Card>
          
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Plan</TableHead><TableHead>Type</TableHead><TableHead>Followers</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-8 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell><Skeleton className="h-4 w-12" /></TableCell><TableCell><Skeleton className="h-5 w-16" /></TableCell><TableCell><Skeleton className="h-4 w-16" /></TableCell><TableCell></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No verification requests found</TableCell></TableRow>
                ) : filtered.map((r: any) => { 
                  const u = getUser(r);
                  const isGov = r.category === 'government' || (r.plan_id && r.plan_id.includes('government'));
                  const isBiz = r.category === 'business' || (r.plan_id && r.plan_id.includes('business'));
                  return (
                    <TableRow key={r.id}>
                      <TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback className="text-xs">{(u?.username || '?').charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><p className="font-medium text-sm">@{u?.username || 'unknown'}</p><p className="text-xs text-muted-foreground">{u?.full_name}</p></div></div></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.plan_id || 'Standard'}</Badge></TableCell>
                      <TableCell>
                        {isGov ? (
                          <Badge className="bg-slate-500/10 text-slate-700 border-slate-300 text-xs">🏛️ Government (Gray)</Badge>
                        ) : isBiz ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-xs">👑 Business (Gold)</Badge>
                        ) : r.is_student || r.id_type === 'student_id' ? (
                          <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">🎓 Student ID</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">🔵 Personal NID</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{u?.followers_count?.toLocaleString() || 0}</TableCell>
                      <TableCell>{r.status === 'pending' ? <Badge className="bg-amber-500/10 text-amber-600 text-xs">Pending</Badge> : r.status === 'approved' ? <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Approved</Badge> : <Badge variant="destructive" className="text-xs">Rejected</Badge>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(r.created_at)}</TableCell>
                      <TableCell>{r.status === 'pending' && (
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedRequest(r)}><Search className="size-4 text-blue-500" /> Review Details</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              const planId = r.plan_id || '';
                              const bType = isGov ? "gray" : isBiz ? "gold" : "blue";
                              const bTier = planId.includes('premium') ? 'premium' : 'basic';
                              const bDur = planId.includes('weekly') ? 'weekly' : planId.includes('yearly') ? 'yearly' : planId.includes('lifetime') ? 'lifetime' : 'monthly';
                              handleApprove(r, bType, bTier, bDur);
                            }}>
                              <CheckCircle className="size-4 text-emerald-500" /> Approve ({isGov ? "Gray" : isBiz ? "Gold" : "Blue"})
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleReject(r.id)}><XCircle className="size-4" /> Reject</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* PRICING & OFFERS MANAGER TAB */}
        <TabsContent value="pricing" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="size-5 text-emerald-500" /> Subscription Pricing & Offer Discounts
                </CardTitle>
                <CardDescription className="mt-1">
                  Control Personal (Blue), Business (Gold) & Government (Gray) pricing live in real-time.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchPlans} disabled={fetchingPlans}>
                  <RefreshCw className={`size-4 mr-2 ${fetchingPlans ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveAllPlans} disabled={savingPlanId === 'ALL'}>
                  <Save className="size-4 mr-2" /> {savingPlanId === 'ALL' ? 'Saving All...' : 'Save All Changes'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isGov = plan.id.includes('government')
                  const isBiz = plan.id.includes('business')
                  const isPremium = plan.id.includes('premium')
                  const base = Number(plan.price) || 0
                  const offer = Number(plan.discount_price) || base
                  const discount = base > offer ? base - offer : 0
                  const vat = (offer * 0.05) / 1.05

                  return (
                    <Card key={plan.id} className={`border ${isGov ? 'border-slate-500/40 bg-slate-500/5' : isBiz ? 'border-amber-500/40 bg-amber-500/5' : isPremium ? 'border-purple-500/30 bg-purple-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{isGov ? '🏛️' : isBiz ? '👑' : isPremium ? '⭐' : '🔵'}</span>
                            <div>
                              <h3 className="font-semibold text-sm">{plan.name}</h3>
                              <p className="text-xs text-muted-foreground capitalize">{plan.interval_unit} • {isGov ? 'Gray Badge' : isBiz ? 'Gold Badge' : 'Blue Badge'}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-8 text-xs gap-1"
                            onClick={() => savePlanPrice(plan)}
                            disabled={savingPlanId === plan.id}
                          >
                            <Save className="size-3.5" />
                            {savingPlanId === plan.id ? 'Saving...' : 'Save'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Base Price (৳)</label>
                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                              <Input 
                                type="number" 
                                className="pl-8 h-9 text-sm font-semibold"
                                value={plan.price} 
                                onChange={(e) => handlePlanChange(plan.id, 'price', e.target.value)} 
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Offer / Special Price (৳)</label>
                            <div className="relative">
                              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-emerald-500" />
                              <Input 
                                type="number" 
                                className="pl-8 h-9 text-sm font-bold text-emerald-600"
                                value={plan.discount_price} 
                                onChange={(e) => handlePlanChange(plan.id, 'discount_price', e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-background/80 rounded-lg p-2.5 text-xs space-y-1 border">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Base Subtotal:</span>
                            <span>৳{base}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                              <span>Marketing Offer Discount:</span>
                              <span>-৳{discount}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground">
                            <span>Govt VAT (5% Incl.):</span>
                            <span>৳{vat.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm pt-1 border-t">
                            <span>Final User Payable:</span>
                            <span className="text-emerald-600 font-extrabold">৳{offer}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Verification Request Details</DialogTitle>
              {selectedRequest && (selectedRequest.category === 'government' || (selectedRequest.plan_id && selectedRequest.plan_id.includes('government')) ? (
                <Badge className="bg-slate-500/10 text-slate-700 border-slate-300 text-xs">🏛️ Government Verification (Gray)</Badge>
              ) : selectedRequest.category === 'business' || (selectedRequest.plan_id && selectedRequest.plan_id.includes('business')) ? (
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-xs">👑 Business Verification (Gold)</Badge>
              ) : selectedRequest.is_student || selectedRequest.id_type === 'student_id' ? (
                <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 text-xs">🎓 Student Verification</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">🆔 General Personal Verification</Badge>
              ))}
            </div>
          </DialogHeader>
          {selectedRequest && (
            <ScrollArea className="max-h-[80vh]">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Full Name</p><p className="font-medium">{selectedRequest.full_name || getUser(selectedRequest)?.full_name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Username</p><p className="font-medium">@{selectedRequest.username || getUser(selectedRequest)?.username}</p></div>
                  <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{selectedRequest.email}</p></div>
                  <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{selectedRequest.phone}</p></div>
                  <div><p className="text-sm text-muted-foreground">Date of Birth</p><p className="font-medium">{selectedRequest.date_of_birth || 'N/A'}</p></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category / Plan</p>
                    <p className="font-medium capitalize">{selectedRequest.category || 'General'} ({selectedRequest.plan_id || 'Standard'})</p>
                  </div>
                  {getUser(selectedRequest)?.occupation && (
                    <div><p className="text-sm text-muted-foreground">Occupation</p><p className="font-medium">{getUser(selectedRequest)?.occupation}</p></div>
                  )}
                  {getUser(selectedRequest)?.education && (
                    <div><p className="text-sm text-muted-foreground">Education</p><p className="font-medium">{getUser(selectedRequest)?.education}</p></div>
                  )}
                  {getUser(selectedRequest)?.blood_group && (
                    <div>
                      <p className="text-sm text-muted-foreground">Blood Group</p>
                      <p className="font-bold text-rose-500">🩸 {getUser(selectedRequest)?.blood_group}</p>
                    </div>
                  )}
                </div>

                {/* Government Specific Credentials & Info */}
                {(selectedRequest.category === 'government' || (selectedRequest.plan_id && selectedRequest.plan_id.includes('government'))) && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><Landmark className="size-4" /> Government Credentials</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.gov_ministry_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Ministry / Department</p>
                          <p className="text-sm font-medium">{selectedRequest.gov_ministry_name}</p>
                        </div>
                      )}
                      {selectedRequest.gov_designation && (
                        <div>
                          <p className="text-xs text-muted-foreground">Official Designation</p>
                          <p className="text-sm font-medium">{selectedRequest.gov_designation}</p>
                        </div>
                      )}
                      {selectedRequest.gov_email && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="size-3" /> Official Gov Email</p>
                          <p className="text-sm font-medium">{selectedRequest.gov_email}</p>
                        </div>
                      )}
                      {selectedRequest.gov_website_url && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="size-3" /> Official Gov Portal</p>
                          <a href={selectedRequest.gov_website_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all">
                            {selectedRequest.gov_website_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Business Specific Credentials & Links */}
                {(selectedRequest.category === 'business' || (selectedRequest.plan_id && selectedRequest.plan_id.includes('business'))) && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5"><Building className="size-4" /> Business Credentials</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRequest.website_url && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="size-3" /> Website Link</p>
                          <a href={selectedRequest.website_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all">
                            {selectedRequest.website_url}
                          </a>
                        </div>
                      )}
                      {selectedRequest.business_email && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="size-3" /> Business Email</p>
                          <p className="text-sm font-medium">{selectedRequest.business_email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Documents Grid */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Uploaded Verification Documents</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Government Employee ID */}
                    {selectedRequest.gov_id_card_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🏛️ Gov Employee ID</p>
                        <a href={selectedRequest.gov_id_card_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.gov_id_card_url} alt="Gov ID Card" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* Government GO Order Letter */}
                    {selectedRequest.gov_auth_letter_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">📜 Gov Order (GO)</p>
                        <a href={selectedRequest.gov_auth_letter_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.gov_auth_letter_url} alt="Gov Order" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* Business Trade License */}
                    {selectedRequest.trade_license_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">📜 Trade License</p>
                        <a href={selectedRequest.trade_license_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.trade_license_url} alt="Trade License" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* Business TIN Certificate */}
                    {selectedRequest.tin_certificate_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🧾 TIN Certificate</p>
                        <a href={selectedRequest.tin_certificate_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.tin_certificate_url} alt="TIN Certificate" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* Business Company Reg Certificate */}
                    {selectedRequest.company_reg_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🏛️ Company Reg (RJSC)</p>
                        <a href={selectedRequest.company_reg_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.company_reg_url} alt="Company Reg" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* NID Front */}
                    {selectedRequest.nid_front_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🆔 Applicant NID Front</p>
                        <a href={selectedRequest.nid_front_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.nid_front_url} alt="NID Front" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* NID Back */}
                    {selectedRequest.nid_back_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🆔 Applicant NID Back</p>
                        <a href={selectedRequest.nid_back_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.nid_back_url} alt="NID Back" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                    {/* Selfie Scan */}
                    {selectedRequest.face_image_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">🤳 Selfie Scan</p>
                        <a href={selectedRequest.face_image_url} target="_blank" rel="noreferrer">
                          <img src={selectedRequest.face_image_url} alt="Face Verification" className="rounded-md border bg-muted aspect-video object-cover w-full hover:opacity-90" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div><p className="text-sm text-muted-foreground">bKash Sender Number</p><p className="font-medium">{selectedRequest.bkash_sender_number || 'N/A'}</p></div>
                  <div><p className="text-sm text-muted-foreground">bKash TrxID</p><p className="font-medium font-mono text-sm">{selectedRequest.bkash_trx_id || 'N/A'}</p></div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Badge Category</p>
                    <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select badge" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">🔵 Blue (Personal)</SelectItem>
                        <SelectItem value="gold">👑 Gold (Business)</SelectItem>
                        <SelectItem value="gray">🏛️ Gray (Government)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Plan Tier</p>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Standard Basic</SelectItem>
                        <SelectItem value="premium">⭐ Premium Tier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Badge Duration</p>
                    <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">📅 Weekly (7d)</SelectItem>
                        <SelectItem value="monthly">📅 Monthly (30d)</SelectItem>
                        <SelectItem value="yearly">📅 Yearly (365d)</SelectItem>
                        <SelectItem value="lifetime">♾️ Lifetime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button variant="destructive" onClick={() => { handleReject(selectedRequest.id); setSelectedRequest(null) }}>Reject</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => handleApprove(selectedRequest, selectedBadge, selectedTier, selectedDuration)}>
                        Approve ({selectedBadge.toUpperCase()} • {selectedTier.toUpperCase()})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
