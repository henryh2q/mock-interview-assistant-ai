'use client'

import { useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { EMPTY_TIER, LOADING_TIER, type Tier, type TierState } from '@/components/interview/tier-card'
import { type QuestionBlock } from '@/components/interview/question-block'
import { prefetchAnswer } from '@/lib/pronunciation-cache'

interface SetBlocks {
  (updater: (prev: QuestionBlock[]) => QuestionBlock[]): void
}

export function useAnswerStream(
  sessionId: string,
  blocksRef: React.MutableRefObject<QuestionBlock[]>,
  crossBlockHistoryRef: React.MutableRefObject<Array<{ question: string; answer: string }>>,
  selectedModelsRef: React.MutableRefObject<string[]>,
  languageRef: React.MutableRefObject<string>,
  setBlocks: SetBlocks,
) {
  const streamAbortRef = useRef<AbortController | null>(null)

  const fetchAnswer = useCallback((questionText: string, forBlockId: number) => {
    const q = questionText.trim()
    if (!q) return

    streamAbortRef.current?.abort()
    const controller = new AbortController()
    streamAbortRef.current = controller

    const currentBlock = blocksRef.current.find((b) => b.id === forBlockId)
    const history = [...crossBlockHistoryRef.current, ...(currentBlock?.blockHistory ?? [])]

    setBlocks((prev) => prev.map((b) =>
      b.id !== forBlockId ? b : {
        ...b, detectedQuestion: q,
        tiers: { quick: { ...LOADING_TIER }, better: { ...LOADING_TIER }, best: { ...LOADING_TIER } },
      }
    ))

    fetch('/api/interviewing/answer/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, question: q, history, models: selectedModelsRef.current, language: languageRef.current }),
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
              const payload = JSON.parse(line.slice(6)) as { tier?: Tier; answer?: string; error?: string; done?: boolean }
              if (payload.done) break
              if (!payload.tier) continue
              const tier = payload.tier
              if (payload.error) {
                setBlocks((prev) => prev.map((b) =>
                  b.id !== forBlockId ? b
                    : { ...b, tiers: { ...b.tiers, [tier]: { answer: null, loading: false, error: payload.error! } as TierState } }
                ))
              } else if (payload.answer) {
                snapshot[tier] = payload.answer
                // Pre-fetch pronunciation for all words as soon as the answer arrives
                prefetchAnswer(payload.answer)
                setBlocks((prev) => prev.map((b) =>
                  b.id !== forBlockId ? b
                    : { ...b, tiers: { ...b.tiers, [tier]: { answer: payload.answer!, loading: false, error: null } as TierState } }
                ))
              }
            } catch { /* ignore malformed */ }
          }
        }

        const bestAnswer = snapshot.best ?? snapshot.better ?? snapshot.quick
        if (bestAnswer) {
          setBlocks((prev) => prev.map((b) =>
            b.id !== forBlockId ? b
              : { ...b, blockHistory: [...b.blockHistory, { question: q, answer: bestAnswer }] }
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
  }, [sessionId, blocksRef, crossBlockHistoryRef, selectedModelsRef, languageRef, setBlocks])

  const abort = useCallback(() => { streamAbortRef.current?.abort() }, [])

  return { fetchAnswer, abort }
}
