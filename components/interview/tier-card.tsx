'use client'

import { Loader2, Zap, Star, Crown } from 'lucide-react'
import { AnswerText } from './word-pronounce'

export type Tier = 'quick' | 'better' | 'best'

export interface TierState {
  answer: string | null
  loading: boolean
  error: string | null
}

export const EMPTY_TIER: TierState = { answer: null, loading: false, error: null }
export const LOADING_TIER: TierState = { answer: null, loading: true, error: null }
export const TIERS: Tier[] = ['quick', 'better', 'best']

export const TIER_META: Record<Tier, { icon: React.ReactNode; border: string; bg: string; badge: string }> = {
  quick:  { icon: <Zap   className="w-3.5 h-3.5" />, border: 'border-amber-200',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700'   },
  better: { icon: <Star  className="w-3.5 h-3.5" />, border: 'border-blue-200',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700'     },
  best:   { icon: <Crown className="w-3.5 h-3.5" />, border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
}

const TIER_ROLE: Record<Tier, string> = {
  quick:  'Say this first',
  better: 'Then add this',
  best:   'Then finish with',
}

interface TierCardProps {
  tier: Tier
  state: TierState
  tierLabel: string
  modelLabel: string
}

export function TierCard({ tier, state, tierLabel, modelLabel }: TierCardProps) {
  const meta = TIER_META[tier]
  if (!state.loading && !state.answer && !state.error) return null
  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} p-4 space-y-2`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${meta.badge}`}>
          {meta.icon}{tierLabel}
        </span>
        <span className="text-[11px] text-muted-foreground">{TIER_ROLE[tier]}</span>
        <span className="text-[11px] text-muted-foreground/60">· {modelLabel}</span>
        {state.loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-auto" />}
        {!state.loading && state.answer && (
          <span className="text-[11px] text-muted-foreground ml-auto">Tap word to pronounce</span>
        )}
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.loading && !state.answer && (
        <div className="space-y-1.5">
          <div className="h-3 bg-black/6 rounded animate-pulse w-full" />
          <div className="h-3 bg-black/6 rounded animate-pulse w-4/5" />
        </div>
      )}
      {state.answer && <AnswerText text={state.answer} />}
    </div>
  )
}
