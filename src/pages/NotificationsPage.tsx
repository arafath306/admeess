import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Send,
  Users,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Layers,
  Smartphone,
  Sparkles,
  Globe,
  Flame,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquare,
  Heart,
  UserPlus,
  AtSign,
  BadgeCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/lib/supabase";
import { formatTimeAgo } from "@/hooks/use-supabase";
import { sendPushNotification } from "@/lib/fcm";

interface NotificationItem {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  thread_id: string | null;
  content: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  recipient?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
}

const NOTIFICATION_PRESETS = [
  {
    title: "⚡ Platform Maintenance Alert",
    body: "Dak Social will undergo a scheduled maintenance update tonight at 02:00 AM UTC (approx 15 mins).",
    type: "system",
    category: "Security & Operations",
  },
  {
    title: "🎉 New Update Available!",
    body: "Pigeon Social v4.2 is live with end-to-end encrypted voice notes, upgraded search, and new themes. Check it out now!",
    type: "broadcast",
    category: "Product Release",
  },
  {
    title: "🛡️ Community Safety Notice",
    body: "Please ensure your 2-step verification is enabled to keep your account safe from unauthorized logins.",
    type: "security",
    category: "Trust & Safety",
  },
  {
    title: "🔥 Weekend Boost Offer!",
    body: "Get 50% extra organic reach on all your thread boosts this weekend. Tap to unlock your perks!",
    type: "promo",
    category: "Engagement",
  },
];

export function NotificationsPage() {
  // Main Data States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Inspector Dialog
  const [inspectItem, setInspectItem] = useState<NotificationItem | null>(null);

  // Stats Breakdown
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    types: {} as Record<string, number>,
    fcmEnabledUsers: 0,
  });

  // Campaign Form States
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [targetAudience, setTargetAudience] = useState("global");
  const [isSending, setIsSending] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [notifType, setNotifType] = useState("message");

  // Specific User Autocomplete States
  const [specificUsername, setSpecificUsername] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // Live Realtime Subscription State
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  // 1. Initial Load & Realtime Subscription
  useEffect(() => {
    fetchNotifications();
    fetchStats();

    // Supabase Realtime Channel for Notifications
    const channel = supabase
      .channel("admin_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          fetchNotifications(false);
          fetchStats();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Notifications
  async function fetchNotifications(showLoadingSpinner = true) {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const { data, count, error } = await supabase
        .from("notifications")
        .select(
          `
          id, user_id, actor_id, type, thread_id, content, is_read, created_at,
          actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_url),
          recipient:profiles!notifications_user_id_fkey(username, full_name, avatar_url)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const formatted: NotificationItem[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        actor_id: row.actor_id,
        type: row.type,
        thread_id: row.thread_id,
        content: row.content,
        is_read: row.is_read,
        created_at: row.created_at,
        actor: Array.isArray(row.actor) ? row.actor[0] : row.actor,
        recipient: Array.isArray(row.recipient) ? row.recipient[0] : row.recipient,
      }));
      setNotifications(formatted);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      toast.error("Failed to fetch notifications: " + err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  // Fetch Summary Statistics
  async function fetchStats() {
    try {
      const [notifsRes, fcmRes] = await Promise.all([
        supabase.from("notifications").select("type, is_read"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("fcm_token", "is", null),
      ]);

      if (notifsRes.data) {
        let unreadCount = 0;
        let readCount = 0;
        const typeMap: Record<string, number> = {};

        notifsRes.data.forEach((n) => {
          if (n.is_read) readCount++;
          else unreadCount++;
          typeMap[n.type] = (typeMap[n.type] || 0) + 1;
        });

        setStats({
          total: notifsRes.data.length,
          unread: unreadCount,
          read: readCount,
          types: typeMap,
          fcmEnabledUsers: fcmRes.count ?? 0,
        });
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }

  // Specific User Suggestion Debounce
  useEffect(() => {
    if (!specificUsername || targetAudience !== "specific") {
      setSuggestions([]);
      return;
    }
    const cleanQuery = specificUsername.replace(/^@/, "").trim();
    if (cleanQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, fcm_token")
          .ilike("username", `%${cleanQuery}%`)
          .limit(6);
        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        console.error("Suggestions error:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [specificUsername, targetAudience]);

  // Filtered Notifications List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Type Filter
      if (typeFilter !== "all" && n.type !== typeFilter) return false;

      // Read/Unread Filter
      if (statusFilter === "unread" && n.is_read) return false;
      if (statusFilter === "read" && !n.is_read) return false;

      // Text / User Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().replace(/^@/, "");
        const contentMatch = n.content?.toLowerCase().includes(q) ?? false;
        const actorMatch =
          n.actor?.username?.toLowerCase().includes(q) ||
          n.actor?.full_name?.toLowerCase().includes(q);
        const recipientMatch =
          n.recipient?.username?.toLowerCase().includes(q) ||
          n.recipient?.full_name?.toLowerCase().includes(q);
        const idMatch = n.id.toLowerCase().includes(q);

        if (!contentMatch && !actorMatch && !recipientMatch && !idMatch) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, typeFilter, statusFilter, searchQuery]);

  // Paginated Slicing
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;

  // Batch Select Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedNotifications.map((n) => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Mark as Read
  const handleBatchMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", selectedIds);
      if (error) throw error;
      toast.success(`Marked ${selectedIds.length} notifications as read`);
      setNotifications((prev) =>
        prev.map((n) => (selectedIds.includes(n.id) ? { ...n, is_read: true } : n))
      );
      setSelectedIds([]);
      fetchStats();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected notifications?`)) {
      return;
    }
    setBatchActionLoading(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
      toast.success(`Deleted ${selectedIds.length} notifications`);
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      fetchStats();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Single Delete
  const handleDeleteSingle = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Notification deleted");
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (inspectItem?.id === id) setInspectItem(null);
      fetchStats();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  // Single Mark Read/Unread Toggle
  const handleToggleRead = async (item: NotificationItem) => {
    try {
      const newStatus = !item.is_read;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: newStatus })
        .eq("id", item.id);
      if (error) throw error;
      toast.success(`Marked as ${newStatus ? "read" : "unread"}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: newStatus } : n))
      );
      if (inspectItem?.id === item.id) {
        setInspectItem({ ...inspectItem, is_read: newStatus });
      }
      fetchStats();
    } catch (err: any) {
      toast.error("Failed to toggle read status: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredNotifications.length === 0) {
      toast.error("No notifications to export");
      return;
    }
    const headers = ["ID", "Created At", "Type", "Status", "Recipient", "Actor", "Content"];
    const rows = filteredNotifications.map((n) => [
      `"${n.id}"`,
      `"${n.created_at}"`,
      `"${n.type}"`,
      n.is_read ? '"Read"' : '"Unread"',
      `"${n.recipient?.username || n.user_id}"`,
      `"${n.actor?.username || n.actor_id || "System"}"`,
      `"${(n.content || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `notifications_export_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredNotifications.length} notifications to CSV`);
  };

  // Send Broadcast / Targeted Notification
  const handleSendBroadcast = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error("Notification Title and Message Body are required.");
      return;
    }
    if (!sendPush && !sendInApp) {
      toast.error("Please select at least one delivery channel (Push or In-App).");
      return;
    }

    setIsSending(true);

    try {
      let targetProfiles: { id: string; fcm_token: string | null; username: string }[] = [];

      if (targetAudience === "global") {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, fcm_token, username");
        if (error) throw error;
        targetProfiles = data || [];
      } else if (targetAudience === "verified") {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, fcm_token, username")
          .eq("is_verified", true);
        if (error) throw error;
        targetProfiles = data || [];
      } else if (targetAudience === "active_fcm") {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, fcm_token, username")
          .not("fcm_token", "is", null);
        if (error) throw error;
        targetProfiles = data || [];
      } else if (targetAudience === "specific") {
        const username = specificUsername.replace(/^@/, "").trim();
        if (!username) {
          toast.error("Please enter a username to target.");
          setIsSending(false);
          return;
        }

        let profile = selectedProfile;
        if (!profile || profile.username.toLowerCase() !== username.toLowerCase()) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, fcm_token")
            .ilike("username", username)
            .maybeSingle();
          if (error) throw error;
          profile = data;
        }

        if (profile) {
          targetProfiles = [profile];
        } else {
          toast.error(`No user found with username @${username}`);
          setIsSending(false);
          return;
        }
      }

      if (targetProfiles.length === 0) {
        toast.error("No target users found for this audience segment.");
        setIsSending(false);
        return;
      }

      let pushSuccessCount = 0;
      let inAppSuccessCount = 0;

      // 1. Send Push Notification via FCM
      if (sendPush) {
        const targetTokens = targetProfiles
          .map((p) => p.fcm_token)
          .filter((t): t is string => !!t);

        const campaignTag = `dak_campaign_${Date.now()}`;
        for (const token of targetTokens) {
          const ok = await sendPushNotification(token, pushTitle, pushBody, {
            tag: campaignTag,
            channelId: notifType === "message" ? "pigeon_messages" : "pigeon_activity",
            type: notifType,
          });
          if (ok) pushSuccessCount++;
        }
      }

      // 2. Insert In-App Notifications
      if (sendInApp) {
        // Query system or admin profile for actor
        let actorId: string | null = null;
        try {
          const { data: systemUser } = await supabase
            .from("profiles")
            .select("id")
            .or("username.eq.system,username.eq.pigeon_social,username.eq.admin")
            .limit(1);

          if (systemUser && systemUser.length > 0) {
            actorId = systemUser[0].id;
          }
        } catch (err) {
          console.error("Error finding system user:", err);
        }

        const inserts = targetProfiles.map((p) => ({
          user_id: p.id,
          actor_id: actorId || p.id,
          type: notifType,
          content: `${pushTitle}: ${pushBody}`,
          is_read: false,
        }));

        const { error } = await supabase.from("notifications").insert(inserts);
        if (error) throw error;
        inAppSuccessCount = targetProfiles.length;
      }

      toast.success(
        `Campaign dispatched! FCM Push: ${pushSuccessCount} • In-App: ${inAppSuccessCount}`
      );

      setPushTitle("");
      setPushBody("");
      setSpecificUsername("");
      setSelectedProfile(null);
      fetchNotifications(false);
      fetchStats();
    } catch (error: any) {
      toast.error("Campaign failed: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  // Helper for Type Badges
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "like":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 gap-1 text-[11px]">
            <Heart className="size-3" /> Like
          </Badge>
        );
      case "comment":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 gap-1 text-[11px]">
            <MessageSquare className="size-3" /> Comment
          </Badge>
        );
      case "follow":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[11px]">
            <UserPlus className="size-3" /> Follow
          </Badge>
        );
      case "mention":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 gap-1 text-[11px]">
            <AtSign className="size-3" /> Mention
          </Badge>
        );
      case "message":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-[11px]">
            <Send className="size-3" /> System DM
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-[11px] capitalize">
            <Bell className="size-3" /> {type}
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      {/* 1. Header Toolbar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">Notifications & Broadcast Hub</h1>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 border-primary/30 text-primary">
              v4.2 PRO
            </Badge>
            {realtimeConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Realtime
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Connecting...
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime audit log of all system notifications, user alerts, and automated push campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={isRefreshing}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* 2. Top Stats Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Logged</p>
                <h3 className="text-2xl font-bold mt-1">{totalCount.toLocaleString()}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Historical records</p>
              </div>
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">Unread Alerts</p>
                <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                  {stats.unread.toLocaleString()}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting user views</p>
              </div>
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Flame className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">Read / Delivered</p>
                <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {stats.read.toLocaleString()}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Acknowledged alerts</p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">FCM Registered</p>
                <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                  {stats.fcmEnabledUsers} Devices
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Reachable via Push</p>
              </div>
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Smartphone className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Main Tabs (System Log vs Send Campaign) */}
        <Tabs defaultValue="log" className="w-full space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="log" className="gap-2 text-xs font-semibold">
              <Layers className="size-4" /> Live Notification Feed
            </TabsTrigger>
            <TabsTrigger value="campaign" className="gap-2 text-xs font-semibold">
              <Send className="size-4" /> Broadcast & Push Campaign
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTIFICATION LOG & AUDIT */}
          <TabsContent value="log" className="space-y-4">
            {/* Filter & Search Bar */}
            <Card className="border shadow-xs">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by recipient, actor, content or ID..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 h-8 text-xs bg-muted/40 focus:bg-background"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Type Filter */}
                  <Select
                    value={typeFilter}
                    onValueChange={(val) => {
                      setTypeFilter(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-36 bg-muted/40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types ({notifications.length})</SelectItem>
                      <SelectItem value="like">Likes ({stats.types["like"] || 0})</SelectItem>
                      <SelectItem value="comment">Comments ({stats.types["comment"] || 0})</SelectItem>
                      <SelectItem value="follow">Follows ({stats.types["follow"] || 0})</SelectItem>
                      <SelectItem value="mention">Mentions ({stats.types["mention"] || 0})</SelectItem>
                      <SelectItem value="message">System DMs ({stats.types["message"] || 0})</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      setStatusFilter(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-32 bg-muted/40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unread">Unread Only</SelectItem>
                      <SelectItem value="read">Read Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Action Buttons */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-muted/80 p-1 rounded-lg border animate-in fade-in">
                    <span className="text-xs font-semibold px-2 text-foreground">
                      {selectedIds.length} Selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={handleBatchMarkAsRead}
                      disabled={batchActionLoading}
                    >
                      <CheckCircle2 className="size-3 text-emerald-500" /> Mark Read
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1"
                      onClick={handleBatchDelete}
                      disabled={batchActionLoading}
                    >
                      <Trash2 className="size-3" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Table */}
            <Card className="border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 px-4">
                        <Checkbox
                          checked={
                            paginatedNotifications.length > 0 &&
                            paginatedNotifications.every((n) => selectedIds.includes(n.id))
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-[180px]">Recipient (To)</TableHead>
                      <TableHead className="w-[180px]">Actor (From)</TableHead>
                      <TableHead className="w-[130px]">Type</TableHead>
                      <TableHead className="min-w-[280px]">Message Content</TableHead>
                      <TableHead className="w-[110px]">Status</TableHead>
                      <TableHead className="w-[120px]">Time</TableHead>
                      <TableHead className="w-[110px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="px-4"><Skeleton className="size-4" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedNotifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                          <Bell className="size-8 mx-auto mb-2 opacity-40" />
                          <p className="font-medium text-foreground text-sm">No notifications found</p>
                          <p className="text-xs mt-1">Try clearing your filters or search keywords.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedNotifications.map((n) => {
                        const isSelected = selectedIds.includes(n.id);
                        return (
                          <TableRow
                            key={n.id}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? "bg-primary/5" : n.is_read ? "" : "bg-muted/20 font-medium"
                            }`}
                            onClick={() => setInspectItem(n)}
                          >
                            <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(n.id)}
                              />
                            </TableCell>

                            {/* Recipient User */}
                            <TableCell>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="size-7 border shrink-0">
                                  {n.recipient?.avatar_url && <AvatarImage src={n.recipient.avatar_url} />}
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {(n.recipient?.username || "U").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                  <p className="text-xs font-semibold truncate">
                                    @{n.recipient?.username || "unknown"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {n.recipient?.full_name || "User"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Actor User */}
                            <TableCell>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="size-7 border shrink-0">
                                  {n.actor?.avatar_url && <AvatarImage src={n.actor.avatar_url} />}
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {(n.actor?.username || "S").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="truncate">
                                  <p className="text-xs font-semibold truncate">
                                    @{n.actor?.username || "system"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {n.actor?.full_name || "Automated Alert"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Type */}
                            <TableCell>{getTypeBadge(n.type)}</TableCell>

                            {/* Content */}
                            <TableCell className="max-w-[340px]">
                              <p className="text-xs truncate text-foreground/90">
                                {n.content || "(No message body)"}
                              </p>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {n.is_read ? (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  Read
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold animate-pulse">
                                  Unread
                                </Badge>
                              )}
                            </TableCell>

                            {/* Time */}
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {formatTimeAgo(n.created_at)}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleToggleRead(n)}
                                  title={n.is_read ? "Mark Unread" : "Mark Read"}
                                >
                                  {n.is_read ? <XCircle className="size-3.5" /> : <CheckCircle2 className="size-3.5 text-emerald-500" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteSingle(n.id)}
                                  title="Delete Notification"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Table Pagination Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-muted/10 text-xs">
                <span className="text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, filteredNotifications.length)} of{" "}
                  {filteredNotifications.length} entries
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-3.5" /> Prev
                  </Button>
                  <span className="font-mono text-[11px] px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: BROADCAST & PUSH CAMPAIGN */}
          <TabsContent value="campaign" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Form & Presets */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Quick Presets Bar */}
                <Card className="border shadow-xs">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-500" /> Instant Quick Presets
                    </CardTitle>
                    <CardDescription className="text-xs">
                      One-click prefilled message templates for urgent announcements and marketing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0">
                    {NOTIFICATION_PRESETS.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setPushTitle(p.title);
                          setPushBody(p.body);
                          toast.info(`Applied preset: ${p.title}`);
                        }}
                        className="p-2.5 rounded-lg border bg-muted/30 hover:bg-accent cursor-pointer transition-all text-xs space-y-1 hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{p.title}</span>
                          <Badge variant="outline" className="text-[9px] py-0">
                            {p.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {p.body}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 2. Campaign Setup Form */}
                <Card className="border shadow-xs">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Send className="size-4 text-primary" /> Create Notification Campaign
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Broadcast announcements directly to mobile device lockscreens via FCM and In-App feeds.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Audience Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Target Audience</span>
                        <span className="text-primary font-mono lowercase">
                          {targetAudience === "global"
                            ? "all registered users"
                            : targetAudience === "verified"
                            ? "verified blue badge accounts"
                            : targetAudience === "active_fcm"
                            ? `${stats.fcmEnabledUsers} FCM active devices`
                            : "single user target"}
                        </span>
                      </label>
                      <Select value={targetAudience} onValueChange={setTargetAudience}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">
                            <div className="flex items-center gap-2">
                              <Globe className="size-4 text-primary" /> Global Broadcast (All Users)
                            </div>
                          </SelectItem>
                          <SelectItem value="active_fcm">
                            <div className="flex items-center gap-2">
                              <Smartphone className="size-4 text-emerald-500" /> Active Mobile Devices Only ({stats.fcmEnabledUsers} FCM tokens)
                            </div>
                          </SelectItem>
                          <SelectItem value="verified">
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="size-4 text-blue-500" /> Verified VIP Users Only
                            </div>
                          </SelectItem>
                          <SelectItem value="specific">
                            <div className="flex items-center gap-2">
                              <Users className="size-4 text-amber-500" /> Specific User (Search by @username)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Specific User Autocomplete Field */}
                    {targetAudience === "specific" && (
                      <div className="space-y-2 relative animate-in fade-in">
                        <label className="text-xs font-semibold text-primary">Recipient User Handle</label>
                        <Input
                          placeholder="Type username (e.g. @fahmida12, @saionmahmud)..."
                          value={specificUsername}
                          onChange={(e) => {
                            setSpecificUsername(e.target.value);
                            setSelectedProfile(null);
                          }}
                          className="h-9 text-xs border-primary/30"
                        />
                        {suggestions.length > 0 && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y">
                            {suggestions.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2.5 hover:bg-accent cursor-pointer text-xs"
                                onClick={() => {
                                  setSpecificUsername(`@${p.username}`);
                                  setSelectedProfile(p);
                                  setSuggestions([]);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-6">
                                    <AvatarImage src={p.avatar_url} />
                                    <AvatarFallback className="text-[10px]">
                                      {p.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">@{p.username}</p>
                                    <p className="text-[10px] text-muted-foreground">{p.full_name}</p>
                                  </div>
                                </div>
                                {p.fcm_token ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px]">
                                    FCM Ready
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                    No Push Token
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedProfile && (
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8">
                                <AvatarImage src={selectedProfile.avatar_url} />
                                <AvatarFallback>{selectedProfile.username.charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-foreground">@{selectedProfile.username}</p>
                                <p className="text-[11px] text-muted-foreground">{selectedProfile.full_name}</p>
                              </div>
                            </div>
                            {selectedProfile.fcm_token ? (
                              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                <Smartphone className="size-3" /> FCM Device Reachable
                              </span>
                            ) : (
                              <span className="text-amber-500 font-medium text-[11px]">
                                In-App Delivery Only
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Channel Selection & Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Delivery Channels
                        </label>
                        <div className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/20 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={sendPush}
                              onCheckedChange={(checked) => setSendPush(!!checked)}
                            />
                            <span className="font-medium">Push Notification (FCM Mobile)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={sendInApp}
                              onCheckedChange={(checked) => setSendInApp(!!checked)}
                            />
                            <span className="font-medium">In-App Feed (Notification Tab)</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Notification Type
                        </label>
                        <Select value={notifType} onValueChange={setNotifType}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Notification Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="message">System DM / Announcement</SelectItem>
                            <SelectItem value="mention">Account Notice / Verification</SelectItem>
                            <SelectItem value="like">Milestone / Achievement</SelectItem>
                            <SelectItem value="follow">VIP Connect Suggestion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-foreground">Notification Title</label>
                        <span className="text-muted-foreground font-mono">{pushTitle.length}/60</span>
                      </div>
                      <Input
                        placeholder="e.g. ⚡ Security Alert: Scheduled Maintenance"
                        value={pushTitle}
                        onChange={(e) => setPushTitle(e.target.value)}
                        maxLength={60}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-foreground">Message Body</label>
                        <span className="text-muted-foreground font-mono">{pushBody.length}/200</span>
                      </div>
                      <Textarea
                        placeholder="Type the message that will display on lock screens and within the app feed..."
                        value={pushBody}
                        onChange={(e) => setPushBody(e.target.value)}
                        maxLength={200}
                        className="min-h-[90px] text-xs resize-none"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="bg-muted/30 pt-4 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPushTitle("");
                        setPushBody("");
                      }}
                      className="text-xs"
                    >
                      Reset Form
                    </Button>
                    <Button
                      size="default"
                      className="gap-2 px-6"
                      onClick={handleSendBroadcast}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" /> Send Notification Campaign
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Right Column: Live Smartphone Device Mockup */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="sticky top-24 w-full flex flex-col items-center">
                  <div className="flex items-center justify-between w-full max-w-[320px] mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Smartphone className="size-3.5 text-primary" /> Realtime Lockscreen Preview
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Android / iOS
                    </Badge>
                  </div>

                  {/* Smartphone Frame */}
                  <div className="relative w-[310px] h-[610px] bg-black rounded-[44px] border-[10px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col pt-10 items-center select-none ring-1 ring-white/10">
                    {/* Modern Wallpaper */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-90" />
                    <div className="absolute -top-24 -left-24 size-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -right-24 size-64 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

                    {/* Camera Dynamic Island / Notch */}
                    <div className="absolute top-2.5 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
                      <span className="size-2 rounded-full bg-emerald-500/80 animate-ping" />
                    </div>

                    {/* Lock Screen Clock */}
                    <div className="z-10 text-white/95 text-6xl font-light mt-8 tracking-tighter font-mono">
                      {format(new Date(), "HH:mm")}
                    </div>
                    <div className="z-10 text-white/70 text-xs mt-1 font-medium">
                      {format(new Date(), "EEEE, MMMM d")}
                    </div>

                    {/* Realtime Notification Card */}
                    <div className="z-20 w-[278px] mt-10 bg-white/15 dark:bg-black/40 backdrop-blur-xl border border-white/25 rounded-2xl p-3.5 shadow-2xl transform transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-5 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-[10px] font-bold shadow-xs">
                            P
                          </div>
                          <span className="text-white/90 text-[11px] font-bold tracking-wide uppercase">
                            Dak Social
                          </span>
                        </div>
                        <span className="text-white/50 text-[10px] font-mono">now</span>
                      </div>

                      <div className="text-white font-bold text-xs leading-tight">
                        {pushTitle || "⚡ Your Notification Title"}
                      </div>
                      <div className="text-white/80 text-[11px] mt-1 leading-snug break-words">
                        {pushBody ||
                          "This is a live preview of how your message payload will appear on user lock screens."}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-white/50">
                        <span>Swipe to open</span>
                        <span className="font-mono">FCM Priority: High</span>
                      </div>
                    </div>

                    {/* Bottom Home Indicator */}
                    <div className="absolute bottom-3 w-28 h-1 bg-white/40 rounded-full z-20" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 4. Notification Details Inspector Modal */}
      <Dialog open={!!inspectItem} onOpenChange={(open) => !open && setInspectItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" /> Notification Payload Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detailed audit trail and delivery metadata for this notification record.
            </DialogDescription>
          </DialogHeader>

          {inspectItem && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Notification ID</span>
                  <span className="font-mono text-[11px] select-all">{inspectItem.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Created At</span>
                  <span className="font-mono text-[11px]">
                    {format(new Date(inspectItem.created_at), "yyyy-MM-dd HH:mm:ss (O)")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Alert Type</span>
                  <span>{getTypeBadge(inspectItem.type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">Status</span>
                  <span>
                    {inspectItem.is_read ? (
                      <Badge variant="secondary" className="text-[10px]">Read</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]">
                        Unread
                      </Badge>
                    )}
                  </span>
                </div>
              </div>

              {/* Recipient & Actor Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Recipient (User)
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="size-6">
                      <AvatarImage src={inspectItem.recipient?.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {inspectItem.recipient?.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="font-semibold truncate">@{inspectItem.recipient?.username || "unknown"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {inspectItem.user_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Actor (Sender)
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <Avatar className="size-6">
                      <AvatarImage src={inspectItem.actor?.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {inspectItem.actor?.username?.charAt(0).toUpperCase() || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="font-semibold truncate">@{inspectItem.actor?.username || "system"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {inspectItem.actor_id || "automated"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payload Body */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Message Content Payload</label>
                <div className="p-3 rounded-lg border bg-muted/30 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                  {inspectItem.content || "(Empty message content)"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => inspectItem && handleDeleteSingle(inspectItem.id)}
            >
              <Trash2 className="size-3.5" /> Delete Record
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => inspectItem && handleToggleRead(inspectItem)}
              >
                {inspectItem?.is_read ? "Mark as Unread" : "Mark as Read"}
              </Button>
              <Button size="sm" className="text-xs" onClick={() => setInspectItem(null)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
