import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { messageRepository } from '@/repositories/message.repository'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { userRepository } from '@/repositories/user.repository'
import { aiService } from '@/services/ai.service'
import { rateLimitService } from '@/services/rate-limit.service'
import { analyticsService } from '@/services/analytics.service'
import { toApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { RoundType } from '@/types/database'
import { z } from 'zod'

const EvaluateSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  question_message_id: z.string().uuid(),
})

type RouteParams = { params: Promise<{ id: string; roundId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthSession()
    const { id: sessionId, roundId } = await params

    const body = await req.json()
    const parsed = EvaluateSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const { answer, question_message_id } = parsed.data

    if (answer.trim().length < 20) {
      throw new ValidationError('Answer must be at least 20 characters')
    }

    const [session, round, questionMessage, user] = await Promise.all([
      sessionRepository.findById(sessionId),
      roundRepository.findById(roundId),
      messageRepository.create({
        round_id: roundId,
        session_id: sessionId,
        role: 'candidate',
        content: answer,
        question_index: null,
      }),
      userRepository.findById(auth.userId),
    ])

    if (!session) throw new NotFoundError('Session')
    if (!round) throw new NotFoundError('Round')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    void questionMessage // Already saved above

    // Get the original question content
    const questionMsg = await messageRepository.findByRoundId(roundId).then(
      (msgs) => msgs.find((m) => m.id === question_message_id),
    )
    const questionContent = questionMsg?.content ?? 'Unknown question'

    await rateLimitService.checkAICallLimit(auth.userId)

    const aiModel = session.ai_model ?? undefined

    // Step 1: Evaluate answer
    const evaluation = await aiService.evaluateAnswer({
      roundType: round.type as RoundType,
      question: questionContent,
      answer,
      jdText: session.jd_text,
      roundTitle: round.title,
      focusAreas: round.focus_areas,
      englishLevel: user?.english_level ?? 'intermediate',
      aiModel,
    })

    await rateLimitService.incrementAICallCount(auth.userId)
    await rateLimitService.checkAICallLimit(auth.userId)

    // Step 2: Generate best answer
    const bestAnswerResult = await aiService.generateBestAnswer({
      question: questionContent,
      jdText: session.jd_text,
      cvText: session.cv_text,
      roundTitle: round.title,
      focusAreas: round.focus_areas,
      candidateAnswer: answer,
      evaluation: {
        score: evaluation.score,
        weaknesses: evaluation.weaknesses,
        missing_points: evaluation.missing_points,
      },
      englishLevel: user?.english_level ?? 'intermediate',
      aiModel,
    })

    await rateLimitService.incrementAICallCount(auth.userId)

    // Save evaluation + best answer
    const savedEvaluation = await evaluationRepository.create({
      message_id: questionMessage.id,
      round_id: roundId,
      question_content: questionContent,
      evaluation,
      best_answer: bestAnswerResult.best_answer,
    })

    await analyticsService.track('answer_submitted', auth.userId, {
      session_id: sessionId,
      round_id: roundId,
      score: evaluation.score,
    })

    logger.info('Answer evaluated', { roundId, score: evaluation.score })

    return NextResponse.json({
      candidate_message_id: questionMessage.id,
      evaluation: savedEvaluation,
      best_answer: bestAnswerResult,
    })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Evaluate answer failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
