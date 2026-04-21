'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Session } from '@/types/database'
import { FileText, Briefcase, Bot, Loader2, Radio } from 'lucide-react'
import { assignTiers, MODEL_OPTIONS, DEFAULT_MODEL } from '@/lib/ai/providers'
import { EditableTextArea } from '@/components/shared/editable-textarea'
import { CollapsibleSection } from '@/components/shared/collapsible-section'
import { MultiModelPicker, TIER_ICONS, TIER_COLORS, loadStoredModels, saveStoredModels } from '@/components/shared/model-picker'
import { useSessionPatch } from '@/hooks/useSessionPatch'

export default function InterviewingSetupPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJD, setShowJD] = useState(false)
  const [showCV, setShowCV] = useState(false)
  const [showModel, setShowModel] = useState(true)
  const [selectedModels, setSelectedModels] = useState<string[]>([DEFAULT_MODEL])
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const { saveField } = useSessionPatch(sessionId, setSession)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      const data = await res.json() as { session?: Session; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to load session'); return }
      if (data.session) {
        setSession(data.session)
        setSelectedModels(loadStoredModels(sessionId, data.session.ai_model ?? DEFAULT_MODEL))
        setModelsLoaded(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchSession() }, [fetchSession])

  useEffect(() => {
    if (modelsLoaded) saveStoredModels(sessionId, selectedModels)
  }, [selectedModels, sessionId, modelsLoaded])

  const saveJD    = (jd_text: string)  => saveField({ jd_text }, 'Job description updated', 'Failed to save job description')
  const saveCV    = (cv_text: string)  => saveField({ cv_text }, 'CV updated', 'Failed to save CV')
  const saveExtra = (v: string)         => saveField({ extra_info: v || null }, 'Extra info saved', 'Failed to save extra info')

  const tierSummary = assignTiers(selectedModels)
    .map((t) => `${t.label}: ${t.models.map((m) => MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m).join('+')}`)
    .join(' · ')

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pb-10">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /><Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }
  if (error) {
    return <div className="max-w-2xl mx-auto"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></div>
  }
  if (!session) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/dashboard">← Back to Dashboard</Link>
        </Button>
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-5 h-5 text-red-500" />
          <h1 className="text-2xl font-bold tracking-tight">Live Interview</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          AI listens to your interviewer in real time and suggests answers. Configure your AI models below, then go live.
        </p>
      </div>

      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-medium">Ready to start your live interview?</p>
        <div className="flex flex-wrap gap-1.5">
          {assignTiers(selectedModels).map((t) => (
            <span key={t.tier} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[t.tier]}`}>
              {TIER_ICONS[t.tier]} {t.label}
            </span>
          ))}
        </div>
        <Button className="w-full gap-2" onClick={() => router.push(`/sessions/${sessionId}/interviewing/live`)}>
          <Radio className="w-4 h-4" /> Start Live Interview
        </Button>
      </div>

      <div className="space-y-3 pt-2 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Settings</p>

        <CollapsibleSection open={showModel} onToggle={() => setShowModel((v) => !v)}
          icon={<Bot className="w-4 h-4 text-muted-foreground shrink-0" />}
          title="AI Models" subtitle={tierSummary}>
          <MultiModelPicker selected={selectedModels} onChange={setSelectedModels} />
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
    </div>
  )
}
