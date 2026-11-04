import { Code2 } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"

export function APIPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">API & Developer</h1><p className="text-sm text-muted-foreground mt-1">API management and developer tools</p></div>
      <EmptyState icon={Code2} title="API Dashboard Coming Soon" description="Manage API keys, monitor rate limits, view API usage logs, and access developer documentation." />
    </div>
  )
}
