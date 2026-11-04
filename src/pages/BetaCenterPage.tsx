import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { 
  Bug, 
  Lightbulb, 
  MessageSquare, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  Search,
  Trash2,
  Eye,
  ThumbsUp,
  RefreshCw,
  XCircle,
  Bell,
  ArrowUpDown,
  Check,
  ExternalLink,
  Filter
} from "lucide-react"
import { toast } from "sonner"
import { sendPushNotification } from "@/lib/fcm"

function normalizeStatus(status?: string): string {
  if (!status) return "Pending"
  const s = status.toLowerCase()
  if (s === "received" || s === "pending") return "Pending"
  if (s === "under review") return "Under Review"
  if (s === "planning" || s === "planned") return "Planning"
  if (s === "coming soon") return "Coming Soon"
  if (s === "in progress" || s === "fixing") return "In Progress"
  if (s === "shipped" || s === "implemented" || s === "fixed") return "Shipped"
  if (s === "rejected" || s === "closed") return "Rejected"
  return status
}

export function BetaCenterPage() {
  const [bugs, setBugs] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [feedback, setFeedback] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Community feature requests filtering & selection
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null)
  const [searchFeatureQuery, setSearchFeatureQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"votes" | "newest" | "oldest">("votes")

  // Bug filters
  const [searchBugQuery, setSearchBugQuery] = useState("")
  const [bugStatusFilter, setBugStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchData()

    // Setup Supabase Realtime for instant dynamic updates
    const channel = supabase
      .channel("beta_center_realtime_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "beta_features" }, () => {
        fetchData(false)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "beta_bugs" }, () => {
        fetchData(false)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "beta_feedback" }, () => {
        fetchData(false)
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, () => {
        fetchData(false)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchData(showLoader = true) {
    if (showLoader) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      // 1. Fetch raw features with profiles
      const { data: featuresData, error: featErr } = await supabase
        .from("beta_features")
        .select("*, profiles(id, full_name, username, avatar_url, fcm_token)")
        .order("created_at", { ascending: false })

      if (featErr) throw featErr

      // 2. Fetch votes from audit_logs
      const { data: votesData } = await supabase
        .from("audit_logs")
        .select("action, details")
        .like("action", "vote:%")

      const voteMap: Record<string, number> = {}
      if (votesData) {
        for (const row of votesData) {
          const itemId = (row.action || "").replace("vote:", "")
          if (itemId) {
            const isUpvote = row.details === "upvote"
            voteMap[itemId] = (voteMap[itemId] || 0) + (isUpvote ? 1 : -1)
          }
        }
      }

      // Attach votes to features
      const enhancedFeatures = (featuresData || []).map((f: any) => ({
        ...f,
        votes: Math.max(0, voteMap[f.id] || 0),
      }))

      // 3. Fetch bugs & feedback
      const { data: bugsData } = await supabase
        .from("beta_bugs")
        .select("*, profiles(id, full_name, username, avatar_url)")
        .order("created_at", { ascending: false })

      const { data: feedbackData } = await supabase
        .from("beta_feedback")
        .select("*, profiles(id, full_name, username, avatar_url)")
        .order("created_at", { ascending: false })

      setFeatures(enhancedFeatures)
      if (bugsData) setBugs(bugsData)
      if (feedbackData) setFeedback(feedbackData)

      // Sync selected feature if modal is open
      if (selectedFeature) {
        const updated = enhancedFeatures.find((f: any) => f.id === selectedFeature.id)
        if (updated) setSelectedFeature(updated)
      }
    } catch (error: any) {
      console.error("Error fetching beta center data:", error)
      toast.error(`Failed to load data: ${error.message || "Unknown error"}`)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  async function updateFeatureStatus(feature: any, newStatus: string) {
    try {
      const { error } = await supabase
        .from("beta_features")
        .update({ status: newStatus })
        .eq("id", feature.id)

      if (error) throw error

      setFeatures((prev) =>
        prev.map((f) => (f.id === feature.id ? { ...f, status: newStatus } : f))
      )
      if (selectedFeature?.id === feature.id) {
        setSelectedFeature((prev: any) => ({ ...prev, status: newStatus }))
      }

      toast.success(`Feature "${feature.title}" moved to ${newStatus}!`)

      // Dynamic in-app & push notification dispatch
      if (feature.user_id) {
        const title = "Feature Proposal Update 🚀"
        const body = `Your proposed feature "${feature.title}" is now marked as "${newStatus}"!`

        // In-app notification
        try {
          await supabase.from("notifications").insert({
            user_id: feature.user_id,
            actor_id: feature.user_id,
            type: "mention",
            content: `${title}: ${body}`,
            is_read: false,
          })
        } catch (notifErr) {
          console.error("In-app notification error:", notifErr)
        }

        // Push notification via FCM
        const token = feature.profiles?.fcm_token
        if (token) {
          try {
            const ok = await sendPushNotification(token, title, body, {
              channelId: "pigeon_activity",
              tag: `feat_status_${feature.id}`,
              type: "feature_update",
            })
            if (ok) {
              toast.info(`Push notification sent to @${feature.profiles?.username || "user"}`)
            }
          } catch (fcmErr) {
            console.error("FCM push error:", fcmErr)
          }
        }
      }
    } catch (error: any) {
      console.error("Error updating feature status:", error)
      toast.error(`Failed to update status: ${error.message || "Database constraint violation"}`)
    }
  }

  async function deleteFeature(feature: any) {
    if (!window.confirm(`Are you sure you want to delete "${feature.title}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from("beta_features").delete().eq("id", feature.id)
      if (error) throw error

      setFeatures((prev) => prev.filter((f) => f.id !== feature.id))
      if (selectedFeature?.id === feature.id) setSelectedFeature(null)
      toast.success(`Feature proposal "${feature.title}" deleted`)
    } catch (err: any) {
      console.error("Error deleting feature:", err)
      toast.error(`Failed to delete: ${err.message || "Unknown error"}`)
    }
  }

  async function updateStatus(table: "beta_bugs" | "beta_features", id: string, status: string) {
    try {
      const updateData = table === "beta_bugs" && status === "Pending" ? null : status
      const { error } = await supabase.from(table).update({ status: updateData }).eq("id", id)

      if (error) throw error

      toast.success(`Status updated to ${status}`)

      if (table === "beta_bugs") {
        setBugs(bugs.map((b) => (b.id === id ? { ...b, status } : b)))
      } else {
        setFeatures(features.map((f) => (f.id === id ? { ...f, status } : f)))
      }
    } catch (error: any) {
      console.error("Error updating status:", error)
      toast.error(`Failed to update status: ${error.message || "Unknown error"}`)
    }
  }

  async function deleteBug(bug: any) {
    if (!window.confirm(`Delete bug report "${bug.title}"?`)) return
    try {
      const { error } = await supabase.from("beta_bugs").delete().eq("id", bug.id)
      if (error) throw error
      setBugs((prev) => prev.filter((b) => b.id !== bug.id))
      toast.success("Bug report deleted")
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`)
    }
  }

  async function addToKnownIssues(bug: any) {
    try {
      const { data: existing } = await supabase
        .from("beta_known_issues")
        .select("id")
        .eq("title", bug.title)
        .maybeSingle()

      if (existing) {
        toast.warning("This issue is already in Known Issues")
        return
      }

      const { error } = await supabase.from("beta_known_issues").insert({
        title: bug.title,
        description: bug.description,
        status: "Investigating",
      })

      if (error) throw error
      toast.success("Added to Known Issues list for users to see")
    } catch (error) {
      console.error("Error adding to known issues:", error)
      toast.error("Failed to add to Known Issues")
    }
  }

  // Filtered & Sorted Features Memo
  const filteredFeatures = useMemo(() => {
    return features
      .filter((f) => {
        if (searchFeatureQuery.trim()) {
          const q = searchFeatureQuery.toLowerCase()
          const title = (f.title || "").toLowerCase()
          const desc = (f.description || "").toLowerCase()
          const benefit = (f.expected_benefit || "").toLowerCase()
          const username = (f.profiles?.username || "").toLowerCase()
          const name = (f.profiles?.full_name || "").toLowerCase()
          if (!title.includes(q) && !desc.includes(q) && !benefit.includes(q) && !username.includes(q) && !name.includes(q)) {
            return false
          }
        }
        if (statusFilter !== "all") {
          const norm = normalizeStatus(f.status)
          if (norm.toLowerCase() !== statusFilter.toLowerCase()) return false
        }
        if (categoryFilter !== "all" && f.expected_benefit !== categoryFilter) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "votes") {
          const vDiff = (b.votes || 0) - (a.votes || 0)
          if (vDiff !== 0) return vDiff
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        }
        if (sortBy === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        }
        return 0
      })
  }, [features, searchFeatureQuery, statusFilter, categoryFilter, sortBy])

  // Filtered Bugs Memo
  const filteredBugs = useMemo(() => {
    return bugs.filter((b) => {
      if (searchBugQuery.trim()) {
        const q = searchBugQuery.toLowerCase()
        const title = (b.title || "").toLowerCase()
        const desc = (b.description || "").toLowerCase()
        const screen = (b.screen || "").toLowerCase()
        const user = (b.profiles?.username || "").toLowerCase()
        if (!title.includes(q) && !desc.includes(q) && !screen.includes(q) && !user.includes(q)) {
          return false
        }
      }
      if (bugStatusFilter !== "all") {
        const s = (b.status || "Pending").toLowerCase()
        if (bugStatusFilter.toLowerCase() !== s) return false
      }
      return true
    })
  }, [bugs, searchBugQuery, bugStatusFilter])

  // Unique categories for filtering
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    features.forEach((f) => {
      if (f.expected_benefit) set.add(f.expected_benefit)
    })
    return Array.from(set)
  }, [features])

  // Aggregate stats
  const totalBugs = bugs.length
  const solvedBugs = bugs.filter((b) => b.status === "Fixed").length
  const totalFeatures = features.length
  const pendingFeatures = features.filter((f) => normalizeStatus(f.status) === "Pending").length
  const shippedFeatures = features.filter((f) => normalizeStatus(f.status) === "Shipped").length
  const planningFeatures = features.filter((f) => normalizeStatus(f.status) === "Planning").length
  const inProgressFeatures = features.filter((f) => normalizeStatus(f.status) === "In Progress").length
  const totalCommunityVotes = useMemo(() => {
    return features.reduce((sum, f) => sum + (f.votes || 0), 0)
  }, [features])

  const avgRating =
    feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1)
      : "N/A"

  const processChartData = () => {
    const dataMap: Record<string, { date: string; bugs: number; features: number; feedback: number }> = {}

    const addToMap = (items: any[], type: "bugs" | "features" | "feedback") => {
      items.forEach((item) => {
        if (!item.created_at) return
        const dateStr = format(parseISO(item.created_at), "MMM dd")
        if (!dataMap[dateStr]) {
          dataMap[dateStr] = { date: dateStr, bugs: 0, features: 0, feedback: 0 }
        }
        dataMap[dateStr][type]++
      })
    }

    addToMap(bugs, "bugs")
    addToMap(features, "features")
    addToMap(feedback, "feedback")

    return Object.values(dataMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
  }

  const chartData = processChartData()

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    const norm = normalizeStatus(status)
    switch (norm) {
      case "Shipped":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium">
            <CheckCircle className="w-3 h-3 mr-1" /> Shipped
          </Badge>
        )
      case "In Progress":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">
            <Clock className="w-3 h-3 mr-1" /> In Progress
          </Badge>
        )
      case "Coming Soon":
        return (
          <Badge className="bg-sky-500 hover:bg-sky-600 text-white font-medium">
            <Sparkles className="w-3 h-3 mr-1" /> Coming Soon
          </Badge>
        )
      case "Planning":
        return (
          <Badge className="bg-purple-500 hover:bg-purple-600 text-white font-medium">
            <Lightbulb className="w-3 h-3 mr-1" /> Planning
          </Badge>
        )
      case "Under Review":
        return (
          <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium">
            <Search className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        )
      case "Pending":
        return (
          <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 font-medium">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        )
      case "Rejected":
        return (
          <Badge variant="destructive" className="font-medium">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="font-medium">
            <AlertTriangle className="w-3 h-3 mr-1 text-muted-foreground" /> {status || "Pending"}
          </Badge>
        )
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">What's Coming & Beta Center</h1>
          <p className="text-muted-foreground">
            Monitor community feature proposals, vote trends, roadmap stages, and user beta submissions in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(false)}
            disabled={isRefreshing}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            {isRefreshing ? "Syncing..." : "Sync Realtime"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Community Feature Posts</CardTitle>
            <Lightbulb className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeatures}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="text-orange-500 font-semibold">{pendingFeatures} Pending</span>
              <span>•</span>
              <span className="text-purple-500 font-semibold">{planningFeatures} Planning</span>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{shippedFeatures} Shipped</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Community Upvotes</CardTitle>
            <ThumbsUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCommunityVotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Votes cast by mobile app users on roadmap features
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
            <Bug className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBugs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {solvedBugs} fixed ({totalBugs > 0 ? Math.round((solvedBugs / totalBugs) * 100) : 0}% completion)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beta Tester Rating</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating} <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on {feedback.length} user reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="features" className="w-full">
        <TabsList className="mb-6 h-10">
          <TabsTrigger value="features" className="gap-2 px-4 font-semibold text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-orange-500" />
            What's Coming & Community Requests ({features.length})
          </TabsTrigger>
          <TabsTrigger value="bugs" className="gap-2 px-4 font-semibold text-xs sm:text-sm">
            <Bug className="w-4 h-4 text-red-500" />
            Bug Reports ({bugs.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 px-4 font-semibold text-xs sm:text-sm">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Feedback ({feedback.length})
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 px-4 font-semibold text-xs sm:text-sm">
            <BarChart className="w-4 h-4 text-purple-500" />
            Activity Trends
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 1: WHAT'S COMING & COMMUNITY REQUESTS                   */}
        {/* ─────────────────────────────────────────────────────────── */}
        <TabsContent value="features" className="space-y-4">
          {/* Controls Bar: Search, Status Filters, Category, Sort */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search feature ideas, descriptions, or @username..."
                    value={searchFeatureQuery}
                    onChange={(e) => setSearchFeatureQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                  {searchFeatureQuery && (
                    <button
                      onClick={() => setSearchFeatureQuery("")}
                      className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category & Sorting Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[145px] h-9 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort by */}
                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="votes">Most Upvotes</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                {[
                  { key: "all", label: "All", count: features.length },
                  { key: "Pending", label: "Pending", count: pendingFeatures },
                  { key: "Under Review", label: "Under Review", count: features.filter((f) => normalizeStatus(f.status) === "Under Review").length },
                  { key: "Planning", label: "Planning", count: planningFeatures },
                  { key: "In Progress", label: "In Progress", count: inProgressFeatures },
                  { key: "Coming Soon", label: "Coming Soon", count: features.filter((f) => normalizeStatus(f.status) === "Coming Soon").length },
                  { key: "Shipped", label: "Shipped", count: shippedFeatures },
                  { key: "Rejected", label: "Rejected", count: features.filter((f) => normalizeStatus(f.status) === "Rejected").length },
                ].map((st) => (
                  <Button
                    key={st.key}
                    variant={statusFilter.toLowerCase() === st.key.toLowerCase() ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={() => setStatusFilter(st.key)}
                  >
                    {st.label} ({st.count})
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[220px]">Author</TableHead>
                    <TableHead className="w-[380px]">Feature Proposal</TableHead>
                    <TableHead className="w-[120px] text-center">Community Votes</TableHead>
                    <TableHead className="w-[140px]">Current Status</TableHead>
                    <TableHead className="w-[200px]">Change Stage</TableHead>
                    <TableHead className="text-right w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-primary opacity-60" />
                        <p className="font-semibold text-sm">Loading community proposals...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredFeatures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
                        <p className="font-semibold text-sm">No community feature requests found</p>
                        <p className="text-xs mt-1">
                          {searchFeatureQuery || statusFilter !== "all" || categoryFilter !== "all"
                            ? "Try adjusting your search query or status filter."
                            : "User proposals from the mobile app's What's Coming screen will appear here."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!isLoading && filteredFeatures.map((feature) => (
                    <TableRow key={feature.id} className="hover:bg-muted/30 transition-colors">
                      {/* Author */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              feature.profiles?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                feature.profiles?.username || "User"
                              )}&background=random`
                            }
                            className="w-9 h-9 rounded-full object-cover border border-border"
                            alt="avatar"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs truncate max-w-[140px]" title={feature.profiles?.full_name}>
                              {feature.profiles?.full_name || "Anonymous Member"}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                              @{feature.profiles?.username || "user"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80 mt-0.5">
                              {feature.created_at
                                ? formatDistanceToNow(parseISO(feature.created_at), { addSuffix: true })
                                : "Recently"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Feature Proposal */}
                      <TableCell>
                        <div className="flex flex-col gap-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              onClick={() => setSelectedFeature(feature)}
                              className="font-bold text-sm text-foreground hover:text-primary cursor-pointer transition-colors"
                            >
                              {feature.title}
                            </span>
                            {feature.expected_benefit && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/60 text-muted-foreground">
                                {feature.expected_benefit}
                              </Badge>
                            )}
                          </div>
                          <p
                            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
                            title={feature.description}
                          >
                            {feature.description}
                          </p>
                        </div>
                      </TableCell>

                      {/* Community Votes */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{feature.votes || 0}</span>
                        </div>
                      </TableCell>

                      {/* Current Status */}
                      <TableCell>{getStatusBadge(feature.status)}</TableCell>

                      {/* Change Stage Dropdown */}
                      <TableCell>
                        <Select
                          value={normalizeStatus(feature.status)}
                          onValueChange={(val) => updateFeatureStatus(feature, val)}
                        >
                          <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
                            <SelectValue placeholder="Set Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">⏳ Pending Review</SelectItem>
                            <SelectItem value="Under Review">🔍 Under Review</SelectItem>
                            <SelectItem value="Planning">💡 Planning (Roadmap)</SelectItem>
                            <SelectItem value="In Progress">⚙️ In Progress</SelectItem>
                            <SelectItem value="Coming Soon">✨ Coming Soon</SelectItem>
                            <SelectItem value="Shipped">🚀 Shipped (Live)</SelectItem>
                            <SelectItem value="Rejected">❌ Rejected / Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => setSelectedFeature(feature)}
                            title="View full description and proposal details"
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteFeature(feature)}
                            title="Delete this proposal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 2: BUG REPORTS                                          */}
        {/* ─────────────────────────────────────────────────────────── */}
        <TabsContent value="bugs" className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bug reports, screens, or users..."
                  value={searchBugQuery}
                  onChange={(e) => setSearchBugQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={bugStatusFilter} onValueChange={setBugStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="w-[320px]">Issue</TableHead>
                    <TableHead>Screen</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBugs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No bug reports found.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredBugs.map((bug) => (
                    <TableRow key={bug.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              bug.profiles?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(bug.profiles?.username || "User")}`
                            }
                            className="w-8 h-8 rounded-full object-cover border border-border"
                            alt="avatar"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{bug.profiles?.full_name}</span>
                            <span className="text-[11px] text-muted-foreground">@{bug.profiles?.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col max-w-[300px]">
                          <span className="font-semibold text-sm">{bug.title}</span>
                          <span className="text-xs text-muted-foreground truncate" title={bug.description}>
                            {bug.description}
                          </span>
                          {bug.screenshot_url && (
                            <a
                              href={bug.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              View Screenshot <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {bug.screen || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getSeverityBadge(bug.severity)}</TableCell>
                      <TableCell>{getStatusBadge(bug.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            defaultValue={bug.status || "Pending"}
                            onValueChange={(val) => updateStatus("beta_bugs", bug.id, val)}
                          >
                            <SelectTrigger className="w-[125px] h-8 text-xs">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Fixed">Fixed</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => addToKnownIssues(bug)}
                            title="Add to public Known Issues in App"
                          >
                            To Issues
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteBug(bug)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 3: FEEDBACK                                             */}
        {/* ─────────────────────────────────────────────────────────── */}
        <TabsContent value="feedback">
          <Card className="border-border overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="w-[350px]">What they liked</TableHead>
                    <TableHead className="w-[350px]">What to improve</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No feedback found.
                      </TableCell>
                    </TableRow>
                  )}
                  {feedback.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              f.profiles?.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(f.profiles?.username || "User")}`
                            }
                            className="w-8 h-8 rounded-full object-cover border border-border"
                            alt="avatar"
                          />
                          <div className="flex flex-col">
                            <span className="font-medium text-xs">{f.profiles?.full_name}</span>
                            <span className="text-[11px] text-muted-foreground">@{f.profiles?.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-base leading-none">
                              {i < (f.rating || 0) ? "★" : "☆"}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs leading-relaxed">{f.liked || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs leading-relaxed">{f.improved || "—"}</p>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {f.created_at ? format(parseISO(f.created_at), "MMM dd, yyyy") : "Unknown"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 4: ACTIVITY TRENDS                                      */}
        {/* ─────────────────────────────────────────────────────────── */}
        <TabsContent value="trends">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Submission & Activity Trends</CardTitle>
              <CardDescription>Visualizing bugs, features, and feedback intake over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="features" name="Community Proposals" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="bugs" name="Bugs" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="feedback" name="Feedback" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* DETAIL DIALOG FOR COMMUNITY REQUESTS                        */}
      {/* ─────────────────────────────────────────────────────────── */}
      <Dialog open={!!selectedFeature} onOpenChange={(open) => !open && setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Community Proposal Details
                  </span>
                  {getStatusBadge(selectedFeature.status)}
                </div>
                <DialogTitle className="text-xl font-bold mt-1 text-foreground leading-snug">
                  {selectedFeature.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submitted {selectedFeature.created_at ? format(parseISO(selectedFeature.created_at), "PPP p") : "Recently"}
                </DialogDescription>
              </DialogHeader>

              {/* Author & Votes Info Banner */}
              <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedFeature.profiles?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedFeature.profiles?.username || "User"
                      )}&background=random`
                    }
                    className="w-10 h-10 rounded-full object-cover border border-border"
                    alt="avatar"
                  />
                  <div>
                    <p className="font-semibold text-sm">{selectedFeature.profiles?.full_name || "Community Member"}</p>
                    <p className="text-xs text-muted-foreground">@{selectedFeature.profiles?.username || "user"}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/30">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{selectedFeature.votes || 0} Community Upvotes</span>
                  </div>
                  {selectedFeature.profiles?.fcm_token ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Push Alerts Enabled
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">In-App Notification Only</span>
                  )}
                </div>
              </div>

              {/* Category Pill */}
              {selectedFeature.expected_benefit && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Category / Expected Benefit:</span>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
                      {selectedFeature.expected_benefit}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Description Body */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description & Use Case
                </span>
                <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {selectedFeature.description}
                </div>
              </div>

              {/* Dynamic Status Workflow Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Advance Roadmap Stage (Updates mobile app & alerts user):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { status: "Pending", label: "⏳ Pending", desc: "Awaiting review", color: "hover:border-orange-500" },
                    { status: "Under Review", label: "🔍 Under Review", desc: "Evaluating idea", color: "hover:border-indigo-500" },
                    { status: "Planning", label: "💡 Planning", desc: "On official roadmap", color: "hover:border-purple-500" },
                    { status: "In Progress", label: "⚙️ In Progress", desc: "Being built now", color: "hover:border-amber-500" },
                    { status: "Coming Soon", label: "✨ Coming Soon", desc: "Next release", color: "hover:border-sky-500" },
                    { status: "Shipped", label: "🚀 Shipped", desc: "Released live", color: "hover:border-emerald-500" },
                    { status: "Rejected", label: "❌ Reject / Close", desc: "Declined", color: "hover:border-red-500" },
                  ].map((s) => {
                    const isCurrent = normalizeStatus(selectedFeature.status).toLowerCase() === s.status.toLowerCase()
                    return (
                      <Button
                        key={s.status}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFeatureStatus(selectedFeature, s.status)}
                        className={`h-auto py-2 px-3 flex flex-col items-start text-left justify-center ${s.color} transition-all`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs">{s.label}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 ml-1 text-primary-foreground" />}
                        </div>
                        <span className={`text-[10px] ${isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {s.desc}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              <DialogFooter className="flex sm:justify-between items-center pt-3 border-t border-border">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteFeature(selectedFeature)}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Request
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedFeature(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
