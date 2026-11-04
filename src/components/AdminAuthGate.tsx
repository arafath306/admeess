import { useState, useEffect } from "react"
import { Shield, Lock, KeyRound, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

const ADMIN_SECRET_CODE = "AF123"
const SESSION_KEY = "dak_admin_authenticated"

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY)
    if (session === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const authenticate = async (code: string): Promise<boolean> => {
    if (code === ADMIN_SECRET_CODE) {
      sessionStorage.setItem(SESSION_KEY, "true")
      sessionStorage.setItem("dak_admin_permissions", JSON.stringify(["all"]))
      setIsAuthenticated(true)
      return true
    }

    try {
      const { data, error } = await supabase
        .from('moderator_keys')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error("Auth query error:", error)
        return false
      }

      if (data) {
        if (data.expires_at) {
          const expiry = new Date(data.expires_at).getTime()
          if (expiry < Date.now()) {
            console.warn("Auth key expired")
            return false
          }
        }
        sessionStorage.setItem(SESSION_KEY, "true")
        sessionStorage.setItem("dak_admin_permissions", JSON.stringify(data.permissions))
        setIsAuthenticated(true)
        return true
      }
    } catch (e) {
      console.error("Auth error:", e)
    }

    return false
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem("dak_admin_permissions")
    setIsAuthenticated(false)
  }

  return { isAuthenticated, authenticate, logout }
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authenticate } = useAdminAuth()
  const [code, setCode] = useState("")
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (locked) return

    const success = await authenticate(code)
    if (success) {
      setError(false)
    } else {
      setError(true)
      setCode("")
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= 5) {
        setLocked(true)
        setTimeout(() => {
          setLocked(false)
          setAttempts(0)
        }, 30000)
      }
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Shield className="size-8" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Pigeon Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Administrative Control Panel</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
              <Lock className="size-4" />
              Access Required
            </CardTitle>
            <CardDescription>
              Enter the admin secret code to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter secret code..."
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError(false)
                  }}
                  disabled={locked}
                  className={`pl-10 h-11 text-center text-lg tracking-[0.3em] font-mono ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  autoFocus
                />
              </div>

              {error && !locked && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="size-3.5" />
                  <span>Invalid code. {5 - attempts} attempts remaining.</span>
                </div>
              )}

              {locked && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="size-3.5" />
                  <span>Too many attempts. Please wait 30 seconds.</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={!code || locked}>
                <Shield className="size-4" />
                Authenticate
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-center">
              <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                <Lock className="size-2.5" />
                Encrypted Access Only
              </Badge>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Pigeon Admin Panel v2.9.2 • NGST
        </p>
      </div>
    </div>
  )
}
