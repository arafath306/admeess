import { useState, useEffect, useRef } from "react";
import { useNavigation } from "@/contexts/NavigationContext";
import { supabase } from "@/lib/supabase";
import { formatTimeAgo } from "@/hooks/use-supabase";
import { format } from "date-fns";
import { decryptAdminMessageBidirectional } from "@/lib/e2ee";
import {
  ArrowLeft,
  Ban,
  BadgeCheck,
  CheckCircle2,
  Shield,
  ShieldAlert,
  UserCheck,
  MessageSquare,
  Users,
  Activity,
  XCircle,
  Search,
  Radio,
  Ghost,
  DollarSign,
  KeyRound,
  Sliders,
  MapPin,
  Mail,
  Phone,
  Lock,
  RefreshCw,
  AlertTriangle,
  Flame,
  Smartphone,
  Globe,
  Trash2,
  Eye,
  Heart,
  Bell,
  UserX,
  Copy,
  ChevronRight,
  ExternalLink,
  ShieldOff,
  Zap,
  Send,
  Terminal,
  MonitorCheck,
  Clock,
  Layers,
  Unlock,
  ImageIcon,
  Maximize2,
  X,
  ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UserMonitorPage() {
  const { navigate, targetUserId } = useNavigation();

  // Active monitored user state
  const [activeUserId, setActiveUserId] = useState<string | null>(targetUserId);
  const [profile, setProfile] = useState<any>(null);
  const [authRecord, setAuthRecord] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Quick Switcher / Search States
  const [searchTargetQuery, setSearchTargetQuery] = useState("");
  const [targetSearchResults, setTargetSearchResults] = useState<any[]>([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [searchingTargets, setSearchingTargets] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFocusedIndex, setSearchFocusedIndex] = useState(-1);
  const [quickTargets, setQuickTargets] = useState<any[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Surveillance Data States
  const [activeTab, setActiveTab] = useState("telemetry");
  const [realtimeTracking, setRealtimeTracking] = useState(false);

  // Telemetry Tab
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [reportsAgainstUser, setReportsAgainstUser] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Content Interceptor (Threads & Comments)
  const [userThreads, setUserThreads] = useState<any[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<"all" | "threads" | "comments">("all");

  // Wiretap / DMs
  const [messages, setMessages] = useState<any[]>([]);
  const [allPlatformMessages, setAllPlatformMessages] = useState<any[]>([]);
  const [wiretapScope, setWiretapScope] = useState<"user" | "global">("user");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeDmPartnerId, setActiveDmPartnerId] = useState<string | null>(null);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [chatSortOrder, setChatSortOrder] = useState<"desc" | "asc">("desc");
  const [masterDecryptEnabled, setMasterDecryptEnabled] = useState(true);
  const [decryptedMap, setDecryptedMap] = useState<Record<string, { text: string; decrypted: boolean }>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Social Graph
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingGraph, setLoadingGraph] = useState(false);

  // Activity & Likes
  const [likes, setLikes] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // Notifications Stream
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Dialog States
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [sendingWarning, setSendingWarning] = useState(false);
  const [tuningDialogOpen, setTuningDialogOpen] = useState(false);
  const [reachMultiplier, setReachMultiplier] = useState(1.0);
  const [confirmDeleteContent, setConfirmDeleteContent] = useState<{ id: string; type: "thread" | "comment" } | null>(null);

  // Sync with navigation context
  useEffect(() => {
    if (targetUserId) {
      setActiveUserId(targetUserId);
    }
  }, [targetUserId]);

  // Load quick target accounts on mount
  useEffect(() => {
    fetchQuickTargets();
  }, []);

  // When activeUserId changes, fetch surveillance data
  useEffect(() => {
    if (activeUserId) {
      fetchAllSurveillanceData(activeUserId);
    }
  }, [activeUserId]);

  // When wiretapScope changes to global, fetch all platform messages
  useEffect(() => {
    if (wiretapScope === "global") {
      fetchGlobalMessages();
    }
  }, [wiretapScope]);

  // Realtime Polling Timer
  useEffect(() => {
    if (!realtimeTracking || !activeUserId) return;
    const interval = setInterval(() => {
      fetchLiveTelemetry(activeUserId);
    }, 15000);
    return () => clearInterval(interval);
  }, [realtimeTracking, activeUserId]);

  // Click outside search dropdown listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut ('/' to focus search, 'Escape' to blur)
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // User search debounce with multi-field matching
  useEffect(() => {
    if (!searchTargetQuery.trim()) {
      setTargetSearchResults(allRegisteredUsers);
      setSearchFocusedIndex(-1);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingTargets(true);
      setSearchFocusedIndex(-1);
      const term = searchTargetQuery.trim().replace(/^@/, "");
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
      let q = supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, is_suspended, is_banned, is_shadowbanned, followers_count, email, phone, city")
        .order("followers_count", { ascending: false })
        .limit(10);

      if (isUuid) {
        q = q.eq("id", term);
      } else {
        q = q.or(`username.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
      }

      const { data } = await q;
      setTargetSearchResults(data || []);
      setSearchingTargets(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTargetQuery, allRegisteredUsers]);

  async function fetchQuickTargets() {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified, is_suspended, is_banned, is_shadowbanned, followers_count, email, phone, city")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setAllRegisteredUsers(data);
        setQuickTargets(data.slice(0, 8));
        setTargetSearchResults(data);
        if (!activeUserId && !targetUserId) {
          const defaultTarget = data.find((d) => d.username === "saionmahmud") || data[0];
          setActiveUserId(defaultTarget.id);
        }
      }
    } catch (err) {
      console.error("Failed to load targets", err);
    }
  }

  function handleSelectTargetUser(u: any) {
    setActiveUserId(u.id);
    setSearchTargetQuery("");
    setIsSearchOpen(false);
    toast.success(`Active surveillance target set to @${u.username}`);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const results = searchTargetQuery.trim() ? targetSearchResults : allRegisteredUsers;
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchFocusedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[searchFocusedIndex >= 0 ? searchFocusedIndex : 0];
      if (target) {
        handleSelectTargetUser(target);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  }

  async function fetchAllSurveillanceData(userId: string) {
    setLoadingProfile(true);
    await Promise.all([
      fetchUserProfileAndAuth(userId),
      fetchSessions(userId),
      fetchReports(userId),
      fetchContent(userId),
      fetchMessages(userId),
      fetchSocialGraph(userId),
      fetchLikes(userId),
      fetchNotifications(userId),
      fetchAuditLogs(userId),
    ]);
    setLoadingProfile(false);
  }

  async function fetchLiveTelemetry(userId: string) {
    fetchSessions(userId);
    fetchReports(userId);
    if (wiretapScope === "user") fetchMessages(userId);
    else fetchGlobalMessages();
    fetchNotifications(userId);
  }

  async function fetchUserProfileAndAuth(userId: string) {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      setProfile(data);
      setReachMultiplier(data.reach_multiplier ?? 1.0);

      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(userId);
        if (authUser?.user) {
          setAuthRecord(authUser.user);
        }
      } catch (_) {}
    } catch (err: any) {
      toast.error("Failed to load profile: " + err.message);
    }
  }

  async function fetchSessions(userId: string) {
    setLoadingSessions(true);
    try {
      const { data } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active", { ascending: false });
      setUserSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function fetchReports(userId: string) {
    setLoadingReports(true);
    try {
      const { data } = await supabase
        .from("reports")
        .select("*, reporter:profiles!reports_user_id_fkey(id, username, avatar_url)")
        .or(`user_id.eq.${userId},thread_id.is.not.null`)
        .order("created_at", { ascending: false })
        .limit(20);
      setReportsAgainstUser(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReports(false);
    }
  }

  async function fetchContent(userId: string) {
    setLoadingContent(true);
    try {
      const [threadsRes, commentsRes] = await Promise.all([
        supabase
          .from("threads")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("comments")
          .select("*, thread:threads(id, content)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setUserThreads(threadsRes.data || []);
      setUserComments(commentsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContent(false);
    }
  }

  // Fetch DMs for the current user and auto-decrypt
  async function fetchMessages(userId: string) {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "*, sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, public_key), receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url, public_key)"
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true })
        .limit(300);

      if (!error && data) {
        setMessages(data);
        if (data.length > 0) {
          const firstOtherId = data[0].sender_id === userId ? data[0].receiver_id : data[0].sender_id;
          setActiveDmPartnerId((prev) => prev || firstOtherId);
          // Decrypt in background
          decryptMessagesList(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  // Fetch ALL messages across the platform (Global Wiretap Mode)
  async function fetchGlobalMessages() {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "*, sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, public_key), receiver:profiles!messages_receiver_id_fkey(id, username, full_name, avatar_url, public_key)"
        )
        .order("created_at", { ascending: true })
        .limit(400);

      if (!error && data) {
        setAllPlatformMessages(data);
        if (data.length > 0) {
          const partnerId = data[0].receiver_id;
          setActiveDmPartnerId((prev) => prev || partnerId);
          decryptMessagesList(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }

  // Automatic E2EE Decryption Engine
  async function decryptMessagesList(msgList: any[]) {
    const newDecrypted: Record<string, { text: string; decrypted: boolean }> = {};
    for (const m of msgList) {
      if (!m.content || !m.content.startsWith("E2EE:v1:")) {
        newDecrypted[m.id] = { text: m.content || "", decrypted: false };
        continue;
      }
      const sPubKey = Array.isArray(m.sender) ? m.sender[0]?.public_key : m.sender?.public_key;
      const rPubKey = Array.isArray(m.receiver) ? m.receiver[0]?.public_key : m.receiver?.public_key;

      const res = await decryptAdminMessageBidirectional(
        m.sender_id,
        m.receiver_id,
        sPubKey,
        rPubKey,
        m.content
      );
      newDecrypted[m.id] = res;
    }
    setDecryptedMap((prev) => ({ ...prev, ...newDecrypted }));
  }

  async function fetchSocialGraph(userId: string) {
    setLoadingGraph(true);
    try {
      const [followersRes, followingRes, blocksRes] = await Promise.all([
        supabase
          .from("follows")
          .select("*, follower:profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, is_verified, followers_count)")
          .eq("following_id", userId)
          .limit(50),
        supabase
          .from("follows")
          .select("*, following:profiles!follows_following_id_fkey(id, username, full_name, avatar_url, is_verified, followers_count)")
          .eq("follower_id", userId)
          .limit(50),
        supabase
          .from("blocks")
          .select("*, blocker:profiles!blocks_blocker_id_fkey(id, username, full_name, avatar_url), blocked:profiles!blocks_blocked_id_fkey(id, username, full_name, avatar_url)")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
          .limit(50),
      ]);

      setFollowers(followersRes.data || []);
      setFollowing(followingRes.data || []);
      setBlocks(blocksRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGraph(false);
    }
  }

  async function fetchLikes(userId: string) {
    setLoadingLikes(true);
    try {
      const { data } = await supabase
        .from("likes")
        .select("*, thread:threads(*, author:profiles!threads_user_id_fkey(id, username, avatar_url))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(40);
      setLikes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLikes(false);
    }
  }

  async function fetchNotifications(userId: string) {
    setLoadingNotifications(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function fetchAuditLogs(userId: string) {
    setLoadingAudit(true);
    try {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .ilike("details", `%${userId}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      setAuditLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  }

  // --- Admin Actions ---

  async function handleToggleSuspend() {
    if (!profile) return;
    const nextState = !profile.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: nextState, is_banned: false })
      .eq("id", profile.id);

    if (!error) {
      toast.success(nextState ? `@${profile.username} suspended` : `@${profile.username} restored`);
      setProfile((p: any) => ({ ...p, is_suspended: nextState, is_banned: false }));
      await supabase.from("audit_logs").insert({
        admin_id: "admin@pigeon.com",
        action: nextState ? "Account Suspended" : "Account Restored",
        details: `${nextState ? "Suspended" : "Restored"} @${profile.username} (${profile.id})`,
        ip_address: "127.0.0.1",
      });
    } else {
      toast.error("Failed to update suspension");
    }
  }

  async function handleToggleBan() {
    if (!profile) return;
    const nextState = !profile.is_banned;
    const { error } = await supabase.from("profiles").update({ is_banned: nextState }).eq("id", profile.id);

    if (!error) {
      toast.success(nextState ? `@${profile.username} banned` : `Ban lifted for @${profile.username}`);
      setProfile((p: any) => ({ ...p, is_banned: nextState }));
      await supabase.from("audit_logs").insert({
        admin_id: "admin@pigeon.com",
        action: nextState ? "Account Banned" : "Ban Lifted",
        details: `${nextState ? "Banned" : "Lifted ban for"} @${profile.username} (${profile.id})`,
        ip_address: "127.0.0.1",
      });
    } else {
      toast.error("Failed to update ban status");
    }
  }

  async function handleToggleShadowban() {
    if (!profile) return;
    const nextState = !profile.is_shadowbanned;
    const { error } = await supabase.from("profiles").update({ is_shadowbanned: nextState }).eq("id", profile.id);

    if (!error) {
      toast.success(nextState ? `@${profile.username} shadowbanned` : `Shadowban removed`);
      setProfile((p: any) => ({ ...p, is_shadowbanned: nextState }));
    } else {
      toast.error("Failed to toggle shadowban");
    }
  }

  async function handleToggleVerify() {
    if (!profile) return;
    const nextState = !profile.is_verified;
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: nextState, badge_type: nextState ? "blue" : null })
      .eq("id", profile.id);

    if (!error) {
      toast.success(nextState ? `Verification granted` : `Verification revoked`);
      setProfile((p: any) => ({ ...p, is_verified: nextState, badge_type: nextState ? "blue" : null }));
    } else {
      toast.error("Failed to update badge");
    }
  }

  async function handleSaveReachMultiplier() {
    if (!profile) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reach_multiplier: reachMultiplier })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success(`Reach multiplier updated to ${reachMultiplier}x`);
      setProfile((p: any) => ({ ...p, reach_multiplier: reachMultiplier }));
      setTuningDialogOpen(false);
    } catch (e: any) {
      toast.error("Failed to update reach: " + e.message);
    }
  }

  async function handleSendSystemWarning() {
    if (!profile || !warningMessage.trim()) return;
    setSendingWarning(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: profile.id,
        type: "system_alert",
        content: `ADMIN SECURITY WARNING: ${warningMessage.trim()}`,
      });
      if (error) throw error;

      toast.success(`Official warning transmitted to @${profile.username}`);
      setWarningMessage("");
      setWarningDialogOpen(false);
      fetchNotifications(profile.id);
    } catch (e: any) {
      toast.error("Failed to transmit warning: " + e.message);
    } finally {
      setSendingWarning(false);
    }
  }

  async function handleTerminateSession(sessionId: string) {
    try {
      const { error } = await supabase.from("user_sessions").delete().eq("id", sessionId);
      if (error) throw error;
      toast.success("Remote session terminated");
      setUserSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e: any) {
      toast.error("Failed to terminate session: " + e.message);
    }
  }

  async function handleDeleteContentItem() {
    if (!confirmDeleteContent) return;
    const { id, type } = confirmDeleteContent;
    try {
      if (type === "thread") {
        await supabase.from("threads").delete().eq("id", id);
        setUserThreads((prev) => prev.filter((t) => t.id !== id));
        toast.success("Thread permanently purged");
      } else {
        await supabase.from("comments").delete().eq("id", id);
        setUserComments((prev) => prev.filter((c) => c.id !== id));
        toast.success("Comment deleted");
      }
      setConfirmDeleteContent(null);
    } catch (e: any) {
      toast.error("Failed to delete item: " + e.message);
    }
  }

  async function handleCopyPasswordReset() {
    const email = profile?.email || authRecord?.email;
    if (!email) {
      toast.error("No verified email on file for password reset link");
      return;
    }
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (error) throw error;
      const link = data?.properties?.action_link;
      if (link) {
        navigator.clipboard.writeText(link);
        toast.success("Recovery token copied to clipboard!");
      }
    } catch (e: any) {
      toast.error("Reset failed: " + e.message);
    }
  }

  const calculateRiskScore = () => {
    if (!profile) return 0;
    let score = 5;
    if (profile.is_banned) score += 50;
    if (profile.is_suspended) score += 35;
    if (profile.is_shadowbanned) score += 25;
    if (profile.reach_multiplier && profile.reach_multiplier < 1) score += 15;
    if (reportsAgainstUser.length > 0) score += Math.min(30, reportsAgainstUser.length * 10);
    if (blocks.length > 0) score += Math.min(20, blocks.length * 5);
    return Math.min(100, Math.max(0, score));
  };

  const riskScore = calculateRiskScore();
  const getRiskBadge = (score: number) => {
    if (score >= 65) {
      return (
        <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 gap-1 text-xs font-mono font-bold animate-pulse">
          <Flame className="size-3.5" /> CRITICAL RISK ({score}%)
        </Badge>
      );
    }
    if (score >= 35) {
      return (
        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 gap-1 text-xs font-mono font-semibold">
          <AlertTriangle className="size-3.5" /> ELEVATED RISK ({score}%)
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 gap-1 text-xs font-mono font-semibold">
        <Shield className="size-3.5" /> NOMINAL STATUS ({score}%)
      </Badge>
    );
  };

  // Compute active message pool based on wiretapScope
  const activeMessagePool = wiretapScope === "global" ? allPlatformMessages : messages;

  // Group conversations by partner
  const dmPartnersMap: Record<string, { user: any; lastMsg: any; count: number; otherId: string }> = {};
  activeMessagePool.forEach((msg) => {
    const isSender = profile ? msg.sender_id === profile.id : false;
    const otherUser = isSender
      ? Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver
      : Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
    const otherId = isSender ? msg.receiver_id : msg.sender_id;

    if (!otherId) return;

    if (!dmPartnersMap[otherId]) {
      dmPartnersMap[otherId] = {
        user: otherUser || { id: otherId, username: "user_" + otherId.slice(0, 6) },
        lastMsg: msg,
        count: 1,
        otherId,
      };
    } else {
      dmPartnersMap[otherId].count += 1;
      dmPartnersMap[otherId].lastMsg = msg;
    }
  });

  const activeChatMessages = activeMessagePool
    .filter(
      (m) =>
        activeDmPartnerId &&
        (m.sender_id === activeDmPartnerId || m.receiver_id === activeDmPartnerId)
    )
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return chatSortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      {/* 1. Global Surveillance Control Bar & Quick Target Switcher */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("users")}
            className="size-8 shrink-0 hover:bg-muted"
            title="Return to Users Table"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="size-2.5 rounded-full bg-rose-500 animate-ping absolute" />
              <span className="size-2.5 rounded-full bg-rose-500" />
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-500">
              Live Surveillance Hub
            </span>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 border-primary/30 text-primary">
              v4.2 PRO
            </Badge>
          </div>
        </div>

        {/* Target Switcher & Search Bar */}
        <div className="flex items-center gap-3 shrink-0 justify-end">
          <div ref={searchContainerRef} className="relative w-80 sm:w-96">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="Track target (@username, name, phone, UUID)..."
                className="pl-9 pr-20 h-9 text-xs bg-muted/60 focus:bg-background border-primary/25 focus:border-primary shadow-inner transition-all rounded-lg font-medium"
                value={searchTargetQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchTargetQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchingTargets && (
                  <RefreshCw className="size-3.5 animate-spin text-primary" />
                )}
                {searchTargetQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTargetQuery("");
                      setTargetSearchResults(allRegisteredUsers);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-muted-foreground/80 bg-background/80 px-1.5 py-0.5 rounded border border-border/80 shadow-xs pointer-events-none">
                    /
                  </kbd>
                )}
              </div>
            </div>

            {/* Target Dropdown Results */}
            {isSearchOpen && (
              <div className="absolute right-0 sm:left-0 sm:right-auto w-[380px] sm:w-[460px] top-full mt-1.5 bg-popover/98 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in-0 zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-muted/60 border-b border-border/60">
                  <span>
                    {searchTargetQuery ? `Search Results (${targetSearchResults.length})` : `All Registered Targets (${allRegisteredUsers.length})`}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground/80 lowercase">
                    ↑↓ navigate • ↵ select • esc close
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                  {(searchTargetQuery ? targetSearchResults : allRegisteredUsers).length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <p className="text-xs font-medium">No surveillance target found</p>
                      <p className="text-[10px] mt-0.5 text-muted-foreground/70">
                        Try searching by username, name, phone, or UUID
                      </p>
                    </div>
                  ) : (
                    (searchTargetQuery ? targetSearchResults : allRegisteredUsers).map((u, idx) => {
                      const isSelected = activeUserId === u.id;
                      const isFocused = searchFocusedIndex === idx;
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectTargetUser(u)}
                          onMouseEnter={() => setSearchFocusedIndex(idx)}
                          className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                            isFocused
                              ? "bg-primary/15 text-foreground"
                              : isSelected
                              ? "bg-accent/60"
                              : "hover:bg-accent/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative shrink-0">
                              <Avatar className="size-8 border border-border/60">
                                {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                                <AvatarFallback className="text-xs font-semibold bg-muted">
                                  {u.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isSelected && (
                                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                              )}
                            </div>
                            <div className="truncate flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-xs truncate">@{u.username}</p>
                                {u.is_verified && (
                                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-primary/10 text-primary border-primary/30">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {u.full_name || "Anonymous User"}
                                {u.city ? ` • ${u.city}` : ""}
                                {u.phone ? ` • ${u.phone}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {u.is_banned ? (
                              <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Banned</Badge>
                            ) : u.is_suspended ? (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 text-amber-500 bg-amber-500/10">Suspended</Badge>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                {u.followers_count ?? 0} followers
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Target Chips */}
          <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1">Targets:</span>
            {quickTargets.slice(0, 4).map((qt) => (
              <Button
                key={qt.id}
                variant={activeUserId === qt.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5 gap-1 font-mono"
                onClick={() => setActiveUserId(qt.id)}
              >
                @{qt.username}
                {qt.is_banned && <span className="size-1.5 rounded-full bg-rose-500" />}
                {qt.is_suspended && <span className="size-1.5 rounded-full bg-amber-500" />}
              </Button>
            ))}
          </div>

          {/* Realtime Switch & Refresh */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="flex items-center gap-1.5" title="Auto-refresh surveillance feeds every 15 seconds">
              <Switch
                checked={realtimeTracking}
                onCheckedChange={setRealtimeTracking}
                id="realtime-mode"
                className="scale-75"
              />
              <Label htmlFor="realtime-mode" className="text-xs cursor-pointer font-mono hidden sm:inline">
                Live Pulse
              </Label>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => {
                if (activeUserId) fetchAllSurveillanceData(activeUserId);
                toast.info("Surveillance feeds refreshed");
              }}
              disabled={loadingProfile}
            >
              <RefreshCw className={`size-3.5 ${loadingProfile ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {loadingProfile && !profile ? (
        <div className="p-8 space-y-6">
          <Skeleton className="h-44 w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      ) : !profile ? (
        <div className="p-16 text-center">
          <UserX className="size-12 mx-auto text-muted-foreground/60 mb-3" />
          <h2 className="text-lg font-bold">No Surveillance Target Active</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Search for a username above or select one of the monitored targets to inspect live telemetry.
          </p>
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* 2. Executive Surveillance Header Card */}
          <Card className="border shadow-md overflow-hidden relative">
            <div
              className="h-32 w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 relative border-b"
              style={
                profile.cover_url
                  ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
              <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
                {getRiskBadge(riskScore)}
                <Badge variant="outline" className="bg-background/80 backdrop-blur text-[11px] font-mono">
                  MULT: {profile.reach_multiplier ?? 1.0}x
                </Badge>
              </div>
            </div>

            <CardContent className="pt-0 pb-6 px-6 relative">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 mb-4">
                {/* Avatar & Handles */}
                <div className="flex items-end gap-4">
                  <div className="relative">
                    <Avatar className="size-24 border-4 border-background shadow-xl rounded-2xl">
                      {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                      <AvatarFallback className="text-2xl font-black bg-muted">
                        {profile.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-1 right-1 size-4 rounded-full border-2 border-background ${
                        userSessions.length > 0 ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-zinc-400"
                      }`}
                      title={userSessions.length > 0 ? "Device online" : "Offline"}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-black tracking-tight">{profile.full_name || "Unknown Name"}</h1>
                      {profile.is_verified && (
                        <CheckCircle2 className="size-5 text-blue-500 fill-blue-500/20 shrink-0" />
                      )}
                      {profile.role && (
                        <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 text-[10px] uppercase font-bold">
                          {profile.role}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-mono font-bold text-foreground">@{profile.username}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <MapPin className="size-3 text-muted-foreground" />
                        {[profile.city, profile.country].filter(Boolean).join(", ") || "Location Unset"}
                      </span>
                      <span>•</span>
                      <span className="text-xs">Joined {formatTimeAgo(profile.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Interdiction Command Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setWarningDialogOpen(true)}
                  >
                    <Send className="size-3.5 text-amber-500" /> Transmit Warning
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => setTuningDialogOpen(true)}
                  >
                    <Sliders className="size-3.5 text-blue-500" /> Algorithmic Reach ({profile.reach_multiplier ?? 1.0}x)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleToggleVerify}
                  >
                    <BadgeCheck className="size-3.5 text-blue-500" />
                    {profile.is_verified ? "Revoke Badge" : "Grant Badge"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleToggleShadowban}
                  >
                    <Ghost className="size-3.5 text-purple-500" />
                    {profile.is_shadowbanned ? "Un-shadowban" : "Shadowban"}
                  </Button>

                  {profile.is_suspended ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={handleToggleSuspend}
                    >
                      <UserCheck className="size-3.5" /> Restore Account
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                      onClick={handleToggleSuspend}
                    >
                      <ShieldAlert className="size-3.5" /> Suspend
                    </Button>
                  )}

                  {profile.is_banned ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleToggleBan}
                    >
                      <CheckCircle2 className="size-3.5" /> Lift Ban
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleToggleBan}
                    >
                      <Ban className="size-3.5" /> Ban Account
                    </Button>
                  )}
                </div>
              </div>

              {/* Security & Metric Gauges Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-3 border-t text-xs">
                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Followers</p>
                  <p className="text-base font-bold mt-0.5">{(profile.followers_count ?? 0).toLocaleString()}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Following</p>
                  <p className="text-base font-bold mt-0.5">{(profile.following_count ?? 0).toLocaleString()}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Intercepted Threads</p>
                  <p className="text-base font-bold mt-0.5">{userThreads.length}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Logged Comments</p>
                  <p className="text-base font-bold mt-0.5">{userComments.length}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Intercepted DMs</p>
                  <p className="text-base font-bold mt-0.5 text-primary">{messages.length}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Active Sessions</p>
                  <p className="text-base font-bold mt-0.5 text-emerald-500">{userSessions.length} Devices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Deep Surveillance Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
            <TabsList className="h-10 w-full justify-start overflow-x-auto bg-muted/60 p-1 border">
              <TabsTrigger value="telemetry" className="text-xs gap-1.5">
                <Activity className="size-3.5 text-primary" /> Telemetry & Hardware
              </TabsTrigger>
              <TabsTrigger value="content" className="text-xs gap-1.5">
                <Layers className="size-3.5 text-blue-500" /> Posts & Comments ({userThreads.length + userComments.length})
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs gap-1.5">
                <MessageSquare className="size-3.5 text-emerald-500" /> DMs Wiretap ({wiretapScope === "global" ? allPlatformMessages.length : messages.length})
              </TabsTrigger>
              <TabsTrigger value="network" className="text-xs gap-1.5">
                <Users className="size-3.5 text-indigo-500" /> Social Graph & Blocks ({followers.length + blocks.length})
              </TabsTrigger>
              <TabsTrigger value="likes" className="text-xs gap-1.5">
                <Heart className="size-3.5 text-rose-500" /> Engagement Trail ({likes.length})
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs gap-1.5">
                <Bell className="size-3.5 text-amber-500" /> Notifications Stream ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs gap-1.5">
                <Terminal className="size-3.5 text-zinc-500" /> Enforcement Audit ({auditLogs.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: TELEMETRY & HARDWARE PROFILING */}
            <TabsContent value="telemetry" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Lock className="size-4 text-primary" /> Cryptographic & Auth Footprint
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">User UUID</span>
                      <div className="flex items-center justify-between font-mono">
                        <span className="truncate max-w-[200px]">{profile.id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5"
                          onClick={() => {
                            navigator.clipboard.writeText(profile.id);
                            toast.success("UUID copied");
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Verified Email</span>
                      <p className="font-semibold text-foreground truncate">
                        {profile.email || authRecord?.email || "No email on record"}
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Phone / SMS Identity</span>
                      <p className="font-semibold text-foreground">{profile.phone || authRecord?.phone || "Unbound"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Gender</span>
                        <p className="font-semibold text-foreground">{profile.gender || "Unspecified"}</p>
                      </div>
                      <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Birth Date</span>
                        <p className="font-semibold text-foreground">{profile.birthdate || "Unset"}</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Residential Address</span>
                      <p className="font-semibold text-foreground text-xs">
                        {[profile.village, profile.city, profile.division, profile.zip ? `ZIP: ${profile.zip}` : null, profile.country].filter(Boolean).join(", ") || "Unset"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Occupation</span>
                        <p className="font-semibold text-foreground truncate">{profile.occupation || "Unset"}</p>
                      </div>
                      <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Blood Group</span>
                        {profile.blood_group ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-500 text-xs">
                            🩸 {profile.blood_group}
                          </span>
                        ) : (
                          <p className="font-semibold text-muted-foreground">Unset</p>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Education</span>
                      <p className="font-semibold text-foreground truncate">{profile.education || "Unset"}</p>
                    </div>

                    {profile.website && (
                      <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Website / Portfolio</span>
                        <p className="truncate">
                          <a
                            href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                          >
                            {profile.website} <ExternalLink className="size-3" />
                          </a>
                        </p>
                      </div>
                    )}

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">E2EE Cryptographic Key</span>
                      <p className="font-mono text-[11px] flex items-center gap-1.5">
                        {profile.public_key ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <Lock className="size-3" /> Registered (Curve25519)
                          </span>
                        ) : (
                          <span className="text-amber-500">Unregistered / Plaintext</span>
                        )}
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-muted/30 border space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Push Gateway Token (FCM)</span>
                      <p className="font-mono text-[11px] truncate">
                        {profile.fcm_token ? (
                          <span className="text-emerald-500 font-semibold">Online & Push Enabled</span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5 mt-2"
                      onClick={handleCopyPasswordReset}
                    >
                      <KeyRound className="size-3.5 text-amber-500" /> Copy Password Reset Token
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm md:col-span-2">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Smartphone className="size-4 text-emerald-500" /> Active Hardware & Session Telemetry
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Realtime connection sessions recorded in `user_sessions`
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {userSessions.length} Active
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingSessions ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : userSessions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <Smartphone className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                        No active session tokens currently recorded. User may be offline.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {userSessions.map((s) => (
                          <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-xs">
                            <div className="flex items-start gap-3">
                              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                <Smartphone className="size-4" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{s.device_name || "Unknown Client"}</p>
                                  <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                                    {s.status || "Active now"}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground font-mono text-[11px]">
                                  Location: {s.location || "Unknown"} • IP: {s.ip_address || "Internal Proxy"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Last heartbeat: {format(new Date(s.last_active), "PPP p")} ({formatTimeAgo(s.last_active)})
                                </p>
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleTerminateSession(s.id)}
                            >
                              Kill Session
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-500" /> Moderation Strikes & Community Reports
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Flags reported by other members or automated safety sensors
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingReports ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : reportsAgainstUser.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="size-6 mx-auto text-emerald-500 mb-1" />
                      No community violations or incident reports recorded against this profile.
                    </div>
                  ) : (
                    <div className="divide-y text-xs">
                      {reportsAgainstUser.map((rep) => (
                        <div key={rep.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="text-[10px]">
                                {rep.reason || "Policy Violation"}
                              </Badge>
                              <span className="text-muted-foreground text-[11px]">
                                Status: <strong className="text-foreground">{rep.status || "Pending"}</strong>
                              </span>
                              {rep.action_taken && (
                                <Badge variant="outline" className="text-[10px]">
                                  Action: {rep.action_taken}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                              Report ID: <span className="font-mono">{rep.id}</span> • Filed {formatTimeAgo(rep.created_at)}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate("reports")}
                          >
                            Investigate in Reports
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: CONTENT INTERCEPTOR */}
            <TabsContent value="content" className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={contentFilter === "all" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setContentFilter("all")}
                  >
                    All ({userThreads.length + userComments.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={contentFilter === "threads" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setContentFilter("threads")}
                  >
                    Threads Only ({userThreads.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={contentFilter === "comments" ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setContentFilter("comments")}
                  >
                    Comments Only ({userComments.length})
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Showing latest intercepted posts and replies
                </p>
              </div>

              {loadingContent ? (
                <div className="space-y-3">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {(contentFilter === "all" || contentFilter === "threads") &&
                    userThreads.map((thread) => (
                      <Card key={thread.id} className="border shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
                        <div className="bg-muted/40 px-4 py-2 border-b flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                              Thread
                            </Badge>
                            {thread.is_anonymous && (
                              <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 text-[10px]">
                                Anonymous
                              </Badge>
                            )}
                            {thread.spam_score > 0.5 && (
                              <Badge variant="destructive" className="text-[10px]">
                                Spam Score: {(thread.spam_score * 100).toFixed(0)}%
                              </Badge>
                            )}
                            <span className="font-mono text-[10px] text-muted-foreground">ID: {thread.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatTimeAgo(thread.created_at)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDeleteContent({ id: thread.id, type: "thread" })}
                              title="Delete Thread"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-4 space-y-3">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{thread.content || "(No text content)"}</p>

                          {thread.image_urls && thread.image_urls.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {thread.image_urls.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="media"
                                  className="h-20 w-28 object-cover rounded-md border cursor-pointer hover:opacity-80"
                                  onClick={() => setPreviewImage(img)}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span>❤️ {thread.likes_count ?? 0} likes</span>
                            <span>💬 {thread.replies_count ?? 0} replies</span>
                            <span>👁️ {thread.views_count ?? 0} views</span>
                            <span>🔁 {thread.reposts_count ?? 0} reposts</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {(contentFilter === "all" || contentFilter === "comments") &&
                    userComments.map((comment) => (
                      <Card key={comment.id} className="border shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
                        <div className="bg-muted/40 px-4 py-2 border-b flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                              Comment
                            </Badge>
                            <span className="font-mono text-[10px] text-muted-foreground">ID: {comment.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive hover:bg-destructive/10"
                              onClick={() => setConfirmDeleteContent({ id: comment.id, type: "comment" })}
                              title="Delete Comment"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                          {comment.thread && (
                            <div className="p-2.5 rounded bg-muted/50 border text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">In Response to Thread: </span>
                              {comment.thread.content || "Media / Poll Post"}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                  {userThreads.length === 0 && userComments.length === 0 && (
                    <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
                      No posts or comments found from this profile.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: DIRECT MESSAGES WIRETAP (WITH REALTIME E2EE AUTO-DECRYPT) */}
            <TabsContent value="messages" className="space-y-4">
              {/* Surveillance Banner & Master Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2.5">
                  <Unlock className="size-5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ADMIN MASTER DECRYPTION & WIRETAP: ACTIVE
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px] font-mono">
                        X25519 + AES-GCM
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      All End-to-End Encrypted communications (E2EE:v1) are automatically decrypted in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={wiretapScope === "user" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setWiretapScope("user");
                      if (activeUserId) fetchMessages(activeUserId);
                    }}
                  >
                    This User ({messages.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={wiretapScope === "global" ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      setWiretapScope("global");
                      fetchGlobalMessages();
                    }}
                  >
                    Global Network Wiretap (343+)
                  </Button>
                </div>
              </div>

              {loadingMessages ? (
                <Skeleton className="h-96 w-full rounded-xl" />
              ) : Object.keys(dmPartnersMap).length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card space-y-3">
                  <MessageSquare className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-medium text-foreground text-sm">No direct messages found for this user.</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Click below to activate Global Network Wiretap to monitor all 343 conversations across the Dak platform.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setWiretapScope("global");
                      fetchGlobalMessages();
                    }}
                    className="gap-1.5"
                  >
                    <Globe className="size-3.5" /> Switch to Global Wiretap
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 border rounded-xl overflow-hidden shadow-sm bg-card h-[550px]">
                  {/* Left: Conversations list */}
                  <div className="border-r bg-muted/20 flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                      <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        Conversations ({Object.keys(dmPartnersMap).length})
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {wiretapScope === "global" ? "Global" : "Target"}
                      </Badge>
                    </div>

                    {/* Search inside DMs */}
                    <div className="p-2 border-b bg-background">
                      <Input
                        placeholder="Search conversation..."
                        value={dmSearchQuery}
                        onChange={(e) => setDmSearchQuery(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="divide-y flex-1 overflow-y-auto">
                      {Object.entries(dmPartnersMap)
                        .filter(([_, data]) => {
                          if (!dmSearchQuery) return true;
                          const q = dmSearchQuery.toLowerCase();
                          return (
                            data.user?.username?.toLowerCase().includes(q) ||
                            data.user?.full_name?.toLowerCase().includes(q) ||
                            data.lastMsg?.content?.toLowerCase().includes(q)
                          );
                        })
                        .map(([partnerId, data]) => {
                          const isSelected = activeDmPartnerId === partnerId;
                          const lastDecrypted = decryptedMap[data.lastMsg?.id]?.text || data.lastMsg?.content;

                          return (
                            <div
                              key={partnerId}
                              onClick={() => setActiveDmPartnerId(partnerId)}
                              className={`p-3 cursor-pointer transition-colors flex items-center gap-3 ${
                                isSelected ? "bg-accent border-l-2 border-primary" : "hover:bg-muted/40"
                              }`}
                            >
                              <Avatar className="size-9 shrink-0">
                                {data.user?.avatar_url && <AvatarImage src={data.user.avatar_url} />}
                                <AvatarFallback className="text-xs font-bold">
                                  {data.user?.username?.charAt(0).toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-xs truncate">@{data.user?.username || "unknown"}</p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatTimeAgo(data.lastMsg.created_at)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {data.lastMsg.media_url ? (
                                    <span className="text-primary font-medium flex items-center gap-1">
                                      <ImageIcon className="size-3" /> [Photo]
                                    </span>
                                  ) : (
                                    lastDecrypted || "(Empty)"
                                  )}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                                {data.count}
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right: Active Chat Stream */}
                  <div className="md:col-span-2 flex flex-col h-full bg-background">
                    {/* Chat Header */}
                    <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                      <div className="flex items-center gap-2.5 text-xs">
                        <Avatar className="size-7 border">
                          {dmPartnersMap[activeDmPartnerId || ""]?.user?.avatar_url && (
                            <AvatarImage src={dmPartnersMap[activeDmPartnerId || ""]?.user?.avatar_url} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {dmPartnersMap[activeDmPartnerId || ""]?.user?.username?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm leading-tight">
                            @{dmPartnersMap[activeDmPartnerId || ""]?.user?.username || "Selected Partner"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {dmPartnersMap[activeDmPartnerId || ""]?.user?.full_name || "User ID: " + activeDmPartnerId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeDmPartnerId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] px-2 gap-1"
                            onClick={() => {
                              setActiveUserId(activeDmPartnerId);
                              toast.info(`Switched surveillance target to @${dmPartnersMap[activeDmPartnerId]?.user?.username}`);
                            }}
                          >
                            <Radio className="size-3 text-rose-500" /> Switch Target
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 gap-1.5 font-mono"
                          onClick={() => setChatSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                          title="Toggle Newest vs Oldest First"
                        >
                          <ArrowUpDown className="size-3 text-primary" />
                          <span>{chatSortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
                        </Button>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {activeChatMessages.length} Messages
                        </Badge>
                      </div>
                    </div>

                    {/* Messages Scroll Body */}
                    <ScrollArea className="flex-1 p-4">
                      {activeChatMessages.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                          Select a conversation from the left to read messages.
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {activeChatMessages.map((msg) => {
                            const isSender = profile ? msg.sender_id === profile.id : msg.sender_id === activeChatMessages[0].sender_id;
                            const decInfo = decryptedMap[msg.id];
                            const displayText = decInfo ? decInfo.text : msg.content;
                            const wasDecrypted = decInfo ? decInfo.decrypted : false;

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[78%] ${isSender ? "ml-auto items-end" : "items-start"}`}
                              >
                                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground font-mono">
                                  <span>{isSender ? `@${profile?.username || "sender"}` : `@${msg.sender?.username || "partner"}`}</span>
                                  <span>•</span>
                                  <span>{format(new Date(msg.created_at), "h:mm a, MMM d")}</span>
                                  {wasDecrypted && (
                                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20 text-[9px] px-1 py-0 h-4">
                                      🔓 Decrypted
                                    </Badge>
                                  )}
                                </div>

                                <div
                                  className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2 shadow-sm ${
                                    isSender
                                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                                      : "bg-muted border rounded-tl-sm text-foreground"
                                  }`}
                                >
                                  {/* Media preview (Images / Videos) */}
                                  {msg.media_url && (
                                    <div className="rounded-lg overflow-hidden border border-black/10 relative group">
                                      <img
                                        src={msg.media_url}
                                        alt="chat media"
                                        className="max-h-56 max-w-full object-cover cursor-pointer hover:opacity-95"
                                        onClick={() => setPreviewImage(msg.media_url)}
                                      />
                                      <button
                                        onClick={() => setPreviewImage(msg.media_url)}
                                        className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Maximize2 className="size-3" />
                                      </button>
                                    </div>
                                  )}

                                  {/* Special message types */}
                                  {msg.media_type === "wallpaper_change" && (
                                    <p className="italic text-[11px] opacity-80 flex items-center gap-1">
                                      🎨 Changed conversation background wallpaper
                                    </p>
                                  )}
                                  {msg.media_type === "theme_change" && (
                                    <p className="italic text-[11px] opacity-80 flex items-center gap-1">
                                      🎨 Changed chat color theme
                                    </p>
                                  )}

                                  {/* Text Message content */}
                                  {displayText ? (
                                    <p className="whitespace-pre-wrap">{displayText}</p>
                                  ) : !msg.media_url ? (
                                    <p className="italic opacity-60 text-[11px] flex items-center gap-1">
                                      <Lock className="size-3 opacity-70" />
                                      <span>(Encrypted - generated with previous session key)</span>
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: SOCIAL GRAPH & NETWORK */}
            <TabsContent value="network" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      Followers
                      <Badge variant="secondary">{followers.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-80">
                      {followers.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No followers</div>
                      ) : (
                        <div className="divide-y text-xs">
                          {followers.map((f) => {
                            const u = Array.isArray(f.follower) ? f.follower[0] : f.follower;
                            if (!u) return null;
                            return (
                              <div
                                key={f.id}
                                className="p-2.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer"
                                onClick={() => setActiveUserId(u.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-7">
                                    <AvatarImage src={u.avatar_url} />
                                    <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">@{u.username}</p>
                                    <p className="text-[10px] text-muted-foreground">{u.full_name}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="size-6">
                                  <ChevronRight className="size-3 text-muted-foreground" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      Following
                      <Badge variant="secondary">{following.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-80">
                      {following.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">Not following anyone</div>
                      ) : (
                        <div className="divide-y text-xs">
                          {following.map((f) => {
                            const u = Array.isArray(f.following) ? f.following[0] : f.following;
                            if (!u) return null;
                            return (
                              <div
                                key={f.id}
                                className="p-2.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer"
                                onClick={() => setActiveUserId(u.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-7">
                                    <AvatarImage src={u.avatar_url} />
                                    <AvatarFallback>{u.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold">@{u.username}</p>
                                    <p className="text-[10px] text-muted-foreground">{u.full_name}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="size-6">
                                  <ChevronRight className="size-3 text-muted-foreground" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm font-bold flex items-center justify-between text-rose-500">
                      Blocked Relations
                      <Badge variant="destructive">{blocks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-80">
                      {blocks.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">No blocks registered</div>
                      ) : (
                        <div className="divide-y text-xs">
                          {blocks.map((b) => {
                            const isBlocker = b.blocker_id === profile.id;
                            const target = isBlocker
                              ? Array.isArray(b.blocked) ? b.blocked[0] : b.blocked
                              : Array.isArray(b.blocker) ? b.blocker[0] : b.blocker;
                            return (
                              <div key={b.id} className="p-2.5 flex items-center justify-between hover:bg-muted/40">
                                <div>
                                  <Badge variant="outline" className="text-[9px] mb-0.5">
                                    {isBlocker ? "User blocked" : "Blocked by"}
                                  </Badge>
                                  <p className="font-semibold">@{target?.username || "unknown"}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{formatTimeAgo(b.created_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB 5: ENGAGEMENT & LIKES TRAIL */}
            <TabsContent value="likes" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Heart className="size-4 text-rose-500" /> Sentiment & Engagement Footprint
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Content items liked and upvoted by @{profile.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingLikes ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : likes.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      No liked posts recorded for this user.
                    </div>
                  ) : (
                    <div className="divide-y text-xs">
                      {likes.map((l) => (
                        <div key={l.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                Liked thread by @{l.thread?.author?.username || "unknown"}
                              </span>
                              <span className="text-muted-foreground text-[10px]">
                                {formatTimeAgo(l.created_at)}
                              </span>
                            </div>
                            <p className="text-muted-foreground bg-muted/40 p-2 rounded border max-w-2xl">
                              {l.thread?.content || "(Media / Poll content)"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            Thread: {l.thread_id?.slice(0, 8)}...
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 6: NOTIFICATIONS STREAM */}
            <TabsContent value="notifications" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bell className="size-4 text-amber-500" /> In-App Notification Delivery Stream
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exact stream of push alerts and system messages delivered to this user's client
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingNotifications ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      No notification logs found.
                    </div>
                  ) : (
                    <div className="divide-y text-xs">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {n.type || "Alert"}
                              </Badge>
                              <span className="font-medium text-foreground">{n.content}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">ID: {n.id}</p>
                          </div>
                          <span className="text-muted-foreground text-[10px] shrink-0 font-mono">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 7: ENFORCEMENT AUDIT LOGS */}
            <TabsContent value="audit" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Terminal className="size-4 text-zinc-500" /> Administrative Audit & Moderation Trail
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tamper-evident logs of every admin intervention executed on this account
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingAudit ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">
                      No historical audit actions recorded for this user.
                    </div>
                  ) : (
                    <div className="divide-y text-xs font-mono">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                                {log.action}
                              </Badge>
                              <span className="text-foreground">{log.details}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Executed by: {log.admin_id} • IP: {log.ip_address}
                            </p>
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            {format(new Date(log.created_at), "PPP p")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ================= MODALS & DIALOGS ================= */}

      {/* Dialog 1: Full Image Preview Modal */}
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-zinc-800">
          {previewImage && (
            <div className="flex flex-col items-center justify-center p-2">
              <img src={previewImage} alt="Fullscreen preview" className="max-h-[80vh] max-w-full object-contain rounded" />
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => window.open(previewImage, "_blank")}
              >
                <ExternalLink className="size-3.5 mr-1" /> Open Original URL
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Transmit System Warning */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" /> Dispatch Administrative Warning
            </DialogTitle>
            <DialogDescription>
              Deliver an official in-app warning notification directly to @{profile?.username}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Warning Message Content</Label>
            <Textarea
              rows={4}
              placeholder="e.g. Your recent posts violated Dak community guidelines regarding hate speech. Further infractions will lead to an immediate ban."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendSystemWarning} disabled={sendingWarning || !warningMessage.trim()}>
              {sendingWarning ? "Transmitting..." : "Dispatch Warning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: Algorithmic Reach Multiplier Tuner */}
      <Dialog open={tuningDialogOpen} onOpenChange={setTuningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" /> Tune Algorithmic Reach Multiplier
            </DialogTitle>
            <DialogDescription>
              Adjust feed distribution algorithm factor for @{profile?.username}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="text-center p-4 bg-muted/40 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Selected Multiplier</p>
              <p className="text-3xl font-black text-primary mt-1">{reachMultiplier.toFixed(1)}x</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Quick Presets</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "0.1x", value: 0.1 },
                  { label: "0.5x", value: 0.5 },
                  { label: "1.0x", value: 1.0 },
                  { label: "2.0x", value: 2.0 },
                  { label: "5.0x", value: 5.0 },
                ].map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={reachMultiplier === p.value ? "default" : "outline"}
                    className="text-xs font-mono h-8"
                    onClick={() => setReachMultiplier(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTuningDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReachMultiplier}>Apply Multiplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 4: Confirm Delete Content Item */}
      <Dialog open={Boolean(confirmDeleteContent)} onOpenChange={(open) => !open && setConfirmDeleteContent(null)}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Permanent Content Removal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this {confirmDeleteContent?.type}?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            This action immediately purges the item from the database, feeds, and client cache.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteContent(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContentItem}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
