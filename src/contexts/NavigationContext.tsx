import { createContext, useContext, useState } from "react"

export type PageId =
  | "dashboard"
  | "users"
  | "communities"
  | "posts"
  | "comments"
  | "messages"
  | "reports"
  | "moderation-queue"
  | "verification"
  | "chat-moderation"
  | "ai-moderation"
  | "monetization"
  | "ads"
  | "payments"
  | "notifications"
  | "analytics"
  | "storage"
  | "feature-flags"
  | "api"
  | "audit-logs"
  | "support"
  | "system-status"
  | "settings"
  | "user-access"
  | "user-monitor"
  | "beta-center"
  | "moderator-management"
  | "community-monitor"
  | "anonymous-control"

type NavigationContextType = {
  currentPage: PageId
  targetUserId: string | null
  navigate: (page: PageId, userId?: string) => void
}

const NavigationContext = createContext<NavigationContextType>({
  currentPage: "dashboard",
  targetUserId: null,
  navigate: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard")
  const [targetUserId, setTargetUserId] = useState<string | null>(null)

  const navigate = (page: PageId, userId?: string) => {
    setCurrentPage(page)
    if (userId) setTargetUserId(userId)
    else setTargetUserId(null)
  }

  return (
    <NavigationContext.Provider value={{ currentPage, targetUserId, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
