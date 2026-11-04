import {
  BarChart, Bar, AreaChart, Area,
  CartesianGrid, XAxis, YAxis,
} from "recharts"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { mockUser, activityChartData, postingFrequencyData, engagementData } from "../data"

const activityConfig = {
  posts: { label: "Posts", color: "var(--chart-1)" },
  comments: { label: "Comments", color: "var(--chart-2)" },
}

const postingConfig = {
  posts: { label: "Posts", color: "var(--chart-1)" },
}

const engagementConfig = {
  rate: { label: "Engagement %", color: "var(--chart-3)" },
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="py-3">
      <CardContent className="px-4">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold mt-0.5 tabular-nums", color)}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function OverviewTab() {
  const u = mockUser
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Posts" value={u.totalPosts.toLocaleString()} />
        <StatCard label="Total Comments" value={u.totalComments.toLocaleString()} />
        <StatCard label="Total Likes" value={u.totalLikes.toLocaleString()} />
        <StatCard label="Followers" value={u.followers.toLocaleString()} />
        <StatCard label="Following" value={u.following.toLocaleString()} />
        <StatCard label="Communities" value={u.communitiesJoined.toString()} sub={`${u.communitiesCreated} created`} />
        <StatCard label="Images" value={u.imagesUploaded.toLocaleString()} />
        <StatCard label="Videos" value={u.videosUploaded.toLocaleString()} />
        <StatCard label="Storage Used" value={u.storageUsed} />
        <StatCard label="Reports" value={u.reportCount.toString()} color={u.reportCount > 0 ? "text-amber-500" : undefined} />
        <StatCard label="Warnings" value={u.warningCount.toString()} color={u.warningCount > 0 ? "text-red-500" : "text-emerald-500"} />
        <StatCard label="Account Age" value={`${u.accountAgeDays} days`} sub={u.createdAt} />
        <StatCard label="Login Count" value={u.loginCount.toLocaleString()} />
        <StatCard label="Trust Score" value={`${u.trustScore}/100`} color="text-emerald-500" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Activity Over Time</CardTitle>
            <CardDescription>Posts and comments per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityConfig} className="h-[180px] w-full">
              <BarChart data={activityChartData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="posts" fill="var(--color-posts)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="comments" fill="var(--color-comments)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Posting Frequency</CardTitle>
            <CardDescription>Average posts by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={postingConfig} className="h-[180px] w-full">
              <BarChart data={postingFrequencyData} accessibilityLayer>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="posts" fill="var(--color-posts)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Engagement Trend</CardTitle>
            <CardDescription>Engagement rate (%) over the last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={engagementConfig} className="h-[160px] w-full">
              <AreaChart data={engagementData} accessibilityLayer>
                <defs>
                  <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 12]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="rate" stroke="var(--chart-3)" fill="url(#engagementGrad)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-3)" }} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
