import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { messageRepository } from '@/repositories/message.repository'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { VerdictBadge } from '@/components/shared/verdict-badge'
import { ScoreBadge } from '@/components/shared/score-badge'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BookmarkCheck, ArrowLeft } from 'lucide-react'
import { RoundType } from '@/types/database'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SessionHistoryPage({ params }: PageProps) {
  const auth = await requireAuthSession()
  const { id: sessionId } = await params

  const session = await sessionRepository.findById(sessionId)
  if (!session) notFound()
  if (session.user_id !== auth.userId) redirect('/dashboard')

  const rounds = await roundRepository.findBySessionId(sessionId)

  const roundsWithData = await Promise.all(
    rounds.map(async (round) => {
      const [messages, evaluations, result] = await Promise.all([
        messageRepository.findByRoundId(round.id),
        evaluationRepository.findByRoundId(round.id),
        evaluationRepository.findRoundResult(round.id),
      ])
      const evalMap = new Map(evaluations.map((e) => [e.message_id, e]))
      const turns = messages
        .filter((m) => m.role === 'interviewer')
        .map((q) => ({
          question: q,
          answer: messages.find(
            (m) => m.role === 'candidate' && m.question_index === q.question_index,
          ),
          evaluation: evalMap.get(q.id),
        }))
      return { round, turns, result }
    }),
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
          <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold">{session.name ?? 'Interview Session'}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(session.created_at)}</p>
      </div>

      {roundsWithData.map(({ round, turns, result }) => (
        <div key={round.id} className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <RoundTypeBadge type={round.type as RoundType} />
            <h2 className="font-semibold">{round.title}</h2>
            {result && <VerdictBadge verdict={result.verdict} />}
            {result?.overall_score && <ScoreBadge score={result.overall_score} size="sm" />}
          </div>

          {turns.map((turn, idx) => (
            <Card key={idx} className="border-l-4 border-l-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Q{idx + 1}
                </CardTitle>
                <p className="text-sm font-medium">{turn.question.content}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {turn.answer && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your answer</p>
                    <p className="text-sm bg-muted/40 rounded-lg p-3 leading-relaxed">
                      {turn.answer.content}
                    </p>
                  </div>
                )}

                {turn.evaluation && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ScoreBadge score={turn.evaluation.score ?? 0} size="sm" />
                      {turn.evaluation.strengths.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs text-emerald-700">
                          ✓ {s}
                        </Badge>
                      ))}
                    </div>

                    {turn.evaluation.best_answer && (
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          View suggested answer
                        </summary>
                        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <p className="text-xs text-amber-900 leading-relaxed">
                            {turn.evaluation.best_answer}
                          </p>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Separator />
        </div>
      ))}
    </div>
  )
}
