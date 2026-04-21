'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isValidPhone, normalizePhone } from '@/lib/utils'
import { Loader2, Phone, ArrowLeft, MessageSquare } from 'lucide-react'

function PhoneStep({ onSubmit, loading, error }: {
  onSubmit: (phone: string) => void
  loading: boolean
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [canSubmit, setCanSubmit] = useState(false)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const evaluate = () => setCanSubmit(isValidPhone(normalizePhone(el.value)))
    el.addEventListener('input', evaluate)
    el.addEventListener('change', evaluate)
    return () => { el.removeEventListener('input', evaluate); el.removeEventListener('change', evaluate) }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(inputRef.current?.value ?? '')
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
          We&apos;ll send a one-time code to verify your number.
        </p>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending code...</> : 'Send Code'}
      </Button>
    </form>
  )
}

function OtpStep({ phone, onSubmit, onBack, loading, error }: {
  phone: string
  onSubmit: (code: string) => void
  onBack: () => void
  loading: boolean
  error: string | null
}) {
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length === 6) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Code sent to <span className="font-medium text-foreground">+{phone}</span>
          </p>
        </div>
        <Label htmlFor="otp">Verification Code</Label>
        <input
          ref={inputRef}
          id="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="h-12 w-full rounded-lg border border-input bg-transparent px-4 text-center text-2xl font-mono tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-normal focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
          disabled={loading}
          autoComplete="one-time-code"
        />
        <p className="text-xs text-muted-foreground">Enter the 6-digit code from the SMS.</p>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : 'Verify & Sign In'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        disabled={loading}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
      </button>
    </form>
  )
}

export function LoginForm() {
  const { sendOtp, verifyOtp, resetToPhone, loading, error, step, phone } = useAuth()

  if (step === 'otp') {
    return <OtpStep phone={phone} onSubmit={verifyOtp} onBack={resetToPhone} loading={loading} error={error} />
  }
  return <PhoneStep onSubmit={sendOtp} loading={loading} error={error} />
}
