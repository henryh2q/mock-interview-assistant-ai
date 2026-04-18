import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { messageRepository } from '@/repositories/message.repository'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { aiService } from '@/services/ai.service'
import { rateLimitService } from '@/services/rate-limit.service'
import { analyticsService } from '@/services/analytics.service'
import { toApiError, NotFoundError, UnauthorizedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

type RouteParams = { params: Promise<{ id: string; roundId: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthSession()
    const { id: sessionId, roundId } = await params

    const [session, round] = await Promise.all([
      sessionRepository.findById(sessionId),
      roundRepository.findById(roundId),
    ])

    if (!session) throw new NotFoundError('Session')
    if (!round) throw new NotFoundError('Round')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    // Build Q&A transcript from DB
    const [messages, evaluations] = await Promise.all([
      messageRepository.findByRoundId(roundId),
      evaluationRepository.findByRoundId(roundId),
    ])

    const evalMap = new Map(evaluations.map((e) => [e.message_id, e]))

    const qaTranscript = messages
      .filter((m) => m.role === 'interviewer')
      .map((questionMsg) => {
        const evaluation = evalMap.get(questionMsg.id)
        const answerMsg = messages.find(
          (m) =>
            m.role === 'candidate' &&
            m.question_index === questionMsg.question_index,
        )
        return {
          question: questionMsg.content,
          answer: answerMsg?.content ?? '(no answer)',
          score: evaluation?.score ?? 1,
          strengths: evaluation?.strengths ?? [],
          weaknesses: evaluation?.weaknesses ?? [],
        }
      })

    await rateLimitService.checkAICallLimit(auth.userId)

    const verdict = await aiService.generateRoundVerdict({
      roundTitle: round.title,
      roundType: round.type,
      jdText: session.jd_text,
      qaTranscript,
      aiModel: session.ai_model ?? undefined,
    })

    await rateLimitService.incrementAICallCount(auth.userId)

    const roundResult = await evaluationRepository.createRoundResult({
      round_id: roundId,
      session_id: sessionId,
      verdict,
    })

    await roundRepository.updateStatus(roundId, 'completed')

    // Check if all rounds are done → complete session
    const allRounds = await roundRepository.findBySessionId(sessionId)
    const allDone = allRounds.every((r) => r.id === roundId || r.status === 'completed')
    if (allDone) {
      await sessionRepository.updateStatus(sessionId, 'completed')
    }

    await analyticsService.track('round_completed', auth.userId, {
      session_id: sessionId,
      round_id: roundId,
      verdict: verdict.verdict,
      overall_score: verdict.overall_score,
    })

    logger.info('Verdict generated', { roundId, verdict: verdict.verdict, score: verdict.overall_score })

    return NextResponse.json({ result: roundResult, verdict })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Generate verdict failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
