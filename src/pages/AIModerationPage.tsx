import { Bot } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
export function AIModerationPage() {
  return (<div className="flex flex-col gap-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">AI Moderation</h1><p className="text-sm text-muted-foreground mt-1">AI-powered content moderation</p></div><EmptyState icon={Bot} title="AI Moderation Coming Soon" description="Automated content screening, NSFW detection, spam filtering, and AI-assisted moderation decisions." /></div>)
}
