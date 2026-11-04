import { Settings } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"

export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground mt-1">Platform configuration</p></div>
      <EmptyState icon={Settings} title="Settings Coming Soon" description="Configure platform settings including maintenance mode, signup controls, content policies, and branding." />
    </div>
  )
}
