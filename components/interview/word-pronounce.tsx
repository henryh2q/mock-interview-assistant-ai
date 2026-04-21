'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Volume2 } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { getCached, setCached, type PronunciationData } from '@/lib/pronunciation-cache'

export function WordPronounce({ word }: { word: string }) {
  const { speak, playbackState } = useVoice()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PronunciationData | null>(null)
  const [loading, setLoading] = useState(false)
  const popoverId = useId()
  const ref = useRef<HTMLSpanElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = useCallback(async () => {
    if (open) { setOpen(false); return }
    setOpen(true)

    const cached = getCached(word)
    if (cached) { setData(cached); return }

    setLoading(true)
    try {
      const res = await fetch('/api/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      })
      if (res.ok) {
        const d = await res.json() as PronunciationData
        setCached(word, d)
        setData(d)
      }
    } finally {
      setLoading(false)
    }
  }, [word, open])

  return (
    <span ref={ref} className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        aria-describedby={open ? popoverId : undefined}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className="rounded px-0.5 cursor-pointer underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:decoration-muted-foreground/70"
      >
        {word}
        {playbackState === 'playing' && <Volume2 className="inline w-3 h-3 ml-0.5 opacity-60" />}
      </span>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-xl border bg-white shadow-lg p-3 space-y-2 block"
        >
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white block" />
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm truncate">{word}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); speak(word) }}
              className="shrink-0 rounded p-1 hover:bg-black/5 transition-colors" title="Play audio">
              <Volume2 className="w-4 h-4 text-primary" />
            </button>
          </span>
          {loading && <span className="h-3 w-24 bg-black/6 rounded animate-pulse block" />}
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
