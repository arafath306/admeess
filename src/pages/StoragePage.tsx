import { HardDrive } from "lucide-react"
import { EmptyState } from "@/components/EmptyState"

export function StoragePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Storage</h1><p className="text-sm text-muted-foreground mt-1">File storage management</p></div>
      <EmptyState icon={HardDrive} title="Storage Management Coming Soon" description="Monitor Supabase storage buckets, manage uploaded media files, and track storage usage." />
    </div>
  )
}
