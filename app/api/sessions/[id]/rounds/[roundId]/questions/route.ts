import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { messageRepository } from '@/repositories/message.repository'
import { aiService } from '@/services/ai.service'
import { rateLimitService } from '@/services/rate-limit.service'
import { analyticsService } from '@/services/analytics.service'
import { toApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { RoundType } from '@/types/database'

type RouteParams = { params: Promise<{ id: string; roundId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
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

    const body = await req.json()
    const questionIndex: number = body.question_index ?? 0
    const previousRoundSummary: string | null = body.previous_round_summary ?? null

    if (questionIndex >= round.question_count) {
      throw new ValidationError('All questions have been asked')
    }

    // Fetch existing messages to extract previous questions
    const messages = await messageRepository.findByRoundId(roundId)
    const previousQuestions = messages
      .filter((m) => m.role === 'interviewer')
      .map((m) => m.content)

    await rateLimitService.checkAICallLimit(auth.userId)

    const focusAreas = session.shuffle_questions
      ? [...round.focus_areas].sort(() => Math.random() - 0.5)
      : round.focus_areas

    const aiQuestion = await aiService.generateQuestion({
      roundType: round.type as RoundType,
      jdText: session.jd_text,
      cvText: session.cv_text,
      roundTitle: round.title,
      focusAreas,
      previousQuestions,
      questionIndex,
      totalQuestions: round.question_count,
      previousRoundSummary,
      aiModel: session.ai_model ?? undefined,
    })

    await rateLimitService.incrementAICallCount(auth.userId)

    // Activate round on first question
    if (round.status === 'pending') {
      await roundRepository.updateStatus(roundId, 'active')
      await analyticsService.track('round_started', auth.userId, {
        session_id: sessionId,
        round_id: roundId,
        round_type: round.type,
      })
    }

    // Persist the interviewer message
    const message = await messageRepository.create({
      round_id: roundId,
      session_id: sessionId,
      role: 'interviewer',
      content: aiQuestion.question,
      question_index: questionIndex,
    })

    logger.info('Question generated', { roundId, questionIndex })
    return NextResponse.json({ message, context_hint: aiQuestion.context_hint })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Generate question failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
