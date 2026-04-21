'use client'

import { MODEL_OPTIONS, DEFAULT_MODEL, type Provider, assignTiers, type TierName } from '@/lib/ai/providers'
import { Zap, Star, Crown, Info } from 'lucide-react'

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
}

export const PROVIDERS: Provider[] = ['openai', 'anthropic', 'xai']

export const TIER_ICONS: Record<TierName, React.ReactNode> = {
  quick:  <Zap   className="w-3 h-3" />,
  better: <Star  className="w-3 h-3" />,
  best:   <Crown className="w-3 h-3" />,
}

export const TIER_COLORS: Record<TierName, string> = {
  quick:  'bg-amber-100 text-amber-700 border-amber-200',
  better: 'bg-blue-100 text-blue-700 border-blue-200',
  best:   'bg-emerald-100 text-emerald-700 border-emerald-200',
}

// Single-select model picker (used in review/plan pages)
interface ModelPickerProps {
  value: string
  onChange: (v: string) => void
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
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

// Multi-select model picker with tier preview (used in interviewing mode)
interface MultiModelPickerProps {
  selected: string[]
  onChange: (models: string[]) => void
}

export function MultiModelPicker({ selected, onChange }: MultiModelPickerProps) {
  const tiers = assignTiers(selected)
  const modelToTier = new Map<string, TierName>()
  for (const t of tiers) {
    for (const m of t.models) modelToTier.set(m, t.tier)
  }

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      if (selected.length === 1) return
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="space-y-4">
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

      {PROVIDERS.map((provider) => {
        const models = MODEL_OPTIONS.filter((m) => m.provider === provider)
        return (
          <div key={provider}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {PROVIDER_LABELS[provider]}
            </p>
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

// localStorage helpers shared across interviewing pages
export const INTERVIEW_MODELS_KEY = (sessionId: string) => `interview_models_${sessionId}`

export function loadStoredModels(sessionId: string, fallback = DEFAULT_MODEL): string[] {
  try {
    const raw = localStorage.getItem(INTERVIEW_MODELS_KEY(sessionId))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[]
    }
  } catch { /* ignore */ }
  return [fallback]
}

export function saveStoredModels(sessionId: string, models: string[]) {
  try { localStorage.setItem(INTERVIEW_MODELS_KEY(sessionId), JSON.stringify(models)) } catch { /* ignore */ }
}
