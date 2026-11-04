import { Download, Eye, File, FileVideo, Image, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { mediaItems } from "../data"

const typeConfig = {
  image: { icon: Image, color: "text-blue-500", bg: "bg-blue-500/10" },
  video: { icon: FileVideo, color: "text-purple-500", bg: "bg-purple-500/10" },
  document: { icon: File, color: "text-amber-500", bg: "bg-amber-500/10" },
  audio: { icon: File, color: "text-emerald-500", bg: "bg-emerald-500/10" },
}

export function MediaTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {mediaItems.map((item) => {
          const cfg = typeConfig[item.type as keyof typeof typeConfig] ?? typeConfig.document
          const Icon = cfg.icon
          return (
            <Card key={item.id} className="overflow-hidden group">
              <div className={cn("flex h-28 items-center justify-center border-b", cfg.bg)}>
                <Icon className={cn("size-10 opacity-40", cfg.color)} />
              </div>
              <CardContent className="px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info("Opening preview...")}><Eye className="size-3.5 mr-2" />Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Downloading...")}><Download className="size-3.5 mr-2" />Download</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => toast.error("Media removed")}>Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 uppercase">{item.format}</Badge>
                  <span className="text-[10px] text-muted-foreground">{item.size}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{item.uploaded}</p>
                {item.dimensions && <p className="text-[10px] text-muted-foreground">{item.dimensions}</p>}
                {(item as { duration?: string }).duration && <p className="text-[10px] text-muted-foreground">{(item as { duration?: string }).duration}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
