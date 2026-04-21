'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isValidPhone, normalizePhone } from '@/lib/utils'
import { Loader2, Phone, Lock } from 'lucide-react'

export function LoginForm() {
  const { login, loading, error } = useAuth()
  const phoneRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [canSubmit, setCanSubmit] = useState(false)

  useEffect(() => {
    const el = phoneRef.current
    if (!el) return
    const evaluate = () => setCanSubmit(isValidPhone(normalizePhone(el.value)) && password.length > 0)
    el.addEventListener('input', evaluate)
    el.addEventListener('change', evaluate)
    return () => { el.removeEventListener('input', evaluate); el.removeEventListener('change', evaluate) }
  }, [password])

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    void login(phoneRef.current?.value ?? '', password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={phoneRef}
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 0901234567"
            className="h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            disabled={loading}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
      </Button>
    </form>
  )
}
