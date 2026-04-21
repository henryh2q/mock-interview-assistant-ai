'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { Session } from '@/types/database'

type SetSession = React.Dispatch<React.SetStateAction<Session | null>>

export function useSessionPatch(sessionId: string, setSession: SetSession) {
  const patchSession = useCallback(async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) throw new Error('Save failed')
  }, [sessionId])

  const saveField = useCallback(async (
    fields: Partial<Session>,
    successMsg: string,
    errorMsg: string,
  ) => {
    try {
      await patchSession(fields as Record<string, unknown>)
      setSession((prev) => prev ? { ...prev, ...fields } : prev)
      toast.success(successMsg)
    } catch {
      toast.error(errorMsg)
    }
  }, [patchSession, setSession])

  return { patchSession, saveField }
}
