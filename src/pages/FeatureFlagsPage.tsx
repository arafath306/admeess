import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Save, Settings2 } from "lucide-react"

type AccessLevel = 'disabled' | 'global' | 'verified' | 'specific';

interface FlagConfig {
  access: AccessLevel;
  users: string[]; // array of user ids
}

type FlagsState = { [key: string]: FlagConfig };

const DEFAULT_FLAGS: FlagsState = {
  enable_tiered_badges: { access: 'disabled', users: [] },
  enable_algorithmic_priority: { access: 'disabled', users: [] },
  enable_voice_posts: { access: 'disabled', users: [] },
  enable_anonymous_posting: { access: 'disabled', users: [] },
  enable_monetization: { access: 'disabled', users: [] }
};

export function FeatureFlagsPage() {
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<FlagsState>(DEFAULT_FLAGS)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Specific user search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  
  // The flag currently being configured for specific users
  const [activeFlagKey, setActiveFlagKey] = useState<string | null>(null)

  useEffect(() => {
    fetchFlags()
  }, [])

  async function fetchFlags() {
    try {
      const { data, error } = await supabase.from('system_settings').select('key, value')
      if (error) throw error
      
      const newFlags = { ...DEFAULT_FLAGS }
      data?.forEach((row: any) => {
        if (row.key in newFlags) {
          try {
            // Check if it's the old format ('true' / 'false')
            if (row.value === 'true' || row.value === 'false') {
              newFlags[row.key] = { access: row.value === 'true' ? 'global' : 'disabled', users: [] }
            } else {
              // Parse the new JSON format
              const parsed = JSON.parse(row.value)
              newFlags[row.key] = {
                access: parsed.access || 'disabled',
                users: parsed.users || []
              }
            }
          } catch (e) {
            console.error("Failed to parse flag value:", row.value)
          }
        }
      })
      setFlags(newFlags)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load feature flags")
    } finally {
      setLoading(false)
    }
  }

  async function updateFlagAccess(key: string, access: AccessLevel) {
    setFlags(prev => ({
      ...prev,
      [key]: { ...prev[key], access }
    }))
    
    // Automatically save if not changing to "specific" (which requires user selection)
    if (access !== 'specific') {
      await saveFlagToDB(key, { access, users: flags[key].users })
    }
  }

  async function saveFlagToDB(key: string, config: FlagConfig) {
    setSavingSettings(true)
    try {
      const { error } = await supabase.from('system_settings').upsert(
        { key: key, value: JSON.stringify(config) },
        { onConflict: 'key' }
      )
      
      if (error) throw error
      toast.success(`${key.replace(/_/g, ' ')} settings updated`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to update feature flag")
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSearchUsers() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(10)
      
      if (error) throw error
      setSearchResults(data || [])
    } catch (e) {
      console.error(e)
      toast.error("Error searching users")
    } finally {
      setSearching(false)
    }
  }

  function toggleSpecificUser(key: string, userId: string) {
    setFlags(prev => {
      const currentUsers = prev[key].users || []
      const newUsers = currentUsers.includes(userId)
        ? currentUsers.filter(id => id !== userId)
        : [...currentUsers, userId]
        
      return {
        ...prev,
        [key]: { ...prev[key], users: newUsers }
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feature Flags</h1>
        <p className="text-sm text-muted-foreground mt-1">Globally toggle app features, limit to verified users (Early Access), or target specific users.</p>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(flags).map(([key, config]) => {
            const title = key.split('_').slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            
            return (
              <Card key={key} className={activeFlagKey === key ? "ring-2 ring-primary" : ""}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {title}
                    <Settings2 className="size-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>
                    Configure who can access the {title} feature in the Dak app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium">Access Level</Label>
                    <Select 
                      value={config.access} 
                      onValueChange={(val: AccessLevel) => {
                        updateFlagAccess(key, val)
                        if (val === 'specific') setActiveFlagKey(key)
                        else if (activeFlagKey === key) setActiveFlagKey(null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled (Off)</SelectItem>
                        <SelectItem value="global">Global (Everyone)</SelectItem>
                        <SelectItem value="verified">Verified Users Only (Early Access)</SelectItem>
                        <SelectItem value="specific">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {config.access === 'specific' && (
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Search users by name or @" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSearchUsers()}
                        />
                        <Button variant="secondary" onClick={handleSearchUsers} disabled={searching}>
                          <Search className="size-4" />
                        </Button>
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="space-y-2 border rounded-md p-3 max-h-[200px] overflow-y-auto">
                          {searchResults.map(user => (
                            <div key={user.id} className="flex items-center space-x-3 py-1">
                              <Checkbox 
                                id={`user-${key}-${user.id}`} 
                                checked={config.users.includes(user.id)}
                                onCheckedChange={() => toggleSpecificUser(key, user.id)}
                              />
                              <label htmlFor={`user-${key}-${user.id}`} className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                                <Avatar className="size-6">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.full_name}</span>
                                <span className="text-muted-foreground text-xs">@{user.username}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {config.users.length} users selected
                        </span>
                        <Button 
                          size="sm" 
                          onClick={() => saveFlagToDB(key, config)} 
                          disabled={savingSettings}
                        >
                          <Save className="size-4 mr-2" /> Save Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

