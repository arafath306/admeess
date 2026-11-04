import { useState, useEffect } from "react"
import { Globe, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { useNavigation } from "@/contexts/NavigationContext"

export function DashboardAccessPage() {
  const { navigate } = useNavigation()
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchUsersAndListen() {
      // 1. Fetch all users for reference
      const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url')

      // 2. Subscribe to Presence
      const channel = supabase.channel('online-users')

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineProfiles: any[] = []

        // Parse state
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[]
          if (presences && presences.length > 0) {
            // Get the latest presence payload for this user
            const latest = presences[presences.length - 1]
            const userId = latest.user_id
            
            // Find matched profile
            const profile = data?.find(u => u.id === userId)
            if (profile) {
              const onlineAt = new Date(latest.online_at).getTime()
              const timeSpentSeconds = Math.floor((Date.now() - onlineAt) / 1000)
              
              onlineProfiles.push({
                ...profile,
                currentPage: latest.current_page || '/home',
                timeSpent: timeSpentSeconds > 0 ? timeSpentSeconds : 0,
                isActive: true
              })
            }
          }
        })
        
        setActiveUsers(onlineProfiles)
      }).subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    fetchUsersAndListen()
  }, [])

  // Timer to update "timeSpent" locally so the seconds tick up without needing network sync
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => prev.map(user => ({
        ...user,
        timeSpent: user.timeSpent + 1
      })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const filtered = activeUsers
    .filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.full_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.timeSpent - a.timeSpent)

  return (
    <div className="flex flex-col gap-6 p-6 h-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Live User Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time monitoring of user activity across the app</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Currently Online</CardDescription>
            <CardTitle className="text-3xl">{activeUsers.length}</CardTitle>
          </CardHeader>
          <CardContent><div className="flex items-center text-sm text-green-500"><span className="relative flex h-2 w-2 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> Live</div></CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-9 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Badge variant="outline" className="gap-2">
            <Globe className="size-3 text-green-500" /> Connected to Supabase Realtime
          </Badge>
        </div>
        
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No users are currently online.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('user-monitor', user.id)}>
                    <div className="relative">
                      <Avatar className="size-10 border">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 size-3 border-2 border-background rounded-full bg-green-500"></span>
                    </div>
                    <div>
                      <p className="font-medium text-sm hover:underline">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.full_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12">
                    <div className="w-32 text-right">
                      <Badge variant="secondary" className="font-mono text-xs bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                        {user.currentPage}
                      </Badge>
                    </div>
                    
                    <div className="w-24 text-right">
                      <span className="text-xs text-muted-foreground">{user.timeSpent}s ago</span>
                    </div>
                    
                    <div className="w-24 text-right">
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  )
}
