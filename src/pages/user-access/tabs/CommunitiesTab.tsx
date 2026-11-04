import { Eye, MoreHorizontal, Users2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { communities } from "../data"

const roleConfig: Record<string, string> = {
  Member: "text-slate-600",
  Moderator: "text-blue-600",
  Admin: "text-purple-600",
}

export function CommunitiesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Community</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead className="pr-6 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Users2 className="size-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{c.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1", roleConfig[c.role])}>
                      {c.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{c.members.toLocaleString()}</TableCell>
                  <TableCell className="text-sm tabular-nums">{c.posts}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.joined}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-medium", c.warnings > 0 ? "text-red-500" : "text-emerald-500")}>
                      {c.warnings === 0 ? "None" : c.warnings}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info(`Opening ${c.name}...`)}><Eye className="size-3.5 mr-2" />View Community</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.warning("User removed from community")}>Remove from Community</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Opening community moderation log...")}>View Mod Log</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
