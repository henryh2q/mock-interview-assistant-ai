'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Loader2, Phone } from 'lucide-react'

interface UserProfile {
  id: string
  phone: string
  name: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => { setUser(d.user); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your account information.</p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="phone"
              type="tel"
              readOnly
              value={user?.phone ?? ''}
              className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-10 pr-3 py-2 text-base text-muted-foreground cursor-not-allowed select-none outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Phone number cannot be changed. Contact support if you need help.
          </p>
        </div>
      </div>
    </div>
  )
}
