// BoardUI admin panel shell layout
import { AppSidebar } from "@/components/layout/AppSidebar"
import { TopNav } from "@/components/layout/TopNav"
import { useNavigation } from "@/contexts/NavigationContext"
import { DashboardPage } from "@/pages/DashboardPage"
import { UsersPage } from "@/pages/UsersPage"
import { CommunitiesPage } from "@/pages/CommunitiesPage"
import { PostsPage } from "@/pages/PostsPage"
import { CommentsPage } from "@/pages/CommentsPage"
import { MessagesPage } from "@/pages/MessagesPage"
import { ReportsPage } from "@/pages/ReportsPage"
import { FeedModerationPage } from "@/pages/FeedModerationPage"
import { VerificationPage } from "@/pages/VerificationPage"
import { ChatModerationPage } from "@/pages/ChatModerationPage"
import { AIModerationPage } from "@/pages/AIModerationPage"
import { MonetizationPage } from "@/pages/MonetizationPage"
import { AdsPage } from "@/pages/AdsPage"
import { PaymentsPage } from "@/pages/PaymentsPage"
import { NotificationsPage } from "@/pages/NotificationsPage"
import { AnalyticsPage } from "@/pages/AnalyticsPage"
import { StoragePage } from "@/pages/StoragePage"
import { FeatureFlagsPage } from "@/pages/FeatureFlagsPage"
import { APIPage } from "@/pages/APIPage"
import { AuditLogsPage } from "@/pages/AuditLogsPage"
import { SupportPage } from "@/pages/SupportPage"
import { SystemStatusPage } from "@/pages/SystemStatusPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { DashboardAccessPage } from "@/pages/DashboardAccessPage"
import { UserMonitorPage } from "@/pages/UserMonitorPage"
import { BetaCenterPage } from "@/pages/BetaCenterPage"
import { ModeratorManagementPage } from "@/pages/ModeratorManagementPage"
import { CommunityMonitorPage } from "@/pages/CommunityMonitorPage"
import { AnonymousControlPage } from "@/pages/AnonymousControlPage"
import { Toaster } from "@/components/ui/sonner"
import { ShieldAlert } from "lucide-react"

function PageRouter() {
  const { currentPage } = useNavigation()

  // Retrieve permissions from session storage
  const permissionsStr = sessionStorage.getItem("dak_admin_permissions")
  const permissions: string[] = permissionsStr ? JSON.parse(permissionsStr) : []
  const isSuperAdmin = permissions.includes("all")

  // Check permission access
  const hasAccess = (page: string): boolean => {
    if (isSuperAdmin) return true
    if (page === "dashboard") return true // Basic dashboard is always viewable
    if (page === "user-monitor") return permissions.includes("users") // Detail sub-page follows parent
    if (page === "community-monitor") return permissions.includes("communities") // Detail sub-page follows parent
    if (page === "moderator-management") return false // Only Super Admin can manage moderators
    return permissions.includes(page)
  }

  if (!hasAccess(currentPage)) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-6">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="text-lg font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You do not have the required permissions to access this page. Please contact the administrator.
          </p>
        </div>
      </div>
    )
  }

  switch (currentPage) {
    case "dashboard": return <DashboardPage />
    case "users": return <UsersPage />
    case "communities": return <CommunitiesPage />
    case "posts": return <PostsPage />
    case "comments": return <CommentsPage />
    case "messages": return <MessagesPage />
    case "reports": return <ReportsPage />
    case "moderation-queue": return <FeedModerationPage />
    case "verification": return <VerificationPage />
    case "chat-moderation": return <ChatModerationPage />
    case "ai-moderation": return <AIModerationPage />
    case "monetization": return <MonetizationPage />
    case "ads": return <AdsPage />
    case "payments": return <PaymentsPage />
    case "notifications": return <NotificationsPage />
    case "analytics": return <AnalyticsPage />
    case "storage": return <StoragePage />
    case "feature-flags": return <FeatureFlagsPage />
    case "api": return <APIPage />
    case "audit-logs": return <AuditLogsPage />
    case "support": return <SupportPage />
    case "system-status": return <SystemStatusPage />
    case "settings": return <SettingsPage />
    case "user-access": return <DashboardAccessPage />
    case "user-monitor": return <UserMonitorPage />
    case "community-monitor": return <CommunityMonitorPage />
    case "beta-center": return <BetaCenterPage />
    case "moderator-management": return <ModeratorManagementPage />
    case "anonymous-control": return <AnonymousControlPage />
    default: return <DashboardPage />
  }
}

export function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-full text-text-primary antialiased">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-background-full">
          <PageRouter />
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
