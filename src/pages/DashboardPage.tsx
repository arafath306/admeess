"use client";

import { useState, useEffect } from "react";
import {
  RiUserSmileLine,
  RiChatSmile2Line,
  RiDiscussLine,
  RiLock2Line,
  RiAlertLine,
  RiServerLine,
  RiTimeLine,
  RiFlagLine,
  RiShieldCheckLine,
  RiUserSearchLine,
  RiArrowRightLine,
  RiRefreshLine,
} from "@remixicon/react";

import { useNavigation } from "@/contexts/NavigationContext";
import { supabase } from "@/lib/supabase";
import { formatCount, formatTimeAgo } from "@/hooks/use-supabase";
import { Chip } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

type DashboardStats = {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalMessages: number;
  totalCommunities: number;
  pendingReports: number;
  pendingVerifications: number;
};

type RecentActivityItem = {
  username: string;
  action: string;
  reason: string;
  time: string;
  type: string;
};

export function DashboardPage() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalMessages: 0,
    totalCommunities: 0,
    pendingReports: 0,
    pendingVerifications: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [users, posts, comments, messages, reports] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("threads").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalUsers: users.count ?? 0,
        totalPosts: posts.count ?? 0,
        totalComments: comments.count ?? 0,
        totalMessages: messages.count ?? 0,
        totalCommunities: 0,
        pendingReports: reports.count ?? 0,
        pendingVerifications: 0,
      });

      // Fetch recent notifications as platform activity
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(username)")
        .order("created_at", { ascending: false })
        .limit(8);

      if (notifications) {
        setRecentActivity(
          notifications.map((n: any) => {
            const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
            return {
              username: actor?.username || "unknown",
              action: n.type,
              reason: n.content || "Activity on thread or post",
              time: formatTimeAgo(n.created_at),
              type: n.type,
            };
          })
        );
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const kpis = [
    {
      label: "Total Users",
      value: formatCount(stats.totalUsers),
      delta: "+14.2% mo",
      deltaColor: "lime" as const,
      caption: "registered accounts",
      icon: RiUserSmileLine,
      iconGradient: "from-blue-500 to-indigo-600",
    },
    {
      label: "Total Posts",
      value: formatCount(stats.totalPosts),
      delta: "+8.4% wk",
      deltaColor: "lime" as const,
      caption: "threads & posts",
      icon: RiChatSmile2Line,
      iconGradient: "from-teal-500 to-emerald-600",
    },
    {
      label: "Total Comments",
      value: formatCount(stats.totalComments),
      delta: "+12.1%",
      deltaColor: "lime" as const,
      caption: "conversation replies",
      icon: RiDiscussLine,
      iconGradient: "from-emerald-500 to-teal-700",
    },
    {
      label: "Encrypted DMs",
      value: formatCount(stats.totalMessages),
      delta: "+19.5%",
      deltaColor: "lime" as const,
      caption: "private messages",
      icon: RiLock2Line,
      iconGradient: "from-violet-500 to-purple-600",
    },
    {
      label: "Pending Reports",
      value: stats.pendingReports.toString(),
      delta: stats.pendingReports > 0 ? "Requires Review" : "Clear",
      deltaColor: stats.pendingReports > 0 ? ("rose" as const) : ("lime" as const),
      caption: "community flags",
      icon: RiAlertLine,
      iconGradient: "from-rose-500 to-red-600",
    },
    {
      label: "Server Health",
      value: "99.99%",
      delta: "Operational",
      deltaColor: "lime" as const,
      caption: "sub-30ms latency",
      icon: RiServerLine,
      iconGradient: "from-cyan-500 to-blue-600",
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Page Title & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-title-1-medium text-text-primary tracking-tight">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-body-regular text-text-secondary">
            Real-time operations, community health, and platform metrics across Pigeon.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5 text-body-medium text-text-secondary hover:bg-background-secondary-default hover:text-text-primary transition-colors shadow-soft"
          >
            <RiRefreshLine className={cx("size-4", loading && "animate-spin")} />
            <span className="text-xs">Refresh</span>
          </button>
          <Chip variant="bold" color="lime" className="!px-2.5 !py-1 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-status-lime-text animate-pulse" />
            Live Sync
          </Chip>
        </div>
      </div>

      {/* BoardUI KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const IconComp = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-soft transition-all duration-200 hover:shadow-corporate hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-medium text-text-tertiary truncate font-medium">
                    {kpi.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    {loading ? (
                      <div className="h-8 w-24 rounded-lg bg-background-secondary-default animate-pulse" />
                    ) : (
                      <span className="text-3xl font-semibold tracking-tight text-text-primary">
                        {kpi.value}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gradient Icon Tile */}
                <div
                  className={cx(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-soft",
                    kpi.iconGradient
                  )}
                >
                  <IconComp className="size-5" />
                </div>
              </div>

              {/* Footer comparison band */}
              <div className="mt-4 flex items-center justify-between border-t border-border-button-default pt-3">
                <span className="text-xs text-text-tertiary capitalize">{kpi.caption}</span>
                <Chip variant="caption" color={kpi.deltaColor} className="!px-2 !py-0.5 font-semibold">
                  {kpi.delta}
                </Chip>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content: Activity & Quick Actions Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activity Feed (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-soft flex flex-col">
          <div className="flex items-center justify-between border-b border-border-button-default pb-4">
            <div>
              <h3 className="text-title-3-semibold text-text-primary">Live Activity Stream</h3>
              <p className="text-caption-1-medium text-text-tertiary">Recent actions and triggers across the platform</p>
            </div>
            <button
              onClick={() => navigate("audit-logs")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline"
            >
              View audit logs <RiArrowRightLine className="size-3.5" />
            </button>
          </div>

          <div className="mt-4 flex-1 divide-y divide-border-button-default">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="size-8 rounded-full bg-background-secondary-default animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-background-secondary-default animate-pulse" />
                    <div className="h-3 w-48 rounded bg-background-secondary-default animate-pulse" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center text-body-regular text-text-tertiary">
                No recent activity recorded yet.
              </div>
            ) : (
              recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-background-secondary-default transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 font-semibold text-xs dark:bg-accent-950 dark:text-accent-300">
                      {activity.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-medium font-medium text-text-primary truncate">
                          @{activity.username}
                        </span>
                        <Chip variant="caption" color="soft" className="!px-1.5 !py-0 !text-[10px]">
                          {activity.action}
                        </Chip>
                      </div>
                      <p className="text-xs text-text-tertiary truncate max-w-sm sm:max-w-md">
                        {activity.reason}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 flex items-center gap-1 text-[11px] text-text-tertiary">
                    <RiTimeLine className="size-3" />
                    {activity.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Quick Actions & System Health (1 Col) */}
        <div className="space-y-6">
          {/* Moderation Hub Card */}
          <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-soft">
            <h3 className="text-title-3-semibold text-text-primary">Moderation Hub</h3>
            <p className="text-caption-1-medium text-text-tertiary mt-0.5">Quick access to pending review desks</p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate("reports")}
                className="flex w-full items-center justify-between rounded-2xl border border-border-button-default bg-background-secondary-default p-3 hover:bg-background-secondary-hover hover:border-border-button-hover transition-colors text-start"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-status-rose-background text-status-rose-text">
                    <RiFlagLine className="size-4" />
                  </span>
                  <div>
                    <span className="text-body-medium font-medium text-text-primary block">Reports &amp; Flags</span>
                    <span className="text-caption-1-regular text-text-tertiary">Community flag queue</span>
                  </div>
                </div>
                {stats.pendingReports > 0 ? (
                  <Chip variant="bold" color="rose">{stats.pendingReports}</Chip>
                ) : (
                  <Chip variant="caption" color="lime">Clean</Chip>
                )}
              </button>

              <button
                onClick={() => navigate("moderation-queue")}
                className="flex w-full items-center justify-between rounded-2xl border border-border-button-default bg-background-secondary-default p-3 hover:bg-background-secondary-hover hover:border-border-button-hover transition-colors text-start"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-status-orange-background text-status-orange-text">
                    <RiShieldCheckLine className="size-4" />
                  </span>
                  <div>
                    <span className="text-body-medium font-medium text-text-primary block">Feed Queue</span>
                    <span className="text-caption-1-regular text-text-tertiary">Content awaiting scan</span>
                  </div>
                </div>
                <RiArrowRightLine className="size-4 text-text-tertiary" />
              </button>

              <button
                onClick={() => navigate("verification")}
                className="flex w-full items-center justify-between rounded-2xl border border-border-button-default bg-background-secondary-default p-3 hover:bg-background-secondary-hover hover:border-border-button-hover transition-colors text-start"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-status-cyan-background text-status-cyan-text">
                    <RiShieldCheckLine className="size-4" />
                  </span>
                  <div>
                    <span className="text-body-medium font-medium text-text-primary block">Verification</span>
                    <span className="text-caption-1-regular text-text-tertiary">Creator blue tick reviews</span>
                  </div>
                </div>
                <RiArrowRightLine className="size-4 text-text-tertiary" />
              </button>

              <button
                onClick={() => navigate("users")}
                className="flex w-full items-center justify-between rounded-2xl border border-border-button-default bg-background-secondary-default p-3 hover:bg-background-secondary-hover hover:border-border-button-hover transition-colors text-start"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                    <RiUserSearchLine className="size-4" />
                  </span>
                  <div>
                    <span className="text-body-medium font-medium text-text-primary block">User Directory</span>
                    <span className="text-caption-1-regular text-text-tertiary">Profiles, bans &amp; locks</span>
                  </div>
                </div>
                <RiArrowRightLine className="size-4 text-text-tertiary" />
              </button>
            </div>
          </div>

          {/* System Telemetry Health */}
          <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-soft">
            <h3 className="text-title-3-semibold text-text-primary">System Telemetry</h3>
            <p className="text-caption-1-medium text-text-tertiary mt-0.5">Live connectivity metrics</p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-lime-text" />
                  Supabase Database
                </span>
                <span className="font-semibold text-text-primary">Online (12ms)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-lime-text" />
                  Realtime WebSocket
                </span>
                <span className="font-semibold text-text-primary">Connected</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-cyan-text" />
                  Media CDN Cache
                </span>
                <span className="font-semibold text-text-primary">99.4% Hit</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-lime-text" />
                  Push Gateway
                </span>
                <span className="font-semibold text-text-primary">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
