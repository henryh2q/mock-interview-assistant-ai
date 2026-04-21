'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isValidPhone, normalizePhone } from '@/lib/utils'

type Step = 'phone' | 'otp'

export function useAuth() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')

  const sendOtp = async (rawPhone: string) => {
    const normalized = normalizePhone(rawPhone)
    if (!isValidPhone(normalized)) {
      setError('Phone number must be 10–15 digits')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code. Please try again.'); return }
      setPhone(normalized)
      setStep('otp')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Verification failed. Please try again.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const resetToPhone = () => { setStep('phone'); setError(null) }

  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return { sendOtp, verifyOtp, resetToPhone, logout, loading, error, step, phone }
}
