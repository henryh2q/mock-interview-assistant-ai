import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { toApiError, NotFoundError, UnauthorizedError } from '@/lib/errors'

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

    return NextResponse.json({ session })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
