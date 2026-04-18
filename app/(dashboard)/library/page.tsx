'use client'

import { useState, useEffect, useCallback } from 'react'
import { SavedAnswer, RoundType } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/empty-state'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const ROUND_TYPES: { value: RoundType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hr', label: 'HR' },
  { value: 'technical', label: 'Technical' },
  { value: 'culture_fit', label: 'Culture Fit' },
]

export default function LibraryPage() {
  const [answers, setAnswers] = useState<SavedAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<RoundType | 'all'>('all')

  const fetchAnswers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType !== 'all') params.set('round_type', filterType)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/library?${params.toString()}`)
      const data = await res.json()
      setAnswers(data.answers ?? [])
    } catch {
      toast.error('Failed to load library')
    } finally {
      setLoading(false)
    }
  }, [filterType, search])

  useEffect(() => {
    const timer = setTimeout(fetchAnswers, 300)
    return () => clearTimeout(timer)
  }, [fetchAnswers])

  const deleteAnswer = async (id: string) => {
    try {
      const res = await fetch(`/api/library?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setAnswers((prev) => prev.filter((a) => a.id !== id))
      toast.success('Removed from library')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Answer Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saved best-practice answers from your interview sessions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions and answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as RoundType | 'all')}>
          <TabsList>
            {ROUND_TYPES.map((rt) => (
              <TabsTrigger key={rt.value} value={rt.value}>
                {rt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : answers.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No saved answers yet"
          description="Complete an interview session and save the best-practice answers to build your library."
          action={{ label: 'Start a Session', href: '/sessions/new' }}
        />
      ) : (
        <div className="space-y-4">
          {answers.map((answer) => (
            <Card key={answer.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <RoundTypeBadge type={answer.round_type} />
                    <CardTitle className="text-sm font-semibold leading-snug">
                      {answer.question_content}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive h-7 w-7"
                    onClick={() => deleteAnswer(answer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your answer</p>
                  <p className="text-sm bg-muted/40 rounded-lg p-3 line-clamp-3 leading-relaxed">
                    {answer.candidate_answer}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium mb-1">Best practice answer</p>
                  <p className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">
                    {answer.best_answer}
                  </p>
                </div>
                {answer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {answer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
