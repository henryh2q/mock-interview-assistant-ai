import { NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { userRepository } from '@/repositories/user.repository'
import { toApiError, NotFoundError } from '@/lib/errors'

export async function GET() {
  try {
    const auth = await requireAuthSession()
    const user = await userRepository.findById(auth.userId)
    if (!user) throw new NotFoundError('User')
    return NextResponse.json({ user })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json({ error: apiError.message }, { status: apiError.statusCode })
  }
}
