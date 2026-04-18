'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundPlanCard } from '@/components/session/round-plan-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoundPlan } from '@/types/ai'
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReviewPlanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [plan, setPlan] = useState<RoundPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate plan')
        return
      }
      setPlan(data.plan.rounds)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  const removeRound = (index: number) => {
    if (plan.length <= 1) {
      toast.warning('You must have at least one round')
      return
    }
    setPlan((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmPlan = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds: plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to confirm plan')
        return
      }
      const firstRound = data.rounds[0]
      router.push(`/sessions/${sessionId}/round/${firstRound.id}`)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/dashboard">← Back to Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Your Interview Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI has generated a personalized plan based on your CV and job description. Review and confirm to start.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating your personalized interview plan...
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={fetchPlan}>
              <RefreshCw className="w-4 h-4 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-3">
            {plan.map((round, idx) => (
              <RoundPlanCard
                key={idx}
                round={round}
                index={idx}
                onRemove={removeRound}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchPlan} disabled={confirming} className="gap-1">
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
            <Button onClick={confirmPlan} disabled={confirming || plan.length === 0} className="flex-1 gap-1">
              {confirming ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up rounds...</>
              ) : (
                <>Confirm & Start Round 1 <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
