import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { aiService } from '@/services/ai.service'
import { rateLimitService } from '@/services/rate-limit.service'
import { toApiError, NotFoundError, UnauthorizedError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { RoundType } from '@/types/database'

const ConfirmPlanSchema = z.object({
  rounds: z.array(
    z.object({
      type: z.enum(['hr', 'technical', 'culture_fit']),
      title: z.string(),
      duration_min: z.number(),
      question_count: z.number(),
      focus_areas: z.array(z.string()),
    }),
  ),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthSession()
    const { id } = await params

    const session = await sessionRepository.findById(id)
    if (!session) throw new NotFoundError('Session')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    await rateLimitService.checkAICallLimit(auth.userId)

    const plan = await aiService.generateInterviewPlan({
      jdText: session.jd_text,
      cvText: session.cv_text,
      extraInfo: session.extra_info,
      aiModel: session.ai_model ?? undefined,
    })

    await rateLimitService.incrementAICallCount(auth.userId)

    return NextResponse.json({ plan })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Generate plan failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthSession()
    const { id } = await params

    const session = await sessionRepository.findById(id)
    if (!session) throw new NotFoundError('Session')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    const body = await req.json()
    const parsed = ConfirmPlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid plan data' }, { status: 400 })
    }

    // Remove existing rounds (in case of re-confirm)
    await roundRepository.deleteBySessionId(id)

    const rounds = await roundRepository.createMany(
      parsed.data.rounds.map((r, idx) => ({
        session_id: id,
        type: r.type as RoundType,
        title: r.title,
        order_index: idx,
        duration_min: r.duration_min,
        question_count: Math.min(r.question_count, 10),
        focus_areas: r.focus_areas,
      })),
    )

    await sessionRepository.updateStatus(id, 'active')

    logger.info('Plan confirmed', { sessionId: id, rounds: rounds.length })
    return NextResponse.json({ rounds })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Confirm plan failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
