import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { rateLimitService } from '@/services/rate-limit.service'
import { analyticsService } from '@/services/analytics.service'
import { logger } from '@/lib/logger'
import { toApiError, ValidationError } from '@/lib/errors'
import { generateSessionName, extractJobTitle } from '@/lib/utils'
import { z } from 'zod'

import { ALLOWED_MODEL_VALUES } from '@/lib/ai/providers'

const CreateSessionSchema = z.object({
  jd_text: z.string().min(1, 'Job description is required'),
  cv_text: z.string().min(1, 'CV is required'),
  extra_info: z.string().max(500).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  jd_file_path: z.string().optional().nullable(),
  cv_file_path: z.string().optional().nullable(),
  ai_model: z.enum(ALLOWED_MODEL_VALUES).optional().nullable(),
  shuffle_questions: z.boolean().optional(),
}).refine(
  (data) => data.cv_text.length >= 50 || data.cv_file_path,
  { message: 'CV text is too short — please paste more content', path: ['cv_text'] },
).refine(
  (data) => data.jd_text.length >= 50 || data.jd_file_path,
  { message: 'Job description text is too short — please paste more content', path: ['jd_text'] },
)

export async function GET() {
  try {
    const auth = await requireAuthSession()
    const sessions = await sessionRepository.findByUserId(auth.userId)
    return NextResponse.json({ sessions })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthSession()

    await rateLimitService.checkSessionLimit(auth.userId)

    const body = await req.json()
    const parsed = CreateSessionSchema.safeParse(body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input — please check your CV and JD')
    }

    const { jd_text, cv_text, extra_info, name, jd_file_path, cv_file_path, ai_model, shuffle_questions } = parsed.data

    const sessionName =
      name || generateSessionName(extractJobTitle(jd_text))

    const session = await sessionRepository.create({
      user_id: auth.userId,
      name: sessionName,
      jd_text,
      cv_text,
      extra_info,
      jd_file_path,
      cv_file_path,
      ai_model: ai_model ?? null,
      shuffle_questions: shuffle_questions ?? false,
    })

    await rateLimitService.incrementSessionCount(auth.userId)
    await analyticsService.track('session_created', auth.userId, { session_id: session.id })

    logger.info('Session created', { sessionId: session.id, userId: auth.userId })
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Create session failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
