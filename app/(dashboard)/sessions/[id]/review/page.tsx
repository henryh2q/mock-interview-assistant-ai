'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoundPlanCard } from '@/components/session/round-plan-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RoundPlan } from '@/types/ai'
import { Round, Session } from '@/types/database'
import { ArrowRight, Loader2, RefreshCw, PlayCircle, FileText, Briefcase, X, Copy, Bot, Check, Languages } from 'lucide-react'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { RoundType } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'
import { MODEL_OPTIONS, DEFAULT_MODEL } from '@/lib/ai/providers'
import { EditableTextArea } from '@/components/shared/editable-textarea'
import { CollapsibleSection } from '@/components/shared/collapsible-section'
import { ModelPicker } from '@/components/shared/model-picker'
import { LanguagePicker, LANGUAGE_LABELS } from '@/components/shared/language-picker'
import { useSessionPatch } from '@/hooks/useSessionPatch'
import { type InterviewLanguage } from '@/types/database'

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
  const [showModel, setShowModel] = useState(false)
  const [showLanguage, setShowLanguage] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [dupModel, setDupModel] = useState(DEFAULT_MODEL)
  const [duplicating, setDuplicating] = useState(false)

  const { saveField } = useSessionPatch(sessionId, setSession)

  const fetchPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/plan`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to generate plan'); return }
      if (data.confirmed && data.rounds) { setCreatedRounds(data.rounds); return }
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
      .then((d) => { if (d.session) { setSession(d.session); setDupModel(d.session.ai_model ?? DEFAULT_MODEL) } })
      .catch(() => {})
  }, [fetchPlan, sessionId])

  const saveJD       = (jd_text: string)          => saveField({ jd_text }, 'Job description updated', 'Failed to save job description')
  const saveCV       = (cv_text: string)          => saveField({ cv_text }, 'CV updated', 'Failed to save CV')
  const saveExtra    = (v: string)                 => saveField({ extra_info: v || null }, 'Extra info saved', 'Failed to save extra info')
  const saveModel    = async (ai_model: string) => {
    await saveField({ ai_model }, 'AI model updated', 'Failed to update AI model')
    setShowModel(false)
  }
  const saveLanguage = async (interview_language: InterviewLanguage) => {
    await saveField({ interview_language }, 'Language updated', 'Failed to update language')
    setShowLanguage(false)
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
      if (!res.ok) { toast.error(data.error ?? 'Failed to duplicate session'); return }
      toast.success('Session duplicated!')
      router.push(`/sessions/${data.session.id}/review`)
    } catch {
      toast.error('Network error')
    } finally {
      setDuplicating(false)
    }
  }

  const removeRound = (index: number) => {
    if (plan.length <= 1) { toast.warning('You must have at least one round'); return }
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
      if (!res.ok) { toast.error(data.error ?? 'Failed to confirm plan'); return }
      setCreatedRounds(data.rounds)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const currentModelLabel = MODEL_OPTIONS.find((m) => m.value === session?.ai_model)?.label ?? session?.ai_model ?? DEFAULT_MODEL

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link href="/dashboard">← Back to Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Your Interview Plan</h1>
          <p className="text-muted-foreground text-sm mt-1">AI has generated a personalized plan based on your CV and job description.</p>
        </div>
        {session && (
          <Button type="button" variant="outline" size="sm" className="flex-shrink-0 gap-1.5 mt-1" onClick={() => setShowDuplicate((v) => !v)}>
            <Copy className="w-4 h-4" /> Duplicate
          </Button>
        )}
      </div>

      {showDuplicate && (
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Duplicate Session</p>
            <button type="button" onClick={() => setShowDuplicate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-sm text-muted-foreground">Creates a new session with the same CV and JD. Pick a different AI model to compare results.</p>
          <ModelPicker value={dupModel} onChange={setDupModel} />
          <Button type="button" onClick={handleDuplicate} disabled={duplicating} className="w-full gap-1">
            {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            {duplicating ? 'Duplicating...' : 'Create Duplicate'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Generating your personalized interview plan...</div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5 space-y-3">
              <Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-64" /><Skeleton className="h-4 w-48" />
              <div className="flex gap-2"><Skeleton className="h-6 w-20" /><Skeleton className="h-6 w-24" /></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="outline" size="sm" onClick={fetchPlan}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
          </AlertDescription>
        </Alert>
      ) : createdRounds ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Choose which round to start first:</p>
          {createdRounds.map((round, idx) => (
            <button key={round.id} onClick={() => router.push(`/sessions/${sessionId}/round/${round.id}`)}
              className="w-full flex items-center justify-between rounded-xl border bg-white px-5 py-4 text-left hover:border-primary hover:bg-primary/5 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-5">{idx + 1}</span>
                <div>
                  <p className="font-semibold text-sm">{round.title}</p>
                  <div className="mt-0.5"><RoundTypeBadge type={round.type as RoundType} /></div>
                </div>
              </div>
              <PlayCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {plan.map((round, idx) => <RoundPlanCard key={idx} round={round} index={idx} onRemove={removeRound} />)}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchPlan} disabled={confirming} className="gap-1"><RefreshCw className="w-4 h-4" /> Regenerate</Button>
            <Button onClick={confirmPlan} disabled={confirming || plan.length === 0} className="flex-1 gap-1">
              {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up rounds...</> : <>Confirm Plan <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </>
      )}

      {session && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Settings</p>

          <CollapsibleSection open={showModel} onToggle={() => setShowModel((v) => !v)}
            icon={<Bot className="w-4 h-4 text-muted-foreground" />} title="AI Model" subtitle={currentModelLabel}>
            <div className="space-y-3">
              <ModelPicker value={session.ai_model ?? DEFAULT_MODEL}
                onChange={(v) => setSession((prev) => prev ? { ...prev, ai_model: v } : prev)} />
              <Button type="button" size="sm" className="gap-1" onClick={() => saveModel(session.ai_model ?? DEFAULT_MODEL)}>
                <Check className="w-4 h-4" /> Save Model
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection open={showLanguage} onToggle={() => setShowLanguage((v) => !v)}
            icon={<Languages className="w-4 h-4 text-muted-foreground" />} title="Interview Language"
            subtitle={LANGUAGE_LABELS[session.interview_language ?? 'english']}>
            <LanguagePicker
              value={(session.interview_language ?? 'english') as InterviewLanguage}
              onChange={saveLanguage}
            />
          </CollapsibleSection>

          <CollapsibleSection open={showJD} onToggle={() => setShowJD((v) => !v)}
            icon={<Briefcase className="w-4 h-4 text-muted-foreground" />} title="Job Description">
            <EditableTextArea label="Job description" value={session.jd_text} onSave={saveJD} rows={10} />
          </CollapsibleSection>

          <CollapsibleSection open={showCV} onToggle={() => setShowCV((v) => !v)}
            icon={<FileText className="w-4 h-4 text-muted-foreground" />} title="CV / Resume">
            <EditableTextArea label="CV" value={session.cv_text} onSave={saveCV} rows={10} />
          </CollapsibleSection>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b"><p className="text-sm font-medium">Extra Info</p></div>
            <div className="px-4 pb-4 pt-3">
              <EditableTextArea label="Extra info" value={session.extra_info ?? ''} onSave={saveExtra} minLength={0} rows={4} />
              {!session.extra_info && <p className="text-xs text-muted-foreground italic mt-1">Click Edit to add context for the AI.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
