'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isValidPhone, normalizePhone } from '@/lib/utils'
import { Loader2, Phone } from 'lucide-react'

export function LoginForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [canSubmit, setCanSubmit] = useState(false)
  const { login, loading, error } = useAuth()

  const evaluate = () => {
    const raw = inputRef.current ? inputRef.current.value : ''
    setCanSubmit(isValidPhone(normalizePhone(raw)))
  }

  // Native DOM listeners — works on iOS Safari regardless of React/bundler event handling
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.addEventListener('input', evaluate)
    el.addEventListener('change', evaluate)
    return () => {
      el.removeEventListener('input', evaluate)
      el.removeEventListener('change', evaluate)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = inputRef.current ? inputRef.current.value : ''
    await login(value)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 0901234567"
            className="h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-3 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            disabled={loading}
            autoComplete="tel"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your phone number to sign in or create an account — no password needed.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  )
}
