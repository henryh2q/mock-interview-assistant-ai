import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { VerdictBadge } from '@/components/shared/verdict-badge'
import { ScoreBadge } from '@/components/shared/score-badge'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, XCircle, Zap } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { RoundType, Round } from '@/types/database'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string; roundId: string }>
}

export default async function RoundResultPage({ params }: PageProps) {
  const auth = await requireAuthSession()
  const { id: sessionId, roundId } = await params

  const [session, round, result] = await Promise.all([
    sessionRepository.findById(sessionId),
    roundRepository.findById(roundId),
    evaluationRepository.findRoundResult(roundId),
  ])

  if (!session || !round || !result) notFound()
  if (session.user_id !== auth.userId) redirect('/dashboard')

  const allRounds = await roundRepository.findBySessionId(sessionId)
  const currentIndex = allRounds.findIndex((r) => r.id === roundId)
  const nextRound = allRounds[currentIndex + 1] as Round | undefined

  const scoreLabel =
    (result.overall_score ?? 0) >= 9
      ? 'Excellent'
      : (result.overall_score ?? 0) >= 7
        ? 'Good — Ready with minor improvements'
        : (result.overall_score ?? 0) >= 5
          ? 'Fair — More practice recommended'
          : 'Needs significant improvement'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3 py-4">
        <RoundTypeBadge type={round.type as RoundType} />
        <h1 className="text-2xl font-bold">{round.title}</h1>
        <p className="text-muted-foreground text-sm">Round complete — here&apos;s your evaluation</p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <VerdictBadge verdict={result.verdict} size="lg" />
          <ScoreBadge score={result.overall_score ?? 0} size="lg" showLabel={false} />
        </div>

        <p className="text-sm font-medium text-muted-foreground">{scoreLabel}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {(result as unknown as { summary?: string }).summary ?? 'Round completed.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {result.strengths.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.improvements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-rose-700 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {result.improvements.map((imp, i) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <span className="text-rose-400 mt-0.5">•</span> {imp}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {result.action_items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-500" /> Action Items Before Real Interview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {result.action_items.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="font-bold text-amber-500 shrink-0">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {result.english_score && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">English Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreBadge score={result.english_score} size="md" />
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard">End Session</Link>
        </Button>

        {nextRound ? (
          <Button asChild className="flex-1">
            <Link href={`/sessions/${sessionId}/round/${nextRound.id}`}>
              Start {nextRound.title}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" className="flex-1">
            <Link href={`/sessions/${sessionId}/history`}>View Full Session</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
