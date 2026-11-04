import { Megaphone } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"
export function AdsPage() {
  return (<div className="flex flex-col gap-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Ads</h1><p className="text-sm text-muted-foreground mt-1">Advertising management</p></div><EmptyState icon={Megaphone} title="Ads Management Coming Soon" description="Create and manage ad campaigns, review ad performance, and control ad placements." /></div>)
}
