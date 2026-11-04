import { MessageCircle } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
export function ChatModerationPage() {
  return (<div className="flex flex-col gap-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Chat Moderation</h1><p className="text-sm text-muted-foreground mt-1">Monitor and moderate private messages</p></div><EmptyState icon={MessageCircle} title="No Flagged Chats" description="No chat messages have been flagged for review. Reported or suspicious conversations will appear here." /></div>)
}
