'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Volume2 } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { getCached, prefetch, type PronunciationData } from '@/lib/pronunciation-cache'

export function WordPronounce({ word }: { word: string }) {
  const { speak, playbackState } = useVoice()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PronunciationData | null>(() => getCached(word))
  const [loading, setLoading] = useState(false)
  const popoverId = useId()
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // If cache fills in after mount (prefetch completed), sync state
  useEffect(() => {
    const cached = getCached(word)
    if (cached && !data) setData(cached)
  })

  const fetchIfNeeded = useCallback(async () => {
    const cached = getCached(word)
    if (cached) { setData(cached); return }
    setLoading(true)
    // prefetch() is idempotent — reuses the in-flight promise if already pending
    prefetch(word)
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
  }, [word, data]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setOpen(true)
    // If already cached, no network call — instant display
    const cached = getCached(word)
    if (cached) { setData(cached) } else { void fetchIfNeeded() }
  }, [word, fetchIfNeeded])

  const handleMouseLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => setOpen(false), 200)
  }, [])

  useEffect(() => () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current) }, [])

  return (
    <span className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
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
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white block" />
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{word}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); speak(word) }}
              className="shrink-0 rounded p-1 hover:bg-black/5 transition-colors" title="Play audio">
              <Volume2 className="w-4 h-4 text-primary" />
            </button>
          </span>
          {loading && !data && <span className="h-3 w-24 bg-black/6 rounded animate-pulse block" />}
          {data && (
            <span className="block space-y-1">
              {data.ipa && <span className="block text-base font-mono text-primary tracking-wide">{data.ipa}</span>}
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

export function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/)
  return (
    <div className="text-sm leading-relaxed">
      {parts.map((chunk, i) =>
        chunk.trim() ? <WordPronounce key={i} word={chunk} /> : <span key={i}>{chunk}</span>
      )}
    </div>
  )
}
