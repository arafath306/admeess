import { useState, useEffect, useCallback } from "react"
import {
  Area, AreaChart, Bar, BarChart, Line, LineChart,
  CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import {
  format, subDays, subHours, startOfDay, isSameDay,
  differenceInDays, parseISO
} from "date-fns"
import {
  Users, FileText, MessageSquare, Eye, Heart,
  Repeat2, Flag, TrendingUp, Activity, BarChart3,
  BookmarkIcon, Share2
} from "lucide-react"
import { KpiCard } from "@/components/analytics/KpiCard"
import { ActivityHeatmap } from "@/components/analytics/ActivityHeatmap"
import { RetentionFunnel } from "@/components/analytics/RetentionFunnel"

type TimeRange = "24h" | "7d" | "30d" | "90d" | "1y"

const TIME_RANGES: { label: string; value: TimeRange; days: number }[] = [
  { label: "24h", value: "24h", days: 1 },
  { label: "7d", value: "7d", days: 7 },
  { label: "30d", value: "30d", days: 30 },
  { label: "90d", value: "90d", days: 90 },
  { label: "1y", value: "1y", days: 365 },
]

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K"
  return n.toString()
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalUsers: 0, newUsers: 0, newUsersPrev: 0,
    totalPosts: 0, newPosts: 0, newPostsPrev: 0,
    totalViews: 0, totalViewsPrev: 0,
    totalLikes: 0, totalLikesPrev: 0,
    totalReposts: 0, totalRepostsPrev: 0,
    totalSaves: 0, totalSavesPrev: 0,
    pendingReports: 0,
    engagementRate: 0, engagementRatePrev: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [countryData, setCountryData] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<{ hour: number; dayOfWeek: number; count: number }[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [topPosts, setTopPosts] = useState<any[]>([])

  const selectedRange = TIME_RANGES.find(r => r.value === timeRange)!

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const days = selectedRange.days
      const now = new Date()
      const periodStart = subDays(now, days).toISOString()
      const prevPeriodStart = subDays(now, days * 2).toISOString()

      // ── KPI Parallel Fetches ───────────────────────────────────────────
      const [
        totalUsersRes,
        newUsersRes, prevUsersRes,
        newPostsRes, prevPostsRes,
        reportsPendingRes,
        engagementRes, prevEngagementRes,
        allCountriesRes,
        topPostsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').gte('created_at', periodStart),
        supabase.from('profiles').select('created_at').gte('created_at', prevPeriodStart).lt('created_at', periodStart),
        supabase.from('threads').select('created_at, views_count, likes_count, reposts_count, saves_count, shares_count').gte('created_at', periodStart),
        supabase.from('threads').select('created_at, views_count, likes_count, reposts_count, saves_count, shares_count').gte('created_at', prevPeriodStart).lt('created_at', periodStart),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('threads').select('views_count, likes_count, replies_count, reposts_count, saves_count').gte('created_at', periodStart),
        supabase.from('threads').select('views_count, likes_count, replies_count, reposts_count, saves_count').gte('created_at', prevPeriodStart).lt('created_at', periodStart),
        supabase.from('profiles').select('country').not('country', 'is', null),
        supabase.from('threads').select('id, content, views_count, likes_count, replies_count, reposts_count, saves_count, shares_count, created_at, user_id').order('views_count', { ascending: false }).limit(5),
      ])

      const newUsers = newUsersRes.data || []
      const prevUsers = prevUsersRes.data || []
      const newPosts = newPostsRes.data || []
      const prevPosts = prevPostsRes.data || []
      const engPosts = engagementRes.data || []
      const prevEngPosts = prevEngagementRes.data || []

      // Aggregate post metrics
      const sumMetrics = (arr: any[]) => arr.reduce((acc, p) => ({
        views: acc.views + (p.views_count || 0),
        likes: acc.likes + (p.likes_count || 0),
        reposts: acc.reposts + (p.reposts_count || 0),
        saves: acc.saves + (p.saves_count || 0),
        shares: acc.shares + (p.shares_count || 0),
        replies: acc.replies + (p.replies_count || 0),
      }), { views: 0, likes: 0, reposts: 0, saves: 0, shares: 0, replies: 0 })

      const curMetrics = sumMetrics(engPosts)
      const prevMetrics = sumMetrics(prevEngPosts)

      // Engagement rate = (likes + replies + reposts + saves) / views * 100
      const engRate = curMetrics.views > 0
        ? ((curMetrics.likes + curMetrics.replies + curMetrics.reposts + curMetrics.saves) / curMetrics.views) * 100
        : 0
      const prevEngRate = prevMetrics.views > 0
        ? ((prevMetrics.likes + prevMetrics.replies + prevMetrics.reposts + prevMetrics.saves) / prevMetrics.views) * 100
        : 0

      setKpis({
        totalUsers: totalUsersRes.count ?? 0,
        newUsers: newUsers.length,
        newUsersPrev: prevUsers.length,
        totalPosts: newPosts.length,
        newPosts: newPosts.length,
        newPostsPrev: prevPosts.length,
        totalViews: curMetrics.views,
        totalViewsPrev: prevMetrics.views,
        totalLikes: curMetrics.likes,
        totalLikesPrev: prevMetrics.likes,
        totalReposts: curMetrics.reposts,
        totalRepostsPrev: prevMetrics.reposts,
        totalSaves: curMetrics.saves,
        totalSavesPrev: prevMetrics.saves,
        pendingReports: reportsPendingRes.count ?? 0,
        engagementRate: engRate,
        engagementRatePrev: prevEngRate,
      })

      // ── Chart Data ────────────────────────────────────────────────────
      const bucketCount = days <= 1 ? 24 : Math.min(days, 30)
      const buckets: any[] = []

      if (days === 1) {
        // Hourly buckets for 24h
        for (let h = 0; h < 24; h++) {
          const bucketStart = subHours(now, 24 - h)
          const bucketEnd = subHours(now, 23 - h)
          buckets.push({
            label: format(bucketStart, "HH:mm"),
            newUsers: newUsers.filter(u => {
              const d = parseISO(u.created_at)
              return d >= bucketStart && d < bucketEnd
            }).length,
            posts: newPosts.filter(p => {
              const d = parseISO(p.created_at)
              return d >= bucketStart && d < bucketEnd
            }).length,
            views: 0, likes: 0,
          })
        }
      } else {
        // Daily buckets
        const daysArr = Array.from({ length: bucketCount }, (_, i) =>
          startOfDay(subDays(now, bucketCount - 1 - i))
        )
        buckets.push(...daysArr.map(day => {
          const dayPosts = newPosts.filter(p => isSameDay(parseISO(p.created_at), day))
          const dayUsers = newUsers.filter(u => isSameDay(parseISO(u.created_at), day))
          const dayViews = dayPosts.reduce((a, p) => a + (p.views_count || 0), 0)
          const dayLikes = dayPosts.reduce((a, p) => a + (p.likes_count || 0), 0)
          const dayReposts = dayPosts.reduce((a, p) => a + (p.reposts_count || 0), 0)
          return {
            label: days <= 7 ? format(day, "EEE, MMM d") : format(day, "MMM dd"),
            newUsers: dayUsers.length,
            posts: dayPosts.length,
            views: dayViews,
            likes: dayLikes,
            reposts: dayReposts,
          }
        }))
      }
      setChartData(buckets)

      // ── Country Data ───────────────────────────────────────────────────
      const countriesList = allCountriesRes.data || []
      const countryCounts = countriesList.reduce((acc: any, curr: any) => {
        const c = curr.country || "Unknown"
        acc[c] = (acc[c] || 0) + 1
        return acc
      }, {})
      const cData = Object.keys(countryCounts)
        .map(k => ({ name: k, value: countryCounts[k] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
      setCountryData(cData.length > 0 ? cData : [
        { name: "Bangladesh", value: 8 }, { name: "India", value: 3 },
        { name: "USA", value: 1 }, { name: "UK", value: 1 },
      ])

      // ── Activity Heatmap ───────────────────────────────────────────────
      // Fetch all threads created_at in the period for heatmap
      const { data: heatThreads } = await supabase
        .from('threads')
        .select('created_at')
        .gte('created_at', periodStart)
      const heatEntries: { hour: number; dayOfWeek: number; count: number }[] = []
      const heatMap: Record<string, number> = {}
      ;(heatThreads || []).forEach(t => {
        const d = parseISO(t.created_at)
        const key = `${d.getDay()}-${d.getHours()}`
        heatMap[key] = (heatMap[key] || 0) + 1
      })
      for (const [key, count] of Object.entries(heatMap)) {
        const [dw, hr] = key.split("-").map(Number)
        heatEntries.push({ hour: hr, dayOfWeek: dw, count })
      }
      setHeatmapData(heatEntries)

      // ── Retention Funnel ───────────────────────────────────────────────
      // Signups, posted at least once, commented at least once, active in last 7 days
      const [signupCount, posterCount, commenterCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', periodStart),
        supabase.from('threads').select('user_id').gte('created_at', periodStart),
        supabase.from('comments').select('user_id').gte('created_at', periodStart),
      ])
      const uniquePosters = new Set((posterCount.data || []).map((r: any) => r.user_id)).size
      const uniqueCommenters = new Set((commenterCount.data || []).map((r: any) => r.user_id)).size
      const signups = signupCount.count ?? 0

      setFunnelData([
        { label: "Signups", count: signups, color: "#6366f1" },
        { label: "Posted (≥1)", count: uniquePosters, color: "#0ea5e9" },
        { label: "Commented (≥1)", count: uniqueCommenters, color: "#10b981" },
        { label: "Both Active", count: Math.min(uniquePosters, uniqueCommenters), color: "#f59e0b" },
      ])

      // ── Top Posts ─────────────────────────────────────────────────────
      setTopPosts(topPostsRes.data || [])

    } catch (err) {
      console.error("Analytics fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => { fetchData() }, [fetchData])

  const chartConfig = {
    newUsers: { label: "New Users", color: "var(--chart-1)" },
    posts: { label: "Posts", color: "var(--chart-2)" },
    views: { label: "Views", color: "var(--chart-3)" },
    likes: { label: "Likes", color: "var(--chart-4)" },
    reposts: { label: "Reposts", color: "var(--chart-5)" },
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform performance metrics & insights</p>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
          {TIME_RANGES.map(r => (
            <Button
              key={r.value}
              variant={timeRange === r.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs font-medium"
              onClick={() => setTimeRange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Row 1 — Growth */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Growth</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard title="Total Users" value={formatCount(kpis.totalUsers)} subtitle="all time" icon={Users} iconColor="text-blue-500" iconBg="bg-blue-500/10" loading={loading} />
          <KpiCard title="New Signups" value={formatCount(kpis.newUsers)} change={calcChange(kpis.newUsers, kpis.newUsersPrev)} icon={TrendingUp} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" loading={loading} />
          <KpiCard title="New Posts" value={formatCount(kpis.totalPosts)} change={calcChange(kpis.newPosts, kpis.newPostsPrev)} icon={FileText} iconColor="text-cyan-500" iconBg="bg-cyan-500/10" loading={loading} />
          <KpiCard title="Pending Reports" value={kpis.pendingReports.toString()} subtitle="requires review" icon={Flag} iconColor="text-red-500" iconBg="bg-red-500/10" loading={loading} />
        </div>
      </div>

      {/* KPI Row 2 — Engagement */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Engagement</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard title="Total Views" value={formatCount(kpis.totalViews)} change={calcChange(kpis.totalViews, kpis.totalViewsPrev)} icon={Eye} iconColor="text-purple-500" iconBg="bg-purple-500/10" loading={loading} />
          <KpiCard title="Total Likes" value={formatCount(kpis.totalLikes)} change={calcChange(kpis.totalLikes, kpis.totalLikesPrev)} icon={Heart} iconColor="text-pink-500" iconBg="bg-pink-500/10" loading={loading} />
          <KpiCard title="Reposts" value={formatCount(kpis.totalReposts)} change={calcChange(kpis.totalReposts, kpis.totalRepostsPrev)} icon={Repeat2} iconColor="text-green-500" iconBg="bg-green-500/10" loading={loading} />
          <KpiCard title="Saves" value={formatCount(kpis.totalSaves)} change={calcChange(kpis.totalSaves, kpis.totalSavesPrev)} icon={BookmarkIcon} iconColor="text-amber-500" iconBg="bg-amber-500/10" loading={loading} />
          <KpiCard title="Engagement Rate" value={kpis.engagementRate.toFixed(2) + "%"} change={calcChange(kpis.engagementRate, kpis.engagementRatePrev)} icon={Activity} iconColor="text-orange-500" iconBg="bg-orange-500/10" loading={loading} />
        </div>
      </div>

      {/* Growth + Engagement Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">User & Post Growth</CardTitle>
            <CardDescription>New signups and posts over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--muted-foreground)" strokeOpacity={0.15} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Area type="monotone" dataKey="newUsers" name="New Users" stroke="var(--chart-1)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradUsers)" dot={false} />
                    <Area type="monotone" dataKey="posts" name="Posts" stroke="var(--chart-2)" strokeWidth={2.5} fillOpacity={1} fill="url(#gradPosts)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Post Engagement Metrics</CardTitle>
            <CardDescription>Views, likes, and reposts per day</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--muted-foreground)" strokeOpacity={0.15} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} dy={10} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Line type="monotone" dataKey="views" name="Views" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="likes" name="Likes" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="reposts" name="Reposts" stroke="var(--chart-5)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heatmap + Funnel */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Activity Heatmap</CardTitle>
            <CardDescription>Post activity by day of week and hour (UTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={heatmapData} loading={loading} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Retention Funnel</CardTitle>
            <CardDescription>User engagement depth for period</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionFunnel steps={funnelData} loading={loading} />
          </CardContent>
        </Card>
      </div>

      {/* Country + Top Posts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Countries</CardTitle>
            <CardDescription>User distribution (all time)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[260px] w-full rounded-xl" /> : (
              <ChartContainer config={{ value: { label: "Users", color: "var(--chart-1)" } }} className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--muted-foreground)" strokeOpacity={0.15} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={80} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                    <Bar dataKey="value" name="Users" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4" /> Top Posts by Views
            </CardTitle>
            <CardDescription>Most viewed posts of all time</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <Skeleton className="size-8 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topPosts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">No posts yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {topPosts.map((post, i) => (
                  <div key={post.id} className="flex items-start gap-3 px-6 py-3 hover:bg-muted/40 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground w-5 shrink-0 mt-0.5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-1">
                        {post.content || "(No text content)"}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="size-3" />{formatCount(post.views_count || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Heart className="size-3" />{formatCount(post.likes_count || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="size-3" />{formatCount(post.replies_count || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Repeat2 className="size-3" />{formatCount(post.reposts_count || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <BookmarkIcon className="size-3" />{formatCount(post.saves_count || 0)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Share2 className="size-3" />{formatCount(post.shares_count || 0)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                      {format(parseISO(post.created_at), "MMM d")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
