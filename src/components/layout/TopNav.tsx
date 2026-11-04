"use client";

import { useState } from "react";
import {
  RiSearchLine,
  RiNotification3Line,
  RiSunLine,
  RiMoonLine,
  RiCloseLine,
  RiArrowRightLine,
} from "@remixicon/react";

import { useNavigation, type PageId } from "@/contexts/NavigationContext";
import { Badge } from "@/components/base/badges/badge";
import { Chip } from "@/components/base/badges/chip";
import { Kbd } from "@/components/base/kbd/kbd";
import { useTheme } from "@/components/theme-provider";

const pageTitles: Record<PageId, { title: string; category: string }> = {
  "dashboard": { title: "Dashboard Overview", category: "Overview" },
  "analytics": { title: "Platform Analytics", category: "Overview" },
  "users": { title: "User Directory", category: "Content & Community" },
  "user-access": { title: "User Access Control", category: "Content & Community" },
  "communities": { title: "Communities Directory", category: "Content & Community" },
  "posts": { title: "Threads & Posts", category: "Content & Community" },
  "comments": { title: "Comments Stream", category: "Content & Community" },
  "messages": { title: "Direct Messages", category: "Content & Community" },
  "user-monitor": { title: "Live User Monitor", category: "Moderation Hub" },
  "anonymous-control": { title: "Anonymous Posts Control", category: "Moderation Hub" },
  "reports": { title: "Reports & Flags Queue", category: "Moderation Hub" },
  "moderation-queue": { title: "Feed Moderation Queue", category: "Moderation Hub" },
  "verification": { title: "Verification Requests", category: "Moderation Hub" },
  "beta-center": { title: "Beta Features Center", category: "Moderation Hub" },
  "chat-moderation": { title: "Chat Voice & Text Moderation", category: "Moderation Hub" },
  "ai-moderation": { title: "AI Automated Scanner", category: "Moderation Hub" },
  "monetization": { title: "Creator Earnings & Payouts", category: "Monetization" },
  "ads": { title: "Sponsored Content & Ads", category: "Monetization" },
  "payments": { title: "Payment History", category: "Monetization" },
  "notifications": { title: "Push Notification Broadcasts", category: "System & Ops" },
  "storage": { title: "Media CDN & Bucket Storage", category: "System & Ops" },
  "feature-flags": { title: "Runtime Feature Flags", category: "System & Ops" },
  "api": { title: "API Keys & Webhooks", category: "System & Ops" },
  "audit-logs": { title: "Security & Action Audit Logs", category: "System & Ops" },
  "support": { title: "Support Ticket Desk", category: "System & Ops" },
  "system-status": { title: "Infrastructure Status", category: "System & Ops" },
  "moderator-management": { title: "Moderator Key Access", category: "Configuration" },
  "settings": { title: "System Preferences", category: "Configuration" },
  "community-monitor": { title: "Community Monitor Detail", category: "Moderation Hub" },
};

const quickSearchItems: { id: PageId; label: string; desc: string }[] = [
  { id: "dashboard", label: "Dashboard", desc: "Main metrics & overview" },
  { id: "reports", label: "Reports & Flags", desc: "Review user reports & urgent flags" },
  { id: "users", label: "Users Directory", desc: "Search and manage user profiles" },
  { id: "moderation-queue", label: "Moderation Queue", desc: "Approve or flag pending threads" },
  { id: "verification", label: "Verification Requests", desc: "Review badge applications" },
  { id: "analytics", label: "Analytics", desc: "Growth, engagement, and retention" },
  { id: "system-status", label: "System Health", desc: "Database, WebSocket, CDN uptime" },
  { id: "audit-logs", label: "Audit Logs", desc: "Security and admin event logs" },
  { id: "settings", label: "Settings", desc: "Global admin panel settings" },
];

export function TopNav() {
  const { currentPage, navigate } = useNavigation();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const meta = pageTitles[currentPage] ?? { title: "Admin Panel", category: "Operations" };

  const filteredSearch = quickSearchItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border-button-default bg-background-primary-default/80 px-6 backdrop-blur-xl">
        {/* Left: Breadcrumb & Title */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium tracking-wide uppercase text-text-tertiary">
              {meta.category}
            </span>
            <h1 className="text-title-3-semibold text-text-primary leading-tight">
              {meta.title}
            </h1>
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 ms-3">
            <Chip variant="caption" color="lime" className="!px-2 !py-0.5 font-medium flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-status-lime-text animate-pulse" />
              Live Sync
            </Chip>
          </span>
        </div>

        {/* Right: Search, Notifications, Theme Toggle, External links */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-1.5 text-body-medium text-text-secondary hover:border-border-button-hover hover:text-text-primary transition-all duration-150 shadow-soft"
          >
            <RiSearchLine className="size-4 text-foreground-icon-secondary" />
            <span className="hidden sm:inline text-xs">Quick jump…</span>
            <Kbd className="ms-1.5 hidden sm:inline-flex">⌘K</Kbd>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex size-9 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
              title="Notifications"
            >
              <RiNotification3Line className="size-4.5" />
              <span className="absolute -top-1 -end-1">
                <Badge color="primary" className="!size-4 !p-0 !text-[9px]">3</Badge>
              </span>
            </button>

            {/* Notification Popover */}
            {notifOpen && (
              <div className="absolute end-0 top-11 z-50 w-80 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-corporate-lg animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-border-button-default pb-2.5">
                  <span className="text-body-medium font-semibold text-text-primary">Admin Alerts</span>
                  <Badge color="primary">3 new</Badge>
                </div>
                <div className="mt-2.5 space-y-2 text-xs">
                  <div
                    onClick={() => { navigate("reports"); setNotifOpen(false); }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 hover:bg-background-secondary-default transition-colors"
                  >
                    <span className="mt-0.5 size-2 rounded-full bg-status-rose-text shrink-0" />
                    <div>
                      <p className="font-medium text-text-primary">247 pending reports</p>
                      <p className="text-text-tertiary">Requires moderator review</p>
                    </div>
                  </div>
                  <div
                    onClick={() => { navigate("verification"); setNotifOpen(false); }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 hover:bg-background-secondary-default transition-colors"
                  >
                    <span className="mt-0.5 size-2 rounded-full bg-status-lime-text shrink-0" />
                    <div>
                      <p className="font-medium text-text-primary">34 new verification requests</p>
                      <p className="text-text-tertiary">Creators awaiting review</p>
                    </div>
                  </div>
                  <div
                    onClick={() => { navigate("system-status"); setNotifOpen(false); }}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl p-2 hover:bg-background-secondary-default transition-colors"
                  >
                    <span className="mt-0.5 size-2 rounded-full bg-status-cyan-text shrink-0" />
                    <div>
                      <p className="font-medium text-text-primary">System health check</p>
                      <p className="text-text-tertiary">All services operational</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-9 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-text-primary transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <RiSunLine className="size-4.5" /> : <RiMoonLine className="size-4.5" />}
          </button>
        </div>
      </header>

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-corporate-lg animate-scale-in">
            <div className="flex items-center gap-2.5 border-b border-border-button-default pb-3">
              <RiSearchLine className="size-5 text-foreground-icon-secondary" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search admin pages, queues, reports…"
                className="flex-1 bg-transparent text-body-medium text-text-primary placeholder:text-text-placeholder focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg text-foreground-icon-secondary hover:bg-background-secondary-default hover:text-text-primary"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {filteredSearch.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.id);
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start hover:bg-background-secondary-default transition-colors group"
                >
                  <div>
                    <p className="text-body-medium font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-tertiary">{item.desc}</p>
                  </div>
                  <RiArrowRightLine className="size-4 text-foreground-icon-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {filteredSearch.length === 0 && (
                <p className="py-6 text-center text-xs text-text-tertiary">No matching pages found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
