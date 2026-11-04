import { useState, useEffect, useRef } from "react";
import {
  Users,
  UserCheck,
  Shield,
  ShieldAlert,
  Ban,
  Ghost,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Search,
  Download,
  Eye,
  Pencil,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  DollarSign,
  KeyRound,
  Sliders,
  MapPin,
  Mail,
  Phone,
  Lock,
  SortAsc,
  SortDesc,
  AlertTriangle,
  UserX,
  Radio
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import { supabase } from "@/lib/supabase";
import { formatTimeAgo } from "@/hooks/use-supabase";
import { useNavigation } from "@/contexts/NavigationContext";

const PAGE_SIZE = 20;

export type UserProfile = {
  id: string;
  username: string;
  full_name: string;
  bio?: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  role: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  is_banned: boolean;
  is_shadowbanned: boolean;
  can_monetize: boolean;
  badge_type: string | null;
  reach_multiplier: number | null;
  followers_count: number;
  following_count: number;
  phone?: string | null;
  country?: string | null;
  division?: string | null;
  city?: string | null;
  village?: string | null;
  zip?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  education?: string | null;
  blood_group?: string | null;
  occupation?: string | null;
  website?: string | null;
  email?: string | null;
  last_seen?: string | null;
  public_key?: string | null;
  fcm_token?: string | null;
  created_at: string;
  posts_count?: number;
};

type SortKey = "created_at" | "followers_count" | "following_count" | "reach_multiplier" | "username";
type FilterTab = "all" | "active" | "verified" | "suspended" | "banned" | "shadowbanned" | "monetized" | "staff";

export function UsersPage() {
  const { navigate } = useNavigation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // High-level KPI summary
  const [kpiStats, setKpiStats] = useState({
    total: 0,
    verified: 0,
    suspended: 0,
    shadowbanned: 0,
    monetized: 0,
    staff: 0,
  });

  // Dialog States
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [viewingPostsCount, setViewingPostsCount] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [tuningUser, setTuningUser] = useState<UserProfile | null>(null);
  const [tuningMultiplier, setTuningMultiplier] = useState<number>(1.0);
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null);
  const [resetLinkData, setResetLinkData] = useState<{ username: string; email: string; link: string } | null>(null);
  const [confirmBulkAction, setConfirmBulkAction] = useState<string | null>(null);

  // Form states for edit dialog
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editRole, setEditRole] = useState<string>("user");
  const [editBadgeType, setEditBadgeType] = useState<string>("blue");
  const [editIsVerified, setEditIsVerified] = useState(false);
  const [editCanMonetize, setEditCanMonetize] = useState(false);
  const [editIsSuspended, setEditIsSuspended] = useState(false);
  const [editIsBanned, setEditIsBanned] = useState(false);
  const [editIsShadowbanned, setEditIsShadowbanned] = useState(false);
  const [editOccupation, setEditOccupation] = useState("");
  const [editEducation, setEditEducation] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const searchTimer = useRef<any>(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
  }, [search]);

  // Fetch KPI counters once or on changes
  useEffect(() => {
    fetchKpis();
  }, []);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers();
  }, [page, sortKey, sortAsc, filterTab, debouncedSearch]);

  async function fetchKpis() {
    try {
      const [
        { count: total },
        { count: verified },
        { count: suspended },
        { count: shadowbanned },
        { count: monetized },
        { count: staff },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).or("is_suspended.eq.true,is_banned.eq.true"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_shadowbanned", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("can_monetize", true),
        supabase.from("profiles").select("*", { count: "exact", head: true }).not("role", "is", null),
      ]);

      setKpiStats({
        total: total ?? 0,
        verified: verified ?? 0,
        suspended: suspended ?? 0,
        shadowbanned: shadowbanned ?? 0,
        monetized: monetized ?? 0,
        staff: staff ?? 0,
      });
    } catch (e) {
      console.error("Failed to load user KPIs", e);
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      // 1. Fetch auth users email map via service role
      let emailMap: Record<string, string> = {};
      try {
        const { data: authData } = await supabase.auth.admin.listUsers();
        if (authData?.users) {
          authData.users.forEach((u) => {
            if (u.email) emailMap[u.id] = u.email;
          });
        }
      } catch (authErr) {
        console.warn("Auth admin lookup skipped:", authErr);
      }

      // 2. Build Supabase query
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order(sortKey, { ascending: sortAsc })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filter tabs
      if (filterTab === "active") {
        query = query.eq("is_banned", false).eq("is_suspended", false);
      } else if (filterTab === "verified") {
        query = query.eq("is_verified", true);
      } else if (filterTab === "suspended") {
        query = query.eq("is_suspended", true);
      } else if (filterTab === "banned") {
        query = query.eq("is_banned", true);
      } else if (filterTab === "shadowbanned") {
        query = query.eq("is_shadowbanned", true);
      } else if (filterTab === "monetized") {
        query = query.eq("can_monetize", true);
      } else if (filterTab === "staff") {
        query = query.not("role", "is", null);
      }

      // Server-side search
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.trim().replace(/^@/, "");
        query = query.or(
          `username.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;

      // Merge auth emails
      const merged: UserProfile[] = (data || []).map((p: any) => ({
        ...p,
        email: p.email || emailMap[p.id] || null,
      }));

      setUsers(merged);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load users: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // --- Quick User Actions ---

  async function handleToggleVerify(user: UserProfile) {
    const nextState = !user.is_verified;
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: nextState, badge_type: nextState ? (user.badge_type || "blue") : null })
      .eq("id", user.id);

    if (!error) {
      toast.success(nextState ? `@${user.username} is now verified` : `Verification removed for @${user.username}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_verified: nextState } : u)));
      fetchKpis();
    } else {
      toast.error("Failed to update verification status");
    }
  }

  async function handleToggleSuspend(user: UserProfile) {
    const nextState = !user.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: nextState, is_banned: false })
      .eq("id", user.id);

    if (!error) {
      toast.success(nextState ? `@${user.username} has been suspended` : `@${user.username} has been restored`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: nextState, is_banned: false } : u))
      );
      fetchKpis();
    } else {
      toast.error("Failed to update suspension status");
    }
  }

  async function handleToggleBan(user: UserProfile) {
    const nextState = !user.is_banned;
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: nextState })
      .eq("id", user.id);

    if (!error) {
      toast.success(nextState ? `@${user.username} permanently banned` : `Ban lifted for @${user.username}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_banned: nextState } : u)));
      fetchKpis();
    } else {
      toast.error("Failed to update ban status");
    }
  }

  async function handleToggleShadowban(user: UserProfile) {
    const nextState = !user.is_shadowbanned;
    const { error } = await supabase
      .from("profiles")
      .update({ is_shadowbanned: nextState })
      .eq("id", user.id);

    if (!error) {
      toast.success(nextState ? `@${user.username} shadowbanned` : `Shadowban removed for @${user.username}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_shadowbanned: nextState } : u)));
      fetchKpis();
    } else {
      toast.error("Failed to toggle shadowban");
    }
  }

  async function handleToggleMonetization(user: UserProfile) {
    const nextState = !user.can_monetize;
    const { error } = await supabase
      .from("profiles")
      .update({ can_monetize: nextState })
      .eq("id", user.id);

    if (!error) {
      toast.success(nextState ? `Monetization enabled for @${user.username}` : `Monetization disabled`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, can_monetize: nextState } : u)));
      fetchKpis();
    } else {
      toast.error("Failed to toggle monetization");
    }
  }

  // --- Password Reset Link Generator ---
  async function handleGeneratePasswordReset(user: UserProfile) {
    if (!user.email) {
      toast.error("This user has no associated email address for recovery.");
      return;
    }
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
      });
      if (error) throw error;
      const link = data?.properties?.action_link;
      if (link) {
        setResetLinkData({ username: user.username, email: user.email, link });
        navigator.clipboard.writeText(link);
        toast.success("Recovery link generated and copied to clipboard!");
      } else {
        toast.error("No link returned by Supabase Auth");
      }
    } catch (err: any) {
      toast.error("Password reset failed: " + (err.message || "Unknown error"));
    }
  }

  // --- Open Full Inspector Dialog ---
  async function openUserInspector(user: UserProfile) {
    setViewingUser(user);
    setViewingPostsCount(null);
    try {
      const { count } = await supabase
        .from("threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setViewingPostsCount(count ?? 0);
    } catch (e) {
      setViewingPostsCount(0);
    }
  }

  // --- Open Edit Dialog ---
  function openEditUser(user: UserProfile) {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditUsername(user.username || "");
    setEditBio(user.bio || "");
    setEditRole(user.role || "user");
    setEditBadgeType(user.badge_type || "blue");
    setEditIsVerified(Boolean(user.is_verified));
    setEditCanMonetize(Boolean(user.can_monetize));
    setEditIsSuspended(Boolean(user.is_suspended));
    setEditIsBanned(Boolean(user.is_banned));
    setEditIsShadowbanned(Boolean(user.is_shadowbanned));
    setEditOccupation(user.occupation || "");
    setEditEducation(user.education || "");
    setEditBloodGroup(user.blood_group || "");
    setEditWebsite(user.website || "");
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const payload: any = {
        full_name: editFullName.trim(),
        username: editUsername.trim().toLowerCase(),
        bio: editBio.trim() || null,
        occupation: editOccupation.trim() || null,
        education: editEducation.trim() || null,
        blood_group: editBloodGroup.trim() || null,
        website: editWebsite.trim() || null,
        role: editRole === "user" ? null : editRole,
        badge_type: editBadgeType,
        is_verified: editIsVerified,
        can_monetize: editCanMonetize,
        is_suspended: editIsSuspended,
        is_banned: editIsBanned,
        is_shadowbanned: editIsShadowbanned,
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", editingUser.id);
      if (error) throw error;

      toast.success(`Saved changes for @${payload.username}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u))
      );
      if (viewingUser?.id === editingUser.id) {
        setViewingUser((prev) => (prev ? { ...prev, ...payload } : null));
      }
      setEditingUser(null);
      fetchKpis();
    } catch (err: any) {
      toast.error("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Open Tuning Dialog ---
  function openReachTuner(user: UserProfile) {
    setTuningUser(user);
    setTuningMultiplier(user.reach_multiplier ?? 1.0);
  }

  async function handleSaveReach() {
    if (!tuningUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ reach_multiplier: tuningMultiplier })
        .eq("id", tuningUser.id);

      if (error) throw error;
      toast.success(`Reach multiplier updated to ${tuningMultiplier}x for @${tuningUser.username}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === tuningUser.id ? { ...u, reach_multiplier: tuningMultiplier } : u))
      );
      setTuningUser(null);
    } catch (err: any) {
      toast.error("Failed to update reach: " + (err.message || "Unknown error"));
    }
  }

  // --- Permanent Delete User ---
  async function handleDeleteUser() {
    if (!confirmDelete) return;
    setIsSaving(true);
    try {
      // 1. Delete from auth.users (cascades or cleans up auth)
      try {
        await supabase.auth.admin.deleteUser(confirmDelete.id);
      } catch (authE) {
        console.warn("Auth deletion note:", authE);
      }

      // 2. Delete threads / profile
      await supabase.from("threads").delete().eq("user_id", confirmDelete.id);
      const { error } = await supabase.from("profiles").delete().eq("id", confirmDelete.id);
      if (error) throw error;

      toast.success(`User @${confirmDelete.username} permanently deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setSelectedUsers((prev) => {
        const next = new Set(prev);
        next.delete(confirmDelete.id);
        return next;
      });
      setConfirmDelete(null);
      fetchKpis();
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // --- Bulk Operations ---
  async function handleExecuteBulkAction(action: string) {
    if (selectedUsers.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedUsers);

    try {
      if (action === "verify") {
        await supabase.from("profiles").update({ is_verified: true }).in("id", ids);
        toast.success(`Verified ${ids.length} users`);
      } else if (action === "unverify") {
        await supabase.from("profiles").update({ is_verified: false }).in("id", ids);
        toast.success(`Removed verification for ${ids.length} users`);
      } else if (action === "suspend") {
        await supabase.from("profiles").update({ is_suspended: true, is_banned: false }).in("id", ids);
        toast.success(`Suspended ${ids.length} users`);
      } else if (action === "unsuspend") {
        await supabase.from("profiles").update({ is_suspended: false, is_banned: false }).in("id", ids);
        toast.success(`Restored ${ids.length} users`);
      } else if (action === "shadowban") {
        await supabase.from("profiles").update({ is_shadowbanned: true }).in("id", ids);
        toast.success(`Shadowbanned ${ids.length} users`);
      } else if (action === "unshadowban") {
        await supabase.from("profiles").update({ is_shadowbanned: false }).in("id", ids);
        toast.success(`Cleared shadowban for ${ids.length} users`);
      } else if (action === "boost") {
        await supabase.from("profiles").update({ reach_multiplier: 2.0 }).in("id", ids);
        toast.success(`Boosted reach multiplier (2.0x) for ${ids.length} users`);
      } else if (action === "delete") {
        for (const id of ids) {
          try {
            await supabase.auth.admin.deleteUser(id);
          } catch (_) {}
          await supabase.from("threads").delete().eq("user_id", id);
          await supabase.from("profiles").delete().eq("id", id);
        }
        toast.success(`Permanently deleted ${ids.length} users`);
      }

      setSelectedUsers(new Set());
      setConfirmBulkAction(null);
      fetchUsers();
      fetchKpis();
    } catch (err: any) {
      toast.error("Bulk action failed: " + err.message);
    } finally {
      setBulkLoading(false);
    }
  }

  // --- Export CSV ---
  function handleExportCSV() {
    const dataToExport =
      selectedUsers.size > 0
        ? users.filter((u) => selectedUsers.has(u.id))
        : users;

    if (dataToExport.length === 0) {
      toast.error("No users available to export");
      return;
    }

    const headers = [
      "ID",
      "Username",
      "Full Name",
      "Email",
      "Phone",
      "Role",
      "Verified",
      "Status",
      "Followers",
      "Following",
      "Reach Multiplier",
      "Monetized",
      "City",
      "Joined At",
    ];

    const rows = dataToExport.map((u) => [
      `"${u.id}"`,
      `"@${u.username}"`,
      `"${u.full_name || ""}"`,
      `"${u.email || ""}"`,
      `"${u.phone || ""}"`,
      `"${u.role || "user"}"`,
      u.is_verified ? "YES" : "NO",
      u.is_banned ? "BANNED" : u.is_suspended ? "SUSPENDED" : u.is_shadowbanned ? "SHADOWBANNED" : "ACTIVE",
      u.followers_count ?? 0,
      u.following_count ?? 0,
      `"${u.reach_multiplier ?? 1.0}x"`,
      u.can_monetize ? "YES" : "NO",
      `"${u.city || ""}"`,
      `"${u.created_at}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dak_users_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${dataToExport.length} users to CSV`);
  }

  const allSelected = selectedUsers.size === users.length && users.length > 0;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const getStatusBadge = (user: UserProfile) => {
    if (user.is_banned) {
      return <Badge variant="destructive" className="text-[11px] font-semibold gap-1"><Ban className="size-3" /> Banned</Badge>;
    }
    if (user.is_suspended) {
      return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium gap-1"><Shield className="size-3" /> Suspended</Badge>;
    }
    if (user.is_shadowbanned) {
      return <Badge variant="secondary" className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[11px] font-medium gap-1"><Ghost className="size-3" /> Shadowbanned</Badge>;
    }
    return <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-medium gap-1"><CheckCircle2 className="size-3" /> Active</Badge>;
  };

  const getBadgeTypePill = (badgeType: string | null) => {
    if (!badgeType) return null;
    if (badgeType === "gold" || badgeType === "vip") {
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] uppercase tracking-wider">{badgeType}</Badge>;
    }
    if (badgeType === "government") {
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-[10px] uppercase tracking-wider">Gov</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-[10px] uppercase tracking-wider">Verified</Badge>;
  };

  const getRoleBadge = (role: string | null) => {
    if (!role || role === "user") return <span className="text-xs text-muted-foreground">User</span>;
    if (role === "admin" || role === "superadmin") {
      return <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 text-[10px] font-semibold uppercase tracking-wider">Admin</Badge>;
    }
    if (role === "moderator") {
      return <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30 text-[10px] font-semibold uppercase tracking-wider">Mod</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] uppercase">{role}</Badge>;
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-mono">
              Enterprise Grade
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Global account control, algorithmic distribution tuning, authentication & safety moderation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers();
              fetchKpis();
              toast.info("Refreshed users table");
            }}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Interactive KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          className={`cursor-pointer border transition-all hover:border-primary/50 ${filterTab === "all" ? "border-primary bg-primary/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("all"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Total Accounts</p>
              <p className="text-xl font-bold tracking-tight">{kpiStats.total.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border transition-all hover:border-blue-500/50 ${filterTab === "verified" ? "border-blue-500 bg-blue-500/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("verified"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Verified</p>
              <p className="text-xl font-bold tracking-tight text-blue-500">{kpiStats.verified.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BadgeCheck className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border transition-all hover:border-amber-500/50 ${filterTab === "suspended" ? "border-amber-500 bg-amber-500/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("suspended"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Restricted</p>
              <p className="text-xl font-bold tracking-tight text-amber-500">{kpiStats.suspended.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldAlert className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border transition-all hover:border-purple-500/50 ${filterTab === "shadowbanned" ? "border-purple-500 bg-purple-500/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("shadowbanned"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Shadowbanned</p>
              <p className="text-xl font-bold tracking-tight text-purple-500">{kpiStats.shadowbanned.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Ghost className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border transition-all hover:border-emerald-500/50 ${filterTab === "monetized" ? "border-emerald-500 bg-emerald-500/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("monetized"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Monetized</p>
              <p className="text-xl font-bold tracking-tight text-emerald-500">{kpiStats.monetized.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border transition-all hover:border-rose-500/50 ${filterTab === "staff" ? "border-rose-500 bg-rose-500/5 shadow-sm" : ""}`}
          onClick={() => { setFilterTab("staff"); setPage(0); }}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Staff & Mods</p>
              <p className="text-xl font-bold tracking-tight text-rose-500">{kpiStats.staff.toLocaleString()}</p>
            </div>
            <div className="size-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Shield className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Tabs & Search & Sort Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Tabs
            value={filterTab}
            onValueChange={(val: any) => {
              setFilterTab(val);
              setPage(0);
            }}
          >
            <TabsList className="h-9 w-full justify-start overflow-x-auto bg-muted/60 p-1">
              <TabsTrigger value="all" className="text-xs">All Users ({kpiStats.total})</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Active Only</TabsTrigger>
              <TabsTrigger value="verified" className="text-xs">Verified ({kpiStats.verified})</TabsTrigger>
              <TabsTrigger value="suspended" className="text-xs">Suspended</TabsTrigger>
              <TabsTrigger value="banned" className="text-xs">Banned</TabsTrigger>
              <TabsTrigger value="shadowbanned" className="text-xs">Shadowbanned ({kpiStats.shadowbanned})</TabsTrigger>
              <TabsTrigger value="monetized" className="text-xs">Monetized ({kpiStats.monetized})</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs">Staff ({kpiStats.staff})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by @username, full name, phone, city..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort Dropdown & Sort Order */}
            <div className="flex items-center gap-2">
              <Select
                value={sortKey}
                onValueChange={(val: any) => {
                  setSortKey(val);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Joined Date</SelectItem>
                  <SelectItem value="followers_count">Followers Count</SelectItem>
                  <SelectItem value="following_count">Following Count</SelectItem>
                  <SelectItem value="reach_multiplier">Algorithmic Reach</SelectItem>
                  <SelectItem value="username">Username (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5"
                onClick={() => setSortAsc(!sortAsc)}
                title={sortAsc ? "Ascending" : "Descending"}
              >
                {sortAsc ? <SortAsc className="size-4" /> : <SortDesc className="size-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Bulk Action Floating Bar (when items selected) */}
      {selectedUsers.size > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-2 p-3 px-4 bg-primary text-primary-foreground rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">
              {selectedUsers.size} user{selectedUsers.size > 1 ? "s" : ""} selected
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => setSelectedUsers(new Set())}
            >
              Clear
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("verify")}
              disabled={bulkLoading}
            >
              <BadgeCheck className="size-3.5 mr-1" />
              Verify
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("unverify")}
              disabled={bulkLoading}
            >
              <XCircle className="size-3.5 mr-1" />
              Unverify
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("suspend")}
              disabled={bulkLoading}
            >
              <Shield className="size-3.5 mr-1" />
              Suspend
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("unsuspend")}
              disabled={bulkLoading}
            >
              <UserCheck className="size-3.5 mr-1" />
              Restore
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("shadowban")}
              disabled={bulkLoading}
            >
              <Ghost className="size-3.5 mr-1" />
              Shadowban
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              onClick={() => handleExecuteBulkAction("boost")}
              disabled={bulkLoading}
            >
              <Zap className="size-3.5 mr-1" />
              Boost 2.0x
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-rose-500/80 hover:bg-rose-600 text-white border-none"
              onClick={() => setConfirmBulkAction("delete")}
              disabled={bulkLoading}
            >
              <Trash2 className="size-3.5 mr-1" />
              Delete All
            </Button>
          </div>
        </div>
      )}

      {/* 5. Main Users Table */}
      <Card className="border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="min-w-[220px]">User</TableHead>
                <TableHead className="min-w-[170px]">Contact & Auth</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Reach Multiplier</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="size-4" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="size-8" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserX className="size-8 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search query or switching the filter tab.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const isChecked = selectedUsers.has(user.id);
                  const mult = user.reach_multiplier ?? 1.0;

                  return (
                    <TableRow key={user.id} className={isChecked ? "bg-primary/5" : undefined}>
                      {/* Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedUsers);
                            checked ? next.add(user.id) : next.delete(user.id);
                            setSelectedUsers(next);
                          }}
                        />
                      </TableCell>

                      {/* User Identity */}
                      <TableCell>
                        <div
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => openUserInspector(user)}
                        >
                          <Avatar className="size-9 border border-border group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                            {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                            <AvatarFallback className="text-xs font-semibold bg-muted">
                              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                                @{user.username}
                              </span>
                              {user.is_verified && (
                                <CheckCircle2 className="size-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                              )}
                              {getBadgeTypePill(user.badge_type)}
                              {user.can_monetize && (
                                <span className="inline-flex items-center text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                                  $
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {user.full_name || "Anonymous User"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact & Auth Info */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          {user.email ? (
                            <div className="flex items-center gap-1 text-foreground/90 truncate max-w-[160px]" title={user.email}>
                              <Mail className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">No email record</span>
                          )}

                          {user.phone ? (
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <Phone className="size-3 shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          ) : user.city ? (
                            <div className="flex items-center gap-1 text-muted-foreground truncate">
                              <MapPin className="size-3 shrink-0" />
                              <span>{user.city}{user.country ? `, ${user.country}` : ""}</span>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>{getRoleBadge(user.role)}</TableCell>

                      {/* Status */}
                      <TableCell>{getStatusBadge(user)}</TableCell>

                      {/* Followers / Following */}
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p className="font-medium">{(user.followers_count ?? 0).toLocaleString()} <span className="text-muted-foreground text-[10px]">followers</span></p>
                          <p className="text-muted-foreground text-[11px]">{(user.following_count ?? 0).toLocaleString()} following</p>
                        </div>
                      </TableCell>

                      {/* Reach Multiplier */}
                      <TableCell>
                        <div
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium border transition-colors hover:bg-muted"
                          onClick={() => openReachTuner(user)}
                          title="Click to tune algorithmic reach"
                        >
                          {mult > 1 ? (
                            <span className="text-emerald-500 flex items-center gap-0.5">
                              <Zap className="size-3 fill-emerald-500" />
                              {mult}x Boost
                            </span>
                          ) : mult < 1 ? (
                            <span className="text-rose-500 flex items-center gap-0.5">
                              <Sliders className="size-3" />
                              {mult}x Throttled
                            </span>
                          ) : (
                            <span className="text-muted-foreground">1.0x Normal</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimeAgo(user.created_at)}
                      </TableCell>

                      {/* Per-Row Actions Menu */}
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel className="text-xs">User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* 1. View / Inspect */}
                            <DropdownMenuItem onClick={() => openUserInspector(user)}>
                              <Eye className="size-4 mr-2" /> Inspect Profile
                            </DropdownMenuItem>

                            {/* 2. Monitor */}
                            <DropdownMenuItem onClick={() => navigate("user-monitor", user.id)}>
                              <Radio className="size-4 mr-2 text-primary" /> Open User Monitor
                            </DropdownMenuItem>

                            {/* 3. Edit */}
                            <DropdownMenuItem onClick={() => openEditUser(user)}>
                              <Pencil className="size-4 mr-2" /> Edit Details
                            </DropdownMenuItem>

                            {/* 4. Tune Reach */}
                            <DropdownMenuItem onClick={() => openReachTuner(user)}>
                              <Sliders className="size-4 mr-2 text-blue-500" /> Tune Algorithm Reach
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* 5. Verification Toggle */}
                            <DropdownMenuItem onClick={() => handleToggleVerify(user)}>
                              {user.is_verified ? (
                                <>
                                  <XCircle className="size-4 mr-2 text-amber-500" /> Remove Badge
                                </>
                              ) : (
                                <>
                                  <BadgeCheck className="size-4 mr-2 text-blue-500" /> Grant Blue Badge
                                </>
                              )}
                            </DropdownMenuItem>

                            {/* 6. Monetization Toggle */}
                            <DropdownMenuItem onClick={() => handleToggleMonetization(user)}>
                              <DollarSign className="size-4 mr-2 text-emerald-500" />
                              {user.can_monetize ? "Disable Monetization" : "Enable Monetization"}
                            </DropdownMenuItem>

                            {/* 7. Shadowban Toggle */}
                            <DropdownMenuItem onClick={() => handleToggleShadowban(user)}>
                              <Ghost className="size-4 mr-2 text-purple-500" />
                              {user.is_shadowbanned ? "Remove Shadowban" : "Shadowban User"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* 8. Password Recovery Link */}
                            <DropdownMenuItem onClick={() => handleGeneratePasswordReset(user)}>
                              <KeyRound className="size-4 mr-2 text-amber-500" /> Password Recovery Link
                            </DropdownMenuItem>

                            {/* 9. Copy ID */}
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(user.id);
                                toast.success("Copied User UUID");
                              }}
                            >
                              <Copy className="size-4 mr-2" /> Copy User ID
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* 10. Suspend / Ban / Delete */}
                            {user.is_suspended ? (
                              <DropdownMenuItem onClick={() => handleToggleSuspend(user)}>
                                <UserCheck className="size-4 mr-2 text-emerald-500" /> Unsuspend Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleToggleSuspend(user)}
                                className="text-amber-600 dark:text-amber-400"
                              >
                                <Shield className="size-4 mr-2" /> Suspend Account
                              </DropdownMenuItem>
                            )}

                            {user.is_banned ? (
                              <DropdownMenuItem onClick={() => handleToggleBan(user)}>
                                <CheckCircle2 className="size-4 mr-2 text-emerald-500" /> Lift Ban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleToggleBan(user)}
                                className="text-destructive font-medium"
                              >
                                <Ban className="size-4 mr-2" /> Ban Account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => setConfirmDelete(user)}
                              className="text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="size-4 mr-2" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 6. Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <p className="text-xs text-muted-foreground">
          Showing {users.length > 0 ? page * PAGE_SIZE + 1 : 0} to{" "}
          {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} registered users
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="h-8 gap-1 text-xs"
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Button>

          <span className="text-xs font-medium px-2">
            Page {totalPages === 0 ? 0 : page + 1} of {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount || loading}
            className="h-8 gap-1 text-xs"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* Modal 1: Full User Inspector Modal */}
      <Dialog open={Boolean(viewingUser)} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {viewingUser && (
            <div>
              {/* Cover Banner */}
              <div
                className="h-28 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative flex items-end p-4"
                style={
                  viewingUser.cover_url
                    ? { backgroundImage: `url(${viewingUser.cover_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : undefined
                }
              >
                <div className="absolute -bottom-8 left-6">
                  <Avatar className="size-20 border-4 border-background shadow-lg">
                    {viewingUser.avatar_url && <AvatarImage src={viewingUser.avatar_url} />}
                    <AvatarFallback className="text-lg font-bold bg-muted">
                      {viewingUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* Header Info */}
              <div className="pt-10 px-6 pb-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{viewingUser.full_name || "Anonymous User"}</h2>
                      {viewingUser.is_verified && (
                        <CheckCircle2 className="size-5 text-blue-500 fill-blue-500/20" />
                      )}
                      {getBadgeTypePill(viewingUser.badge_type)}
                      {getStatusBadge(viewingUser)}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">@{viewingUser.username}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setViewingUser(null);
                        openEditUser(viewingUser);
                      }}
                    >
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setViewingUser(null);
                        navigate("user-monitor", viewingUser.id);
                      }}
                      className="gap-1.5"
                    >
                      <Radio className="size-3.5" /> Monitor
                    </Button>
                  </div>
                </div>

                {viewingUser.bio && (
                  <p className="text-sm bg-muted/40 p-3 rounded-md border text-muted-foreground">
                    {viewingUser.bio}
                  </p>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Followers</p>
                    <p className="text-lg font-bold">{(viewingUser.followers_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Following</p>
                    <p className="text-lg font-bold">{(viewingUser.following_count ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Posts</p>
                    <p className="text-lg font-bold">
                      {viewingPostsCount === null ? "..." : viewingPostsCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Reach Mult.</p>
                    <p className="text-lg font-bold text-primary">
                      {viewingUser.reach_multiplier ?? 1.0}x
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Account Identifiers</p>
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">UUID:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="truncate max-w-[140px]">{viewingUser.id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-5"
                          onClick={() => {
                            navigator.clipboard.writeText(viewingUser.id);
                            toast.success("User ID copied");
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium truncate max-w-[170px]">{viewingUser.email || "None"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{viewingUser.phone || "Not set"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="font-medium">{viewingUser.gender || "Not specified"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Birth Date:</span>
                      <span className="font-medium">{viewingUser.birthdate || "Not set"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Full Location:</span>
                      <span className="text-right max-w-[200px] truncate" title={[viewingUser.village, viewingUser.city, viewingUser.division, viewingUser.zip ? `ZIP: ${viewingUser.zip}` : null, viewingUser.country].filter(Boolean).join(", ")}>
                        {[viewingUser.village, viewingUser.city, viewingUser.division, viewingUser.zip ? `ZIP: ${viewingUser.zip}` : null, viewingUser.country].filter(Boolean).join(", ") || "Unknown"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Occupation:</span>
                      <span className="font-medium">{viewingUser.occupation || "Not set"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Education:</span>
                      <span className="font-medium">{viewingUser.education || "Not set"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Blood Group:</span>
                      {viewingUser.blood_group ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold text-xs border border-rose-500/20">
                          🩸 {viewingUser.blood_group}
                        </span>
                      ) : (
                        <span className="font-medium text-muted-foreground">Not set</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Website:</span>
                      {viewingUser.website ? (
                        <a
                          href={viewingUser.website.startsWith("http") ? viewingUser.website : `https://${viewingUser.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline truncate max-w-[180px]"
                        >
                          {viewingUser.website}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Security & System</p>
                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-semibold uppercase">{viewingUser.role || "User"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">E2EE Cryptographic Key:</span>
                      <span className="font-mono text-[11px]">
                        {viewingUser.public_key ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <Lock className="size-3" /> Registered
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Push FCM Token:</span>
                      <span>{viewingUser.fcm_token ? "Active" : "Not registered"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <span className="text-muted-foreground">Joined Platform:</span>
                      <span>{format(new Date(viewingUser.created_at), "PPP p")}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons in Inspector */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleVerify(viewingUser)}
                    className="text-xs"
                  >
                    <BadgeCheck className="size-3.5 mr-1 text-blue-500" />
                    {viewingUser.is_verified ? "Remove Verification" : "Grant Verification"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleMonetization(viewingUser)}
                    className="text-xs"
                  >
                    <DollarSign className="size-3.5 mr-1 text-emerald-500" />
                    {viewingUser.can_monetize ? "Revoke Monetize" : "Enable Monetize"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleShadowban(viewingUser)}
                    className="text-xs"
                  >
                    <Ghost className="size-3.5 mr-1 text-purple-500" />
                    {viewingUser.is_shadowbanned ? "Un-shadowban" : "Shadowban"}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGeneratePasswordReset(viewingUser)}
                    className="text-xs"
                  >
                    <KeyRound className="size-3.5 mr-1 text-amber-500" />
                    Reset Password Link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit User Profile Modal */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile: @{editingUser?.username}</DialogTitle>
            <DialogDescription>
              Direct administrative overrides for user attributes, privileges, and moderation states.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Display name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Handle"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="User bio description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Occupation</Label>
                <Input
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Education</Label>
                <Input
                  value={editEducation}
                  onChange={(e) => setEditEducation(e.target.value)}
                  placeholder="e.g. University of Dhaka"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select value={editBloodGroup || "none"} onValueChange={(v) => setEditBloodGroup(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>System Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Standard User</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Badge Type</Label>
                <Select value={editBadgeType} onValueChange={setEditBadgeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue Verified</SelectItem>
                    <SelectItem value="gold">Gold VIP</SelectItem>
                    <SelectItem value="vip">VIP Creator</SelectItem>
                    <SelectItem value="government">Government / Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Toggle Switches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs">Verified Account</p>
                  <p className="text-[11px] text-muted-foreground">Displays verification badge on platform</p>
                </div>
                <Switch checked={editIsVerified} onCheckedChange={setEditIsVerified} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs">Monetization Allowed</p>
                  <p className="text-[11px] text-muted-foreground">Allows receiving payments and tips</p>
                </div>
                <Switch checked={editCanMonetize} onCheckedChange={setEditCanMonetize} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs text-amber-500">Account Suspended</p>
                  <p className="text-[11px] text-muted-foreground">Blocks feed posting and interaction</p>
                </div>
                <Switch checked={editIsSuspended} onCheckedChange={setEditIsSuspended} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs text-purple-500">Shadowbanned</p>
                  <p className="text-[11px] text-muted-foreground">Silently demotes posts from discovery feeds</p>
                </div>
                <Switch checked={editIsShadowbanned} onCheckedChange={setEditIsShadowbanned} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs text-rose-500">Banned</p>
                  <p className="text-[11px] text-muted-foreground">Terminates active session and access</p>
                </div>
                <Switch checked={editIsBanned} onCheckedChange={setEditIsBanned} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Algorithmic Reach Multiplier Tuner */}
      <Dialog open={Boolean(tuningUser)} onOpenChange={(open) => !open && setTuningUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="size-5 text-primary" /> Algorithmic Distribution Tuner
            </DialogTitle>
            <DialogDescription>
              Adjust recommendation feed multiplier for @{tuningUser?.username}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="text-center p-4 bg-muted/40 rounded-lg border">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Active Multiplier</p>
              <p className="text-3xl font-black text-primary mt-1">{tuningMultiplier.toFixed(1)}x</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tuningMultiplier > 1
                  ? "Feed distribution boosted in Explore & For You"
                  : tuningMultiplier < 1
                  ? "Post reach algorithmically throttled"
                  : "Standard organic reach"}
              </p>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs">Quick Presets</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: "0.1x", value: 0.1, desc: "Throttled" },
                  { label: "0.5x", value: 0.5, desc: "Reduced" },
                  { label: "1.0x", value: 1.0, desc: "Normal" },
                  { label: "2.0x", value: 2.0, desc: "Boost" },
                  { label: "5.0x", value: 5.0, desc: "VIP" },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    size="sm"
                    variant={tuningMultiplier === preset.value ? "default" : "outline"}
                    className="text-xs font-mono h-8"
                    onClick={() => setTuningMultiplier(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTuningUser(null)}>Cancel</Button>
            <Button onClick={handleSaveReach}>Apply Multiplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Password Recovery Link Result */}
      <Dialog open={Boolean(resetLinkData)} onOpenChange={(open) => !open && setResetLinkData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-amber-500" /> Password Recovery Link Generated
            </DialogTitle>
            <DialogDescription>
              Direct password recovery token generated for @{resetLinkData?.username} ({resetLinkData?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-muted rounded-md border font-mono text-xs break-all max-h-36 overflow-y-auto">
              {resetLinkData?.link}
            </div>
            <p className="text-xs text-muted-foreground">
              This single-use recovery link allows the user to securely set a new password. Provide this link directly to the user or send via official email channel.
            </p>
          </div>

          <DialogFooter>
            <Button
              className="gap-1.5 w-full"
              onClick={() => {
                if (resetLinkData) {
                  navigator.clipboard.writeText(resetLinkData.link);
                  toast.success("Recovery link copied to clipboard!");
                  setResetLinkData(null);
                }
              }}
            >
              <Copy className="size-4" /> Copy & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Confirm Permanent Delete */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Permanent Account Deletion
            </DialogTitle>
            <DialogDescription>
              Are you absolutely certain you want to delete @{confirmDelete?.username}?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20 space-y-1">
            <p className="font-semibold">This action cannot be undone.</p>
            <p>
              This will permanently delete the profile, all posted threads/comments, and revoke auth credentials for user UUID:{" "}
              <span className="font-mono">{confirmDelete?.id}</span>.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isSaving}>
              {isSaving ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 6: Confirm Bulk Action */}
      <Dialog open={Boolean(confirmBulkAction)} onOpenChange={(open) => !open && setConfirmBulkAction(null)}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" /> Confirm Bulk Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to execute {confirmBulkAction} on {selectedUsers.size} selected accounts?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBulkAction(null)} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmBulkAction && handleExecuteBulkAction(confirmBulkAction)}
              disabled={bulkLoading}
            >
              {bulkLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
