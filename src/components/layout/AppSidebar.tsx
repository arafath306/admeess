"use client";

import { useState } from "react";
import {
  RiDashboardLine,
  RiBarChart2Line,
  RiUserLine,
  RiUserSearchLine,
  RiGroupLine,
  RiFileTextLine,
  RiChat1Line,
  RiMailLine,
  RiRadioLine,
  RiEyeOffLine,
  RiFlagLine,
  RiClipboardLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiChatVoiceLine,
  RiRobotLine,
  RiCoinLine,
  RiMegaphoneLine,
  RiBankCardLine,
  RiNotification3Line,
  RiHardDrive2Line,
  RiToggleLine,
  RiCodeSSlashLine,
  RiHistoryLine,
  RiCustomerService2Line,
  RiPulseLine,
  RiKey2Line,
  RiSettings4Line,
  RiShieldLine,
  RiSideBarFill,
} from "@remixicon/react";

import { useNavigation, type PageId } from "@/contexts/NavigationContext";
import { Badge } from "@/components/base/badges/badge";
import { Chip } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";

interface NavItemDef {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeTone?: "rose" | "lime" | "cyan" | "orange" | "neutral";
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

const navGroups: NavGroupDef[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: RiDashboardLine },
      { id: "analytics", label: "Analytics", icon: RiBarChart2Line },
    ],
  },
  {
    label: "Content & Community",
    items: [
      { id: "users", label: "Users", icon: RiUserLine, badge: "1.2M", badgeTone: "neutral" },
      { id: "user-access", label: "User Access", icon: RiUserSearchLine },
      { id: "communities", label: "Communities", icon: RiGroupLine, badge: "4.8K", badgeTone: "neutral" },
      { id: "posts", label: "Posts", icon: RiFileTextLine },
      { id: "comments", label: "Comments", icon: RiChat1Line },
      { id: "messages", label: "Messages", icon: RiMailLine },
    ],
  },
  {
    label: "Moderation Hub",
    items: [
      { id: "user-monitor", label: "Live User Monitor", icon: RiRadioLine, badge: "LIVE", badgeTone: "cyan" },
      { id: "anonymous-control", label: "Anonymous Posts", icon: RiEyeOffLine, badge: "PRO", badgeTone: "orange" },
      { id: "reports", label: "Reports & Flags", icon: RiFlagLine, badge: 247, badgeTone: "rose" },
      { id: "moderation-queue", label: "Moderation Queue", icon: RiClipboardLine, badge: 89, badgeTone: "orange" },
      { id: "verification", label: "Verifications", icon: RiShieldCheckLine, badge: 34, badgeTone: "lime" },
      { id: "beta-center", label: "What's Coming & Beta", icon: RiSparklingLine },
      { id: "chat-moderation", label: "Chat Moderation", icon: RiChatVoiceLine },
      { id: "ai-moderation", label: "AI Safety Scanner", icon: RiRobotLine },
    ],
  },
  {
    label: "Monetization",
    items: [
      { id: "monetization", label: "Creator Earnings", icon: RiCoinLine },
      { id: "ads", label: "Ads & Campaigns", icon: RiMegaphoneLine },
      { id: "payments", label: "Transactions", icon: RiBankCardLine },
    ],
  },
  {
    label: "System & Ops",
    items: [
      { id: "notifications", label: "Push Center", icon: RiNotification3Line },
      { id: "storage", label: "CDN & Storage", icon: RiHardDrive2Line },
      { id: "feature-flags", label: "Feature Flags", icon: RiToggleLine },
      { id: "api", label: "API & Webhooks", icon: RiCodeSSlashLine },
      { id: "audit-logs", label: "Security Audit", icon: RiHistoryLine },
      { id: "support", label: "Help Tickets", icon: RiCustomerService2Line, badge: 12, badgeTone: "orange" },
      { id: "system-status", label: "System Health", icon: RiPulseLine },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "moderator-management", label: "Moderator Keys", icon: RiKey2Line },
      { id: "settings", label: "Settings", icon: RiSettings4Line },
    ],
  },
];

export function AppSidebar() {
  const { currentPage, navigate } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  // Retrieve permissions from session storage
  const permissionsStr = typeof window !== "undefined" ? sessionStorage.getItem("dak_admin_permissions") : null;
  const permissions: string[] = permissionsStr ? JSON.parse(permissionsStr) : [];
  const isSuperAdmin = permissions.includes("all");

  const filteredNavGroups = navGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (item.id === "moderator-management") return isSuperAdmin;
        return isSuperAdmin || permissions.includes(item.id);
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={cx(
        "relative flex h-screen shrink-0 flex-col border-e border-border-button-default bg-background-secondary-default text-text-primary transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Workspace Header — BoardUI brand tile */}
      <div className="flex h-16 items-center justify-between border-b border-border-button-default px-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-accent-500 to-accent-600 text-white shadow-nav-selected">
            <RiShieldLine className="size-5" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-body-medium font-semibold text-text-primary">Pigeon Admin</span>
                <span className="rounded-sm bg-accent-100 dark:bg-accent-900/40 px-1 py-0.5 text-[10px] font-medium text-accent-700 dark:text-accent-300">
                  v2.4
                </span>
              </div>
              <span className="truncate text-[11px] text-text-tertiary">Community Operations</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex size-7 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <RiSideBarFill className={cx("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none space-y-4">
        {filteredNavGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-text-tertiary uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isSelected = currentPage === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cx(
                      "group relative flex w-full items-center justify-between rounded-xl px-2.5 py-2 transition-all duration-150 ease-out text-start",
                      isSelected
                        ? "bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected font-medium"
                        : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconComponent
                        className={cx(
                          "size-4.5 shrink-0 transition-colors",
                          isSelected ? "text-white" : "text-foreground-icon-secondary group-hover:text-text-primary"
                        )}
                      />
                      {!collapsed && (
                        <span className={cx("truncate text-body-medium", isSelected && "font-semibold")}>
                          {item.label}
                        </span>
                      )}
                    </div>

                    {!collapsed && item.badge && (
                      <span className="ms-2 shrink-0">
                        {typeof item.badge === "number" ? (
                          <Badge color={isSelected ? "primary" : "neutral"}>{item.badge}</Badge>
                        ) : (
                          <Chip
                            variant="caption"
                            color={item.badgeTone ?? "neutral"}
                            className="!px-1.5 !py-0 !text-[10px]"
                          >
                            {item.badge}
                          </Chip>
                        )}
                      </span>
                    )}

                    {collapsed && isSelected && (
                      <span className="absolute end-1 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile Tile */}
      <div className="border-t border-border-button-default p-2.5">
        <div
          className={cx(
            "flex items-center gap-2.5 rounded-2xl p-2 transition-colors hover:bg-background-secondary-hover",
            collapsed && "justify-center p-1.5"
          )}
        >
          <div className="relative shrink-0">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent-100 text-accent-700 font-semibold text-xs dark:bg-accent-950 dark:text-accent-300">
              {isSuperAdmin ? "SA" : "M"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background-secondary-default bg-status-lime-text" />
          </div>

          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-body-medium font-medium text-text-primary">
                {isSuperAdmin ? "Super Admin" : "Moderator"}
              </span>
              <span className="truncate text-[11px] text-text-tertiary">
                {isSuperAdmin ? "admin@pigeon.social" : "Custom Scope"}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
