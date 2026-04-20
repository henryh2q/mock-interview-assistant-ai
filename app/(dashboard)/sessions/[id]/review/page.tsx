'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundPlanCard } from '@/components/session/round-plan-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoundPlan } from '@/types/ai'
import { Round, Session } from '@/types/database'
import {
  ArrowRight, Loader2, RefreshCw, PlayCircle,
  ChevronDown, ChevronUp, FileText, Briefcase,
  Pencil, Check, X, Copy, Bot,
} from 'lucide-react'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { RoundType } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'
import { MODEL_OPTIONS, DEFAULT_MODEL, type Provider } from '@/lib/ai/providers'

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
}
const PROVIDERS: Provider[] = ['openai', 'anthropic', 'xai']

// ── Inline editable field ──────────────────────────────────────────────────────
function EditableTextArea({
  label,
  value,
  onSave,
  minLength = 50,
  rows = 8,
}: {
  label: string
  value: string
  onSave: (v: string) => Promise<void>
  minLength?: number
  rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim().length < minLength) {
      toast.warning(`${label} must be at least ${minLength} characters`)
      return
    }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={rows}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(value); setEditing(false) }} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto pr-8">
            {value}
          </pre>
          <button
            type="button"
            onClick={() => { setDraft(value); setEditing(true) }}
            className="absolute top-0 right-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 opacity-100"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      )}
    </div>
  )
}

// ── Model picker ───────────────────────────────────────────────────────────────
function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      {PROVIDERS.map((provider) => {
        const models = MODEL_OPTIONS.filter((m) => m.provider === provider)
        return (
          <div key={provider}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {PROVIDER_LABELS[provider]}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {models.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onChange(m.value)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    value === m.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <p className="text-xs font-semibold leading-tight">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.description}</p>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReviewPlanPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [plan, setPlan] = useState<RoundPlan[]>([])
  const [createdRounds, setCreatedRounds] = useState<Round[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  // Collapsible doc sections
  const [showJD, setShowJD] = useState(false)
  const [showCV, setShowCV] = useState(false)
  const [showModel, setShowModel] = useState(false)

  // Duplicate state
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [dupModel, setDupModel] = useState(DEFAULT_MODEL)
  const [duplicating, setDuplicating] = useState(false)

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
      .then((d) => {
        if (d.session) {
          setSession(d.session)
          setDupModel(d.session.ai_model ?? DEFAULT_MODEL)
        }
      })
      .catch(() => {})
  }, [fetchPlan, sessionId])

  const patchSession = async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  const saveJD = async (jd_text: string) => {
    try {
      await patchSession({ jd_text })
      setSession((prev) => prev ? { ...prev, jd_text } : prev)
      toast.success('Job description updated')
    } catch {
      toast.error('Failed to save job description')
    }
  }

  const saveCV = async (cv_text: string) => {
    try {
      await patchSession({ cv_text })
      setSession((prev) => prev ? { ...prev, cv_text } : prev)
      toast.success('CV updated')
    } catch {
      toast.error('Failed to save CV')
    }
  }

  const saveExtraInfo = async (extra_info: string) => {
    try {
      await patchSession({ extra_info: extra_info || null })
      setSession((prev) => prev ? { ...prev, extra_info: extra_info || null } : prev)
      toast.success('Extra info saved')
    } catch {
      toast.error('Failed to save extra info')
    }
  }

  const saveAiModel = async (ai_model: string) => {
    try {
      await patchSession({ ai_model })
      setSession((prev) => prev ? { ...prev, ai_model } : prev)
      toast.success('AI model updated')
      setShowModel(false)
    } catch {
      toast.error('Failed to update AI model')
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_model: dupModel }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to duplicate session')
        return
      }
      toast.success('Session duplicated!')
      router.push(`/sessions/${data.session.id}/review`)
    } catch {
      toast.error('Network error')
    } finally {
      setDuplicating(false)
    }
  }

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
      setCreatedRounds(data.rounds)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const currentModelLabel = MODEL_OPTIONS.find((m) => m.value === session?.ai_model)?.label
    ?? session?.ai_model
    ?? DEFAULT_MODEL

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Your Interview Plan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI has generated a personalized plan based on your CV and job description.
          </p>
        </div>
        {session && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-1.5 mt-1"
            onClick={() => setShowDuplicate((v) => !v)}
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </Button>
        )}
      </div>

      {/* Duplicate panel */}
      {showDuplicate && (
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Duplicate Session</p>
            <button type="button" onClick={() => setShowDuplicate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Creates a new session with the same CV and JD. Pick a different AI model to compare results.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" /> AI Model for the copy
            </p>
            <ModelPicker value={dupModel} onChange={setDupModel} />
          </div>
          <Button type="button" onClick={handleDuplicate} disabled={duplicating} className="w-full gap-1">
            {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            {duplicating ? 'Duplicating...' : 'Create Duplicate'}
          </Button>
        </div>
      )}

      {/* Round plan / picker */}
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
      ) : (
        <>
          <div className="space-y-3">
            {plan.map((round, idx) => (
              <RoundPlanCard key={idx} round={round} index={idx} onRemove={removeRound} />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchPlan} disabled={confirming} className="gap-1">
              <RefreshCw className="w-4 h-4" /> Regenerate
            </Button>
            <Button onClick={confirmPlan} disabled={confirming || plan.length === 0} className="flex-1 gap-1">
              {confirming
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up rounds...</>
                : <>Confirm Plan <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </>
      )}

      {/* Session Documents */}
      {session && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Settings</p>

          {/* AI Model */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowModel((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bot className="w-4 h-4 text-muted-foreground" />
                AI Model
                <span className="text-xs text-muted-foreground font-normal">— {currentModelLabel}</span>
              </div>
              {showModel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showModel && (
              <div className="px-4 pb-4 border-t pt-3 space-y-3">
                <ModelPicker
                  value={session.ai_model ?? DEFAULT_MODEL}
                  onChange={(v) => setSession((prev) => prev ? { ...prev, ai_model: v } : prev)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  onClick={() => saveAiModel(session.ai_model ?? DEFAULT_MODEL)}
                >
                  <Check className="w-4 h-4" /> Save Model
                </Button>
              </div>
            )}
          </div>

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
              <div className="px-4 pb-4 border-t pt-3">
                <EditableTextArea label="Job description" value={session.jd_text} onSave={saveJD} rows={10} />
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
              <div className="px-4 pb-4 border-t pt-3">
                <EditableTextArea label="CV" value={session.cv_text} onSave={saveCV} rows={10} />
              </div>
            )}
          </div>

          {/* Extra Info */}
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <p className="text-sm font-medium">Extra Info</p>
            </div>
            <div className="px-4 pb-4 pt-3">
              <EditableTextArea
                label="Extra info"
                value={session.extra_info ?? ''}
                onSave={saveExtraInfo}
                minLength={0}
                rows={4}
              />
              {!session.extra_info && (
                <p className="text-xs text-muted-foreground italic mt-1">Click Edit to add context for the AI.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
