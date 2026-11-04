import { useState } from "react"
import type { ComponentType } from "react"
import { Archive, Eye, FileText, Image, MoreHorizontal, RotateCcw, Trash2, Video } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { posts } from "../data"

const typeIcon: Record<string, ComponentType<{ className?: string }>> = {
  text: FileText,
  image: Image,
  video: Video,
}

const statusConfig: Record<string, { label: string; className: string }> = {
  published: { label: "Published", className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-transparent" },
  draft: { label: "Draft", className: "text-slate-600 border-slate-300 dark:border-slate-700" },
  archived: { label: "Archived", className: "text-amber-600 border-amber-300 dark:border-amber-800" },
  deleted: { label: "Deleted", className: "text-red-600 bg-red-50 dark:bg-red-950 border-transparent" },
}

export function PostsTab() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = posts.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
    const matchStatus = statusFilter === "all" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Post</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-6 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((post) => {
                const TypeIcon = typeIcon[post.type] ?? FileText
                const sc = statusConfig[post.status]
                return (
                  <TableRow key={post.id}>
                    <TableCell className="pl-6">
                      <div>
                        <p className="text-sm font-medium max-w-[200px] truncate">{post.title}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{post.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs capitalize">{post.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1", sc.className)}>
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{post.views.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{post.likes.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{post.comments.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{post.created}</TableCell>
                    <TableCell className="pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info("Opening post...")}><Eye className="size-3.5 mr-2" />View Post</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {post.status !== "archived" && (
                            <DropdownMenuItem onClick={() => toast.info("Post hidden")}><Archive className="size-3.5 mr-2" />Hide Post</DropdownMenuItem>
                          )}
                          {post.status === "deleted" && (
                            <DropdownMenuItem onClick={() => toast.success("Post restored")}><RotateCcw className="size-3.5 mr-2" />Restore</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => toast.error("Post removed")}><Trash2 className="size-3.5 mr-2" />Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <p className="text-xs text-muted-foreground">Showing {filtered.length} of {posts.length} posts</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
