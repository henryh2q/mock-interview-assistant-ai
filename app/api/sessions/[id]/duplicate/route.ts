import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { rateLimitService } from '@/services/rate-limit.service'
import { analyticsService } from '@/services/analytics.service'
import { toApiError, NotFoundError, UnauthorizedError } from '@/lib/errors'
import { ALLOWED_MODEL_VALUES } from '@/lib/ai/providers'
import { logger } from '@/lib/logger'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

const DuplicateSchema = z.object({
  ai_model: z.enum(ALLOWED_MODEL_VALUES).nullable().optional(),
  name: z.string().max(200).nullable().optional(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthSession()
    const { id } = await params

    const source = await sessionRepository.findById(id)
    if (!source) throw new NotFoundError('Session')
    if (source.user_id !== auth.userId) throw new UnauthorizedError()

    await rateLimitService.checkSessionLimit(auth.userId)

    const body = await req.json().catch(() => ({}))
    const parsed = DuplicateSchema.safeParse(body)
    const overrides = parsed.success ? parsed.data : {}

    const newSession = await sessionRepository.create({
      user_id: auth.userId,
      name: overrides.name ?? `${source.name ?? 'Session'} (copy)`,
      jd_text: source.jd_text,
      cv_text: source.cv_text,
      extra_info: source.extra_info,
      jd_file_path: source.jd_file_path,
      cv_file_path: source.cv_file_path,
      ai_model: overrides.ai_model !== undefined ? overrides.ai_model : source.ai_model,
      shuffle_questions: source.shuffle_questions,
    })

    await rateLimitService.incrementSessionCount(auth.userId)
    await analyticsService.track('session_duplicated', auth.userId, {
      source_id: id,
      new_id: newSession.id,
    })

    logger.info('Session duplicated', { sourceId: id, newId: newSession.id })
    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Duplicate session failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
