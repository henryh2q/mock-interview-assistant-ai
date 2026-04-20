'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRealtimeTranscription, WordToken } from '@/hooks/useRealtimeTranscription'
import { useVoice } from '@/hooks/useVoice'
import { assignTiers, DEFAULT_MODEL, MODEL_OPTIONS } from '@/lib/ai/providers'
import {
  Mic, MicOff, Monitor, Radio, Loader2,
  Volume2, ChevronDown, ChevronUp,
  AlertCircle, X, Zap, Star, Crown, Send,
  ArrowRight, MessageSquare, BookOpen, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

// ── localStorage helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = (id: string) => `interview_models_${id}`

function loadModels(sessionId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sessionId))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[]
    }
  } catch { /* ignore */ }
  return [DEFAULT_MODEL]
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier = 'quick' | 'better' | 'best'

interface TierState {
  answer: string | null
  loading: boolean
  error: string | null
}

const EMPTY_TIER: TierState = { answer: null, loading: false, error: null }
const LOADING_TIER: TierState = { answer: null, loading: true, error: null }

// A "block" is one question exchange. The user manually closes it with "Next Question".
// While a block is open, new commits keep accumulating (follow-up / extended question).
interface QuestionBlock {
  id: number
  // All transcript text committed in this block (may grow with follow-ups)
  fullTranscript: string
  // The question text last sent to the AI (may differ from fullTranscript if user edited)
  detectedQuestion: string | null
  tiers: Record<Tier, TierState>
  // Prior answers within this block, sent as context on re-fetches within the same block
  blockHistory: Array<{ question: string; answer: string }>
  closed: boolean  // true once user clicks "Next Question"
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_META: Record<Tier, { icon: React.ReactNode; border: string; bg: string; badge: string }> = {
  quick:  { icon: <Zap   className="w-3.5 h-3.5" />, border: 'border-amber-200',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700'   },
  better: { icon: <Star  className="w-3.5 h-3.5" />, border: 'border-blue-200',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700'     },
  best:   { icon: <Crown className="w-3.5 h-3.5" />, border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
}

const TIERS: Tier[] = ['quick', 'better', 'best']

let blockIdCounter = 0
function newBlock(): QuestionBlock {
  return {
    id: ++blockIdCounter,
    fullTranscript: '',
    detectedQuestion: null,
    tiers: { quick: { ...EMPTY_TIER }, better: { ...EMPTY_TIER }, best: { ...EMPTY_TIER } },
    blockHistory: [],
    closed: false,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PronunciationData {
  ipa: string
  syllables: string
  example: string
}

function WordPronounce({ word }: { word: string }) {
  const { speak, playbackState } = useVoice()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PronunciationData | null>(null)
  const [loading, setLoading] = useState(false)
  const popoverId = useId()
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchIfNeeded = useCallback(async () => {
    if (data) return
    setLoading(true)
    try {
      const res = await fetch('/api/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      })
      if (res.ok) setData(await res.json() as PronunciationData)
    } finally {
      setLoading(false)
    }
  }, [data, word])

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setOpen(true)
    void fetchIfNeeded()
  }, [fetchIfNeeded])

  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setOpen(false), 200)
  }, [])

  useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current) }, [])

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        aria-describedby={open ? popoverId : undefined}
        className="rounded px-0.5 cursor-default underline decoration-dotted decoration-muted-foreground/40 underline-offset-2"
      >
        {word}
        {playbackState === 'playing' && <Volume2 className="inline w-3 h-3 ml-0.5 opacity-60" />}
      </span>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl border bg-white shadow-lg p-3 space-y-2 block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white block" />
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{word}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speak(word) }}
              className="shrink-0 rounded p-1 hover:bg-black/5 transition-colors"
              title="Play audio"
            >
              <Volume2 className="w-4 h-4 text-primary" />
            </button>
          </span>
          {loading && <span className="h-3 w-24 bg-black/6 rounded animate-pulse block" />}
          {!loading && data && (
            <span className="block space-y-1">
              {data.ipa && (
                <span className="block text-base font-mono text-primary tracking-wide">{data.ipa}</span>
              )}
              {data.syllables && (
                <span className="block text-xs text-muted-foreground">
                  <span className="font-medium">Syllables:</span> {data.syllables}
                </span>
              )}
              {data.example && (
                <span className="block text-xs text-muted-foreground italic">&ldquo;{data.example}&rdquo;</span>
              )}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/)
  return (
    <div className="text-sm leading-relaxed">
      {parts.map((chunk, i) =>
        chunk.trim() ? <WordPronounce key={i} word={chunk} /> : <span key={i}>{chunk}</span>
      )}
    </div>
  )
}

function LiveTokens({ tokens, pending }: { tokens: WordToken[]; pending: boolean }) {
  return (
    <span className="text-foreground">
      {tokens.map((t, i) => <span key={t.id}>{i > 0 ? ' ' : ''}{t.word}</span>)}
      {pending && <span className="inline-block w-0.5 h-3.5 bg-foreground ml-0.5 animate-pulse align-middle" />}
    </span>
  )
}

const TIER_ROLE: Record<Tier, string> = {
  quick:  'Say this first',
  better: 'Then add this',
  best:   'Then finish with',
}

function TierCard({ tier, state, tierLabel, modelLabel }: {
  tier: Tier; state: TierState; tierLabel: string; modelLabel: string
}) {
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

// Closed (past) block — compact read-only view
function ClosedBlock({ block, blockIndex, tierMeta }: {
  block: QuestionBlock
  blockIndex: number
  tierMeta: Record<Tier, { label: string; modelLabel: string }>
}) {
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveInterviewPage() {
  const { id: sessionId } = useParams<{ id: string }>()

  // ── Models ──
  const [selectedModels, setSelectedModels] = useState<string[]>([DEFAULT_MODEL])
  useEffect(() => { setSelectedModels(loadModels(sessionId)) }, [sessionId])
  const tierAssignments = assignTiers(selectedModels)
  const tierMeta = Object.fromEntries(
    tierAssignments.map((t) => [t.tier, {
      label: t.label,
      modelLabel: t.models.map((m) => MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m).join(' + '),
    }])
  ) as Record<Tier, { label: string; modelLabel: string }>
  const selectedModelsRef = useRef(selectedModels)
  useEffect(() => { selectedModelsRef.current = selectedModels }, [selectedModels])

  // ── Question blocks ──
  // blocks[0..n-2] = closed, blocks[n-1] = current active block
  const [blocks, setBlocks] = useState<QuestionBlock[]>([newBlock()])
  const [useSystemAudio, setUseSystemAudio] = useState(false)

  // Refs for use inside closures
  const streamAbortRef = useRef<AbortController | null>(null)
  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  // ── History for cross-block context ──
  // Top 5 closed blocks, best answer each, sent to every API call
  const crossBlockHistory = blocks
    .filter((b) => b.closed && b.detectedQuestion)
    .slice(-5)
    .map((b) => ({
      question: b.detectedQuestion!,
      answer: b.tiers.best.answer ?? b.tiers.better.answer ?? b.tiers.quick.answer ?? '',
    }))
    .filter((h) => h.answer)

  const crossBlockHistoryRef = useRef(crossBlockHistory)
  useEffect(() => { crossBlockHistoryRef.current = crossBlockHistory }, [crossBlockHistory])

  // ── Answer streaming ──────────────────────────────────────────────────────

  const fetchAnswer = useCallback((questionText: string, forBlockId: number) => {
    const q = questionText.trim()
    if (!q) return

    streamAbortRef.current?.abort()
    const controller = new AbortController()
    streamAbortRef.current = controller

    // Get within-block history (prior answers in this same block = follow-up context)
    const currentBlock = blocksRef.current.find((b) => b.id === forBlockId)
    const blockHistory = currentBlock?.blockHistory ?? []

    // Cross-block history = closed blocks
    const history = [...crossBlockHistoryRef.current, ...blockHistory]

    // Mark all tiers as loading for this block
    setBlocks((prev) => prev.map((b) =>
      b.id !== forBlockId ? b : {
        ...b,
        detectedQuestion: q,
        tiers: { quick: { ...LOADING_TIER }, better: { ...LOADING_TIER }, best: { ...LOADING_TIER } },
      }
    ))

    fetch('/api/interviewing/answer/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, question: q, history, models: selectedModelsRef.current }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          toast.error(data.error ?? 'Failed to get answer')
          setBlocks((prev) => prev.map((b) =>
            b.id !== forBlockId ? b : { ...b, tiers: { quick: EMPTY_TIER, better: EMPTY_TIER, best: EMPTY_TIER } }
          ))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        const snapshot: Record<Tier, string | null> = { quick: null, better: null, best: null }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const payload = JSON.parse(line.slice(6)) as {
                tier?: Tier; answer?: string; error?: string; done?: boolean
              }
              if (payload.done) break
              if (!payload.tier) continue
              const tier = payload.tier
              if (payload.error) {
                setBlocks((prev) => prev.map((b) =>
                  b.id !== forBlockId ? b
                    : { ...b, tiers: { ...b.tiers, [tier]: { answer: null, loading: false, error: payload.error! } } }
                ))
              } else if (payload.answer) {
                snapshot[tier] = payload.answer
                setBlocks((prev) => prev.map((b) =>
                  b.id !== forBlockId ? b
                    : { ...b, tiers: { ...b.tiers, [tier]: { answer: payload.answer!, loading: false, error: null } } }
                ))
              }
            } catch { /* ignore malformed line */ }
          }
        }

        // Save this answer as block-level history so follow-up questions get context
        const bestAnswer = snapshot.best ?? snapshot.better ?? snapshot.quick
        if (bestAnswer) {
          setBlocks((prev) => prev.map((b) =>
            b.id !== forBlockId ? b : {
              ...b,
              blockHistory: [...b.blockHistory, { question: q, answer: bestAnswer }],
            }
          ))
        }
      })
      .catch((err) => {
        if ((err as { name?: string }).name === 'AbortError') return
        toast.error('Connection error while getting answer')
        setBlocks((prev) => prev.map((b) =>
          b.id !== forBlockId ? b : { ...b, tiers: { quick: EMPTY_TIER, better: EMPTY_TIER, best: EMPTY_TIER } }
        ))
      })
  }, [sessionId])

  // Called by VAD auto-commit or manual button
  const handleGetAnswer = useCallback((text: string) => {
    const current = blocksRef.current[blocksRef.current.length - 1]
    if (!current || current.closed) return
    const combined = [current.fullTranscript, text].filter(Boolean).join(' ').trim()
    // Update transcript in block
    setBlocks((prev) => prev.map((b) =>
      b.id !== current.id ? b : { ...b, fullTranscript: combined }
    ))
    fetchAnswer(combined, current.id)
  }, [fetchAnswer])

  // ── Realtime transcription ────────────────────────────────────────────────

  const { status, liveTokens, committedText, errorMessage, start, stop, pause, resume, clearTranscript, commitManual } =
    useRealtimeTranscription({ onUtteranceCommit: handleGetAnswer })

  // When committedText changes (VAD finalized), accumulate into current block transcript
  const prevCommittedRef = useRef('')
  useEffect(() => {
    if (!committedText || committedText === prevCommittedRef.current) return
    prevCommittedRef.current = committedText
    // Update current block's full transcript (the answer fetch is triggered via onUtteranceCommit)
    setBlocks((prev) => {
      const current = prev[prev.length - 1]
      if (!current || current.closed) return prev
      return prev.map((b) => b.id !== current.id ? b : { ...b, fullTranscript: committedText })
    })
  }, [committedText])

  // ── Answer-reading mode ───────────────────────────────────────────────────

  const [isAnswering, setIsAnswering] = useState(false)

  const handleStartAnswer = useCallback(() => {
    setIsAnswering(true)
    pause()
  }, [pause])

  const handleDoneAnswering = useCallback(() => {
    setIsAnswering(false)
    resume()
  }, [resume])

  // ── Session controls ──────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    setBlocks([newBlock()])
    prevCommittedRef.current = ''
    await start(useSystemAudio)
  }, [start, useSystemAudio])

  const handleStop = useCallback(() => {
    stop()
    streamAbortRef.current?.abort()
  }, [stop])

  // Close the current block and open a fresh one (mic keeps running)
  const handleNextQuestion = useCallback(() => {
    streamAbortRef.current?.abort()
    clearTranscript()
    prevCommittedRef.current = ''
    // If user was answering, resume listening for the next question
    if (isAnswering) {
      setIsAnswering(false)
      resume()
    }
    setBlocks((prev) => {
      const updated = prev.map((b, i) =>
        i === prev.length - 1 ? { ...b, closed: true } : b
      )
      return [...updated, newBlock()]
    })
  }, [clearTranscript, isAnswering, resume])

  const handleManualGetAnswer = useCallback(() => {
    // Combine committed + live tokens into a question regardless of text content
    const current = blocksRef.current[blocksRef.current.length - 1]
    if (!current || current.closed) return
    const liveText = liveTokens.map((t) => t.word).join(' ').trim()
    const combined = [current.fullTranscript, liveText].filter(Boolean).join(' ').trim()
    if (combined) {
      fetchAnswer(combined, current.id)
    } else {
      commitManual() // triggers onUtteranceCommit if there's partial audio
    }
  }, [liveTokens, fetchAnswer, commitManual])

  // ── Derived state ─────────────────────────────────────────────────────────

  const isActive = status === 'listening' || status === 'paused'
  const isConnecting = status === 'connecting'
  const currentBlock = blocks[blocks.length - 1]
  const closedBlocks = blocks.slice(0, -1).filter((b) => b.closed)
  const hasCurrentAnswer = currentBlock && TIERS.some((t) => currentBlock.tiers[t].answer || currentBlock.tiers[t].loading)

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-3.5rem)] pb-8">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b px-1 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href={`/sessions/${sessionId}/interviewing`}>← Back</Link>
          </Button>
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
            <span className="text-sm font-semibold">
              {isConnecting
                ? 'Connecting…'
                : isAnswering
                  ? 'Answering…'
                  : isActive
                    ? (status === 'paused' ? 'Paused' : 'Live')
                    : 'Live Interview'}
            </span>
            {isActive && blocks.length > 0 && (
              <span className="text-xs text-muted-foreground">· Q{blocks.length}</span>
            )}
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-2">
            {/* Manual pause — only shown when NOT in answering mode */}
            {!isAnswering && (
              <Button size="sm" variant="outline" onClick={status === 'paused' ? resume : pause} className="gap-1">
                {status === 'paused' ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                {status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1">
              <X className="w-3.5 h-3.5" /> End
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 px-1 pt-4 space-y-4">

        {/* ── Error ── */}
        {status === 'error' && errorMessage && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Connection error</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* ── Start screen ── */}
        {!isActive && !isConnecting && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-5 space-y-4">
              <div>
                <p className="font-semibold text-sm mb-1">Audio Source</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Microphone works on all browsers. System audio requires Chrome and &ldquo;Share system audio&rdquo; permission.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setUseSystemAudio(false)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${!useSystemAudio ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/40'}`}>
                    <Mic className="w-4 h-4 mb-1.5" />
                    <p className="text-xs font-semibold">Microphone</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Works everywhere</p>
                  </button>
                  <button type="button" onClick={() => setUseSystemAudio(true)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${useSystemAudio ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/40'}`}>
                    <Monitor className="w-4 h-4 mb-1.5" />
                    <p className="text-xs font-semibold">System Audio</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Chrome / Edge only</p>
                  </button>
                </div>
              </div>
              {useSystemAudio && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-800">Screen share tip</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Select your Google Meet / Zoom tab and check <strong>&ldquo;Share tab audio&rdquo;</strong>.
                  </p>
                </div>
              )}
              <Button onClick={handleStart} className="w-full gap-2">
                <Radio className="w-4 h-4" /> Start Listening
              </Button>
            </div>

            {/* Recap of closed blocks after session */}
            {closedBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Session recap</p>
                {closedBlocks.map((b, i) => (
                  <ClosedBlock key={b.id} block={b} blockIndex={i} tierMeta={tierMeta} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Connecting ── */}
        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Connecting to realtime API…</p>
          </div>
        )}

        {/* ── Active session ── */}
        {isActive && (
          <div className="space-y-4">

            {/* Closed past blocks — compact accordion */}
            {closedBlocks.length > 0 && (
              <div className="space-y-2">
                {closedBlocks.map((b, i) => (
                  <ClosedBlock key={b.id} block={b} blockIndex={i} tierMeta={tierMeta} />
                ))}
              </div>
            )}

            {/* ── Current (active) block ── */}
            <div className="rounded-xl border-2 border-primary/20 bg-white overflow-hidden">

              {/* Block header */}
              <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    Question {blocks.length}
                  </span>
                  {currentBlock?.blockHistory.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      · {currentBlock.blockHistory.length} follow-up{currentBlock.blockHistory.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-medium ${isAnswering ? 'text-violet-600' : 'text-muted-foreground'}`}>
                  {isAnswering ? 'You are answering…' : status === 'paused' ? 'Paused' : 'Listening…'}
                </span>
              </div>

              {/* Live transcript */}
              <div className="px-4 py-3 space-y-3">
                <div className="text-sm leading-relaxed min-h-[2.5rem]">
                  {currentBlock?.fullTranscript && (
                    <span className="text-muted-foreground">{currentBlock.fullTranscript} </span>
                  )}
                  {liveTokens.length > 0 ? (
                    <LiveTokens tokens={liveTokens} pending={status === 'listening'} />
                  ) : !currentBlock?.fullTranscript ? (
                    <span className="text-muted-foreground italic">
                      {status === 'paused' ? 'Paused. Resume to continue.' : 'Waiting for speech…'}
                    </span>
                  ) : null}
                </div>

                {/* Action row */}
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleManualGetAnswer}
                    className="gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Get Answer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNextQuestion}
                    className="gap-1.5 ml-auto"
                  >
                    Next Question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tier answer cards + answer controls */}
              {hasCurrentAnswer && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  {TIERS.map((tier) => (
                    <TierCard
                      key={tier}
                      tier={tier}
                      state={currentBlock!.tiers[tier]}
                      tierLabel={tierMeta[tier]?.label ?? tier}
                      modelLabel={tierMeta[tier]?.modelLabel ?? ''}
                    />
                  ))}

                  {/* Start / Done answering */}
                  {!isAnswering ? (
                    <Button
                      onClick={handleStartAnswer}
                      className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      <BookOpen className="w-4 h-4" />
                      Start Answer to Interviewer
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDoneAnswering}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Done Answering — Resume Listening
                    </Button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
