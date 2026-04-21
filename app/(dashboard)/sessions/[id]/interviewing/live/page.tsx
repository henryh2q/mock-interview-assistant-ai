'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRealtimeTranscription, WordToken } from '@/hooks/useRealtimeTranscription'
import { useAnswerStream } from '@/hooks/useAnswerStream'
import { assignTiers, DEFAULT_MODEL, MODEL_OPTIONS } from '@/lib/ai/providers'
import { Mic, MicOff, Monitor, Radio, Loader2, AlertCircle, X, Send, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { TierCard, TIERS, type Tier } from '@/components/interview/tier-card'
import { ClosedBlock, QuestionBlock, QuestionLanguage, newBlock } from '@/components/interview/question-block'
import { loadStoredModels } from '@/components/shared/model-picker'

function LiveTokens({ tokens, pending }: { tokens: WordToken[]; pending: boolean }) {
  return (
    <span className="text-foreground">
      {tokens.map((t, i) => <span key={t.id}>{i > 0 ? ' ' : ''}{t.word}</span>)}
      {pending && <span className="inline-block w-0.5 h-3.5 bg-foreground ml-0.5 animate-pulse align-middle" />}
    </span>
  )
}

export default function LiveInterviewPage() {
  const { id: sessionId } = useParams<{ id: string }>()

  const [selectedModels, setSelectedModels] = useState<string[]>([DEFAULT_MODEL])
  useEffect(() => { setSelectedModels(loadStoredModels(sessionId)) }, [sessionId])

  const tierAssignments = assignTiers(selectedModels)
  const tierMeta = Object.fromEntries(
    tierAssignments.map((t) => [t.tier, {
      label: t.label,
      modelLabel: t.models.map((m) => MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m).join(' + '),
    }])
  ) as Record<Tier, { label: string; modelLabel: string }>

  const selectedModelsRef = useRef(selectedModels)
  useEffect(() => { selectedModelsRef.current = selectedModels }, [selectedModels])

  const sessionLanguageRef = useRef<QuestionLanguage>('english')
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.session?.interview_language) {
          sessionLanguageRef.current = d.session.interview_language as QuestionLanguage
        }
      })
      .catch(() => {})
  }, [sessionId])

  const [blocks, setBlocks] = useState<QuestionBlock[]>([newBlock(sessionLanguageRef.current)])
  const [useSystemAudio, setUseSystemAudio] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)

  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])

  const crossBlockHistory = blocks
    .filter((b) => b.closed && b.detectedQuestion)
    .slice(-5)
    .map((b) => ({ question: b.detectedQuestion!, answer: b.tiers.best.answer ?? b.tiers.better.answer ?? b.tiers.quick.answer ?? '' }))
    .filter((h) => h.answer)
  const crossBlockHistoryRef = useRef(crossBlockHistory)
  useEffect(() => { crossBlockHistoryRef.current = crossBlockHistory }, [crossBlockHistory])

  const { fetchAnswer, abort: abortStream } = useAnswerStream(
    sessionId, blocksRef, crossBlockHistoryRef, selectedModelsRef, setBlocks,
  )

  const handleGetAnswer = useCallback((text: string) => {
    const current = blocksRef.current[blocksRef.current.length - 1]
    if (!current || current.closed) return
    const combined = [current.fullTranscript, text].filter(Boolean).join(' ').trim()
    setBlocks((prev) => prev.map((b) => b.id !== current.id ? b : { ...b, fullTranscript: combined }))
    fetchAnswer(combined, current.id)
  }, [fetchAnswer])

  const { status, liveTokens, committedText, errorMessage, start, stop, pause, resume, clearTranscript, commitManual } =
    useRealtimeTranscription({ onUtteranceCommit: handleGetAnswer })

  const prevCommittedRef = useRef('')
  useEffect(() => {
    if (!committedText || committedText === prevCommittedRef.current) return
    prevCommittedRef.current = committedText
    setBlocks((prev) => {
      const current = prev[prev.length - 1]
      if (!current || current.closed) return prev
      return prev.map((b) => b.id !== current.id ? b : { ...b, fullTranscript: committedText })
    })
  }, [committedText])

  const handleStart = useCallback(async () => {
    setBlocks([newBlock(sessionLanguageRef.current)])
    prevCommittedRef.current = ''
    await start(useSystemAudio)
  }, [start, useSystemAudio])

  const handleStop = useCallback(() => { stop(); abortStream() }, [stop, abortStream])

  const handleNextQuestion = useCallback(() => {
    abortStream()
    clearTranscript()
    prevCommittedRef.current = ''
    if (isAnswering) { setIsAnswering(false); resume() }
    setBlocks((prev) => [...prev.map((b, i) => i === prev.length - 1 ? { ...b, closed: true } : b), newBlock(sessionLanguageRef.current)])
  }, [abortStream, clearTranscript, isAnswering, resume])

  const handleManualGetAnswer = useCallback(() => {
    const current = blocksRef.current[blocksRef.current.length - 1]
    if (!current || current.closed) return
    const liveText = liveTokens.map((t) => t.word).join(' ').trim()
    const combined = [current.fullTranscript, liveText].filter(Boolean).join(' ').trim()
    if (combined) { fetchAnswer(combined, current.id) } else { commitManual() }
  }, [liveTokens, fetchAnswer, commitManual])

  const isActive = status === 'listening' || status === 'paused'
  const isConnecting = status === 'connecting'
  const currentBlock = blocks[blocks.length - 1]
  const closedBlocks = blocks.slice(0, -1).filter((b) => b.closed)
  const hasCurrentAnswer = currentBlock && TIERS.some((t) => currentBlock.tiers[t].answer || currentBlock.tiers[t].loading)

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-3.5rem)] pb-8">
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
              {isConnecting ? 'Connecting…' : isAnswering ? 'Answering…' : isActive ? (status === 'paused' ? 'Paused' : 'Live') : 'Live Interview'}
            </span>
            {isActive && blocks.length > 0 && <span className="text-xs text-muted-foreground">· Q{blocks.length}</span>}
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
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
        {status === 'error' && errorMessage && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Connection error</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {!isActive && !isConnecting && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-5 space-y-4">
              <div>
                <p className="font-semibold text-sm mb-1">Audio Source</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Microphone works on all browsers. System audio requires Chrome and &ldquo;Share system audio&rdquo; permission.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: false, icon: <Mic className="w-4 h-4 mb-1.5" />, label: 'Microphone', sub: 'Works everywhere' },
                    { value: true,  icon: <Monitor className="w-4 h-4 mb-1.5" />, label: 'System Audio', sub: 'Chrome / Edge only' },
                  ].map(({ value, icon, label, sub }) => (
                    <button key={String(value)} type="button" onClick={() => setUseSystemAudio(value)}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors ${useSystemAudio === value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/40'}`}>
                      {icon}
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              {useSystemAudio && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-800">Screen share tip</p>
                  <p className="text-xs text-amber-700 mt-0.5">Select your Google Meet / Zoom tab and check <strong>&ldquo;Share tab audio&rdquo;</strong>.</p>
                </div>
              )}
              <Button onClick={handleStart} className="w-full gap-2"><Radio className="w-4 h-4" /> Start Listening</Button>
            </div>
            {closedBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Session recap</p>
                {closedBlocks.map((b, i) => <ClosedBlock key={b.id} block={b} blockIndex={i} tierMeta={tierMeta} />)}
              </div>
            )}
          </div>
        )}

        {isConnecting && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Connecting to realtime API…</p>
          </div>
        )}

        {isActive && (
          <div className="space-y-4">
            {closedBlocks.length > 0 && (
              <div className="space-y-2">
                {closedBlocks.map((b, i) => <ClosedBlock key={b.id} block={b} blockIndex={i} tierMeta={tierMeta} />)}
              </div>
            )}
            <div className="rounded-xl border-2 border-primary/20 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs font-semibold text-primary">Question {blocks.length}</span>
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
              <div className="px-4 py-3 space-y-3">
                <div className="text-sm leading-relaxed min-h-[2.5rem]">
                  {currentBlock?.fullTranscript && <span className="text-muted-foreground">{currentBlock.fullTranscript} </span>}
                  {liveTokens.length > 0
                    ? <LiveTokens tokens={liveTokens} pending={status === 'listening'} />
                    : !currentBlock?.fullTranscript
                      ? <span className="text-muted-foreground italic">{status === 'paused' ? 'Paused. Resume to continue.' : 'Waiting for speech…'}</span>
                      : null}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button size="sm" variant="default" onClick={handleManualGetAnswer} className="gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Get Answer
                  </Button>
                  <div className="flex items-center rounded-md border overflow-hidden text-xs font-medium">
                    {(['english', 'vietnamese'] as QuestionLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setBlocks((prev) => prev.map((b) =>
                          b.id !== currentBlock?.id ? b : { ...b, language: lang }
                        ))}
                        className={`px-2 py-1 transition-colors ${
                          currentBlock?.language === lang
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {lang === 'english' ? 'EN' : 'VI'}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleNextQuestion} className="gap-1.5 ml-auto">
                    Next Question <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {hasCurrentAnswer && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                  {TIERS.map((tier) => (
                    <TierCard key={tier} tier={tier} state={currentBlock!.tiers[tier]}
                      tierLabel={tierMeta[tier]?.label ?? tier} modelLabel={tierMeta[tier]?.modelLabel ?? ''} />
                  ))}
                  {!isAnswering ? (
                    <Button onClick={() => { setIsAnswering(true); pause() }} className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                      <BookOpen className="w-4 h-4" /> Start Answer to Interviewer
                    </Button>
                  ) : (
                    <Button onClick={() => { setIsAnswering(false); resume() }} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="w-4 h-4" /> Done Answering — Resume Listening
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
