import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { toApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { ALLOWED_MODEL_VALUES } from '@/lib/ai/providers'
import { z } from 'zod'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
) {
  try {
    const auth = await requireAuthSession()
    const { id } = await params

    const session = await sessionRepository.findById(id)
    if (!session) throw new NotFoundError('Session')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    return NextResponse.json({ session })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}

const PatchSchema = z.object({
  extra_info: z.string().max(500).nullable().optional(),
  jd_text: z.string().min(50).optional(),
  cv_text: z.string().min(50).optional(),
  ai_model: z.enum(ALLOWED_MODEL_VALUES).nullable().optional(),
  name: z.string().max(200).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams,
) {
  try {
    const auth = await requireAuthSession()
    const { id } = await params

    const session = await sessionRepository.findById(id)
    if (!session) throw new NotFoundError('Session')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    const body = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    await sessionRepository.updateContent(id, parsed.data)

    return NextResponse.json({ ok: true })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
