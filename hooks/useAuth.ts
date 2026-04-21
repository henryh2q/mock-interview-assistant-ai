'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isValidPhone, normalizePhone } from '@/lib/utils'

export function useAuth() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (rawPhone: string, password: string) => {
    const normalized = normalizePhone(rawPhone)
    if (!isValidPhone(normalized)) {
      setError('Phone number must be 10–15 digits')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed. Please try again.'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/login', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return { login, logout, loading, error }
}
