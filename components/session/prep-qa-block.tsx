'use client'

import { useState, useCallback, useEffect } from 'react'
import { Loader2, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { type InterviewLanguage } from '@/types/database'

type Category = 'hr' | 'technical' | 'culture_fit'

interface PrepItem {
  category: Category
  question: string
  answer: string
}

const CATEGORY_LABEL: Record<Category, string> = {
  hr: 'HR',
  technical: 'Technical',
  culture_fit: 'Culture Fit',
}

const CATEGORY_COLOR: Record<Category, string> = {
  hr: 'bg-blue-50 text-blue-700 border-blue-200',
  technical: 'bg-violet-50 text-violet-700 border-violet-200',
  culture_fit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function PrepItemCard({ item, index }: { item: PrepItem; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-xs font-bold text-muted-foreground w-5 pt-0.5 shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border mb-1 ${CATEGORY_COLOR[item.category]}`}>
            {CATEGORY_LABEL[item.category]}
          </span>
          <p className="text-sm font-medium leading-snug">{item.question}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t bg-slate-50">
          <p className="text-sm text-slate-700 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

interface PrepQABlockProps {
  sessionId: string
  language: InterviewLanguage
}

export function PrepQABlock({ sessionId, language }: PrepQABlockProps) {
  const [items, setItems] = useState<PrepItem[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setItems([])
    setDone(false)
    setError(null)

    try {
      const res = await fetch(`/api/sessions/${sessionId}/prep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Failed to generate prep Q&A')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6)) as { item?: PrepItem; done?: boolean; error?: string }
            if (payload.error) { setError(payload.error); return }
            if (payload.done) { setDone(true); break }
            if (payload.item) setItems((prev) => [...prev, payload.item!])
          } catch { /* ignore malformed */ }
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, language])

  // Auto-generate on mount
  useEffect(() => { void generate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Generating with GPT-4 Turbo…</p>
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={generate} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => <PrepItemCard key={i} item={item} index={i} />)}

      {loading && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border bg-white text-sm text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading more…
        </div>
      )}

      {done && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">{items.length} questions</p>
          <Button type="button" size="sm" variant="ghost" onClick={generate} disabled={loading} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Regenerate
          </Button>
        </div>
      )}
    </div>
  )
}
