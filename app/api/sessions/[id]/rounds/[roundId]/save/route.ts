import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { savedAnswerRepository } from '@/repositories/saved-answer.repository'
import { messageRepository } from '@/repositories/message.repository'
import { roundRepository } from '@/repositories/round.repository'
import { analyticsService } from '@/services/analytics.service'
import { toApiError, NotFoundError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { RoundType } from '@/types/database'
import { z } from 'zod'

const SaveSchema = z.object({
  evaluation_id: z.string().uuid(),
})

type RouteParams = { params: Promise<{ id: string; roundId: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthSession()
    const { roundId } = await params

    const body = await req.json()
    const parsed = SaveSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('Invalid input')

    const { evaluation_id } = parsed.data

    // Check if already saved
    const existing = await savedAnswerRepository.findByEvaluationId(evaluation_id, auth.userId)
    if (existing) {
      return NextResponse.json({ saved_answer: existing, already_saved: true })
    }

    const evaluation = await evaluationRepository.findById(evaluation_id)
    if (!evaluation || !evaluation.best_answer) throw new NotFoundError('Evaluation')

    const round = await roundRepository.findById(roundId)
    if (!round) throw new NotFoundError('Round')

    // Get the candidate's answer — stored in the message whose id is evaluation.message_id
    const messages = await messageRepository.findByRoundId(roundId)
    const candidateMsg = messages.find(
      (m) => m.role === 'candidate' && m.question_index === messages.find((q) => q.id === evaluation.message_id)?.question_index
    )
    const candidateAnswer = candidateMsg?.content ?? ''

    const savedAnswer = await savedAnswerRepository.create({
      user_id: auth.userId,
      evaluation_id,
      question_content: evaluation.question_content,
      candidate_answer: candidateAnswer,
      best_answer: evaluation.best_answer,
      round_type: round.type as RoundType,
      tags: round.focus_areas.slice(0, 3),
    })

    await analyticsService.track('answer_saved', auth.userId, {
      round_id: roundId,
      evaluation_id,
    })

    logger.info('Answer saved to library', { userId: auth.userId, evaluationId: evaluation_id })
    return NextResponse.json({ saved_answer: savedAnswer, already_saved: false })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
