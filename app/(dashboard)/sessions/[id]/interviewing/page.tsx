'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Session } from '@/types/database'
import {
  ChevronDown, ChevronUp, FileText, Briefcase,
  Bot, Loader2, Check, X, Pencil, Radio,
  Zap, Star, Crown, Info,
} from 'lucide-react'
import {
  MODEL_OPTIONS, DEFAULT_MODEL, type Provider,
  assignTiers, type TierName,
} from '@/lib/ai/providers'
import { toast } from 'sonner'

// ── Constants ─────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', xai: 'xAI',
}
const PROVIDERS: Provider[] = ['openai', 'anthropic', 'xai']

const TIER_ICONS: Record<TierName, React.ReactNode> = {
  quick:  <Zap   className="w-3 h-3" />,
  better: <Star  className="w-3 h-3" />,
  best:   <Crown className="w-3 h-3" />,
}
const TIER_COLORS: Record<TierName, string> = {
  quick:  'bg-amber-100 text-amber-700 border-amber-200',
  better: 'bg-blue-100 text-blue-700 border-blue-200',
  best:   'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const STORAGE_KEY = (sessionId: string) => `interview_models_${sessionId}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadStoredModels(sessionId: string, fallback: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sessionId))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[]
    }
  } catch { /* ignore */ }
  return [fallback]
}

function saveStoredModels(sessionId: string, models: string[]) {
  try { localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(models)) } catch { /* ignore */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EditableTextArea({
  label, value, onSave, minLength = 50, rows = 8,
}: {
  label: string; value: string; onSave: (v: string) => Promise<void>; minLength?: number; rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim().length < minLength) { toast.warning(`${label} must be at least ${minLength} characters`); return }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div>
      {editing ? (
        <div className="space-y-2">
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={rows}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y" />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setDraft(value); setEditing(false) }} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto pr-8">{value}</pre>
          <button type="button" onClick={() => { setDraft(value); setEditing(true) }}
            className="absolute top-0 right-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-100">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      )}
    </div>
  )
}

// Multi-select model picker with live tier preview
function InterviewModelPicker({
  selected, onChange,
}: {
  selected: string[]
  onChange: (models: string[]) => void
}) {
  const tiers = assignTiers(selected)

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      if (selected.length === 1) return // keep at least 1
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  // Which tier is each model assigned to?
  const modelToTier = new Map<string, TierName>()
  for (const t of tiers) {
    for (const m of t.models) modelToTier.set(m, t.tier)
  }

  return (
    <div className="space-y-4">
      {/* Tier preview */}
      <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Info className="w-3 h-3" /> Tier Assignment Preview
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tiers.map((t) => (
            <span key={t.tier} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[t.tier]}`}>
              {TIER_ICONS[t.tier]}
              <span>{t.label}:</span>
              <span className="font-normal">
                {t.models.map((m) => MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m).join(', ')}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Model grid */}
      {PROVIDERS.map((provider) => {
        const models = MODEL_OPTIONS.filter((m) => m.provider === provider)
        return (
          <div key={provider}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{PROVIDER_LABELS[provider]}</p>
            <div className="grid grid-cols-3 gap-2">
              {models.map((m) => {
                const isSelected = selected.includes(m.value)
                const tier = modelToTier.get(m.value)
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggle(m.value)}
                    className={`relative rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:border-muted-foreground/40'
                    }`}
                  >
                    {isSelected && tier && (
                      <span className={`absolute -top-2 -right-1 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${TIER_COLORS[tier]}`}>
                        {TIER_ICONS[tier]}{tier}
                      </span>
                    )}
                    <p className="text-xs font-semibold leading-tight pr-1">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="text-[11px] text-muted-foreground">
        Select 1–8 models. Fastest runs first (Quick), slowest runs last (Best). Equal-speed models race — first reply wins.
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InterviewingSetupPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showJD, setShowJD] = useState(false)
  const [showCV, setShowCV] = useState(false)
  const [showModel, setShowModel] = useState(true) // open by default — it's the key setting

  // Interview model selection — stored in localStorage, not DB
  const [selectedModels, setSelectedModels] = useState<string[]>([DEFAULT_MODEL])
  const [modelsLoaded, setModelsLoaded] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`)
      const data = await res.json() as { session?: Session; error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to load session'); return }
      if (data.session) {
        setSession(data.session)
        // Load stored models, falling back to session's ai_model
        const stored = loadStoredModels(sessionId, data.session.ai_model ?? DEFAULT_MODEL)
        setSelectedModels(stored)
        setModelsLoaded(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Persist model selection to localStorage whenever it changes
  useEffect(() => {
    if (modelsLoaded) saveStoredModels(sessionId, selectedModels)
  }, [selectedModels, sessionId, modelsLoaded])

  const patchSession = async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    if (!res.ok) throw new Error('Save failed')
  }

  const saveJD = async (jd_text: string) => {
    try { await patchSession({ jd_text }); setSession((p) => p ? { ...p, jd_text } : p); toast.success('Job description updated') }
    catch { toast.error('Failed to save job description') }
  }

  const saveCV = async (cv_text: string) => {
    try { await patchSession({ cv_text }); setSession((p) => p ? { ...p, cv_text } : p); toast.success('CV updated') }
    catch { toast.error('Failed to save CV') }
  }

  const saveExtraInfo = async (extra_info: string) => {
    try { await patchSession({ extra_info: extra_info || null }); setSession((p) => p ? { ...p, extra_info: extra_info || null } : p); toast.success('Extra info saved') }
    catch { toast.error('Failed to save extra info') }
  }

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

      {/* CTA */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-medium">Ready to start your live interview?</p>
        <div className="flex flex-wrap gap-1.5">
          {assignTiers(selectedModels).map((t) => (
            <span key={t.tier} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TIER_COLORS[t.tier]}`}>
              {TIER_ICONS[t.tier]} {t.label}
            </span>
          ))}
        </div>
        <Button
          className="w-full gap-2"
          onClick={() => router.push(`/sessions/${sessionId}/interviewing/live`)}
        >
          <Radio className="w-4 h-4" /> Start Live Interview
        </Button>
      </div>

      {/* Settings */}
      <div className="space-y-3 pt-2 border-t">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Settings</p>

        {/* AI Models for Interview */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowModel((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium min-w-0">
              <Bot className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="shrink-0">AI Models</span>
              <span className="text-xs text-muted-foreground font-normal truncate">— {tierSummary}</span>
            </div>
            {showModel ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </button>
          {showModel && (
            <div className="px-4 pb-4 border-t pt-3">
              <InterviewModelPicker selected={selectedModels} onChange={setSelectedModels} />
            </div>
          )}
        </div>

        {/* Job Description */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <button type="button" onClick={() => setShowJD((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="w-4 h-4 text-muted-foreground" /> Job Description
            </div>
            {showJD ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showJD && <div className="px-4 pb-4 border-t pt-3"><EditableTextArea label="Job description" value={session.jd_text} onSave={saveJD} rows={10} /></div>}
        </div>

        {/* CV */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <button type="button" onClick={() => setShowCV((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4 text-muted-foreground" /> CV / Resume
            </div>
            {showCV ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showCV && <div className="px-4 pb-4 border-t pt-3"><EditableTextArea label="CV" value={session.cv_text} onSave={saveCV} rows={10} /></div>}
        </div>

        {/* Extra Info */}
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b"><p className="text-sm font-medium">Extra Info</p></div>
          <div className="px-4 pb-4 pt-3">
            <EditableTextArea label="Extra info" value={session.extra_info ?? ''} onSave={saveExtraInfo} minLength={0} rows={4} />
            {!session.extra_info && <p className="text-xs text-muted-foreground italic mt-1">Click Edit to add context for the AI.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
