'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundPlanCard } from '@/components/session/round-plan-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoundPlan } from '@/types/ai'
import { Round, Session } from '@/types/database'
import { ArrowRight, Loader2, RefreshCw, PlayCircle, ChevronDown, ChevronUp, FileText, Briefcase, Pencil, Check, X } from 'lucide-react'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { RoundType } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ReviewPlanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [plan, setPlan] = useState<RoundPlan[]>([])
  const [createdRounds, setCreatedRounds] = useState<Round[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [showJD, setShowJD] = useState(false)
  const [showCV, setShowCV] = useState(false)
  const [editingExtra, setEditingExtra] = useState(false)
  const [extraDraft, setExtraDraft] = useState('')
  const [savingExtra, setSavingExtra] = useState(false)

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
      // Rounds already confirmed — skip straight to round picker
      if (data.confirmed && data.rounds) {
        setCreatedRounds(data.rounds)
        return
      }
      setPlan(data.plan.rounds)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchPlan()
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => { if (d.session) setSession(d.session) })
      .catch(() => {})
  }, [fetchPlan, sessionId])

  const removeRound = (index: number) => {
    if (plan.length <= 1) {
      toast.warning('You must have at least one round')
      return
    }
    setPlan((prev) => prev.filter((_, i) => i !== index))
  }

  const startEditExtra = () => {
    setExtraDraft(session?.extra_info ?? '')
    setEditingExtra(true)
  }

  const cancelEditExtra = () => setEditingExtra(false)

  const saveExtraInfo = async () => {
    setSavingExtra(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_info: extraDraft.trim() || null }),
      })
      if (!res.ok) {
        toast.error('Failed to save extra info')
        return
      }
      setSession((prev) => prev ? { ...prev, extra_info: extraDraft.trim() || null } : prev)
      setEditingExtra(false)
      toast.success('Extra info saved')
    } catch {
      toast.error('Network error')
    } finally {
      setSavingExtra(false)
    }
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
      setCreatedRounds(data.rounds)
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
      ) : createdRounds ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Choose which round to start first:</p>
            {createdRounds.map((round, idx) => (
              <button
                key={round.id}
                onClick={() => router.push(`/sessions/${sessionId}/round/${round.id}`)}
                className="w-full flex items-center justify-between rounded-xl border bg-white px-5 py-4 text-left hover:border-primary hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-sm">{round.title}</p>
                    <div className="mt-0.5">
                      <RoundTypeBadge type={round.type as RoundType} />
                    </div>
                  </div>
                </div>
                <PlayCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </>
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
                <>Confirm Plan <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </>
      )}

      {session && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Documents</p>

          {/* Job Description */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowJD((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Job Description
              </div>
              {showJD ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showJD && (
              <div className="px-4 pb-4 border-t">
                <pre className="mt-3 text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                  {session.jd_text}
                </pre>
              </div>
            )}
          </div>

          {/* CV */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCV((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-muted-foreground" />
                CV / Resume
              </div>
              {showCV ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showCV && (
              <div className="px-4 pb-4 border-t">
                <pre className="mt-3 text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                  {session.cv_text}
                </pre>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="text-sm font-medium">Extra Info</p>
              {!editingExtra && (
                <button
                  type="button"
                  onClick={startEditExtra}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>
            {editingExtra ? (
              <div className="p-4 space-y-3">
                <textarea
                  autoFocus
                  value={extraDraft}
                  onChange={(e) => setExtraDraft(e.target.value)}
                  placeholder="Add any extra context: target salary, preferred location, specific concerns..."
                  className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEditExtra} disabled={savingExtra}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={saveExtraInfo} disabled={savingExtra} className="gap-1">
                    {savingExtra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : session.extra_info ? (
              <pre className="px-4 py-3 text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
                {session.extra_info}
              </pre>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground italic">
                No extra info added. Click Edit to add context for the AI.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
