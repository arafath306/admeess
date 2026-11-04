import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted mb-4">
          <Icon className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      </CardContent>
    </Card>
  )
}
