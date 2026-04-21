'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { TierCard, TIERS, EMPTY_TIER, LOADING_TIER, TIER_META, type Tier, type TierState } from './tier-card'

export type { Tier, TierState }
export { EMPTY_TIER, LOADING_TIER, TIERS, TIER_META }

export interface QuestionBlock {
  id: number
  fullTranscript: string
  detectedQuestion: string | null
  tiers: Record<Tier, TierState>
  blockHistory: Array<{ question: string; answer: string }>
  closed: boolean
}

let blockIdCounter = 0
export function newBlock(): QuestionBlock {
  return {
    id: ++blockIdCounter,
    fullTranscript: '',
    detectedQuestion: null,
    tiers: { quick: { ...EMPTY_TIER }, better: { ...EMPTY_TIER }, best: { ...EMPTY_TIER } },
    blockHistory: [],
    closed: false,
  }
}

interface ClosedBlockProps {
  block: QuestionBlock
  blockIndex: number
  tierMeta: Record<Tier, { label: string; modelLabel: string }>
}

export function ClosedBlock({ block, blockIndex, tierMeta }: ClosedBlockProps) {
  const [open, setOpen] = useState(false)
  const bestAnswer = block.tiers.best.answer ?? block.tiers.better.answer ?? block.tiers.quick.answer

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 shrink-0">Q{blockIndex + 1}</span>
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 truncate">{block.detectedQuestion ?? block.fullTranscript}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-200 pt-3 space-y-3">
          {block.fullTranscript && block.fullTranscript !== block.detectedQuestion && (
            <p className="text-xs text-slate-500 italic">{block.fullTranscript}</p>
          )}
          {TIERS.map((tier) => (
            <TierCard key={tier} tier={tier} state={block.tiers[tier]}
              tierLabel={tierMeta[tier]?.label ?? tier}
              modelLabel={tierMeta[tier]?.modelLabel ?? ''} />
          ))}
          {!bestAnswer && <p className="text-xs text-muted-foreground italic">No answer generated.</p>}
        </div>
      )}
    </div>
  )
}
