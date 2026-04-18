import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { userRepository } from '@/repositories/user.repository'
import { analyticsService } from '@/services/analytics.service'
import { buildAuthCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { toApiError, ValidationError } from '@/lib/errors'
import { normalizePhone, isValidPhone } from '@/lib/utils'

const LoginSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)

    if (!parsed.success) {
      throw new ValidationError('Invalid request body')
    }

    const phone = normalizePhone(parsed.data.phone)

    if (!isValidPhone(phone)) {
      throw new ValidationError('Phone number must be 10–15 digits')
    }

    logger.info('Login attempt', { phone: phone.slice(0, 4) + '****' })

    const user = await userRepository.upsertByPhone(phone)

    await analyticsService.track('user_login', user.id, { is_new: !user.name })

    const cookie = buildAuthCookie({ userId: user.id, phone: user.phone })

    const response = NextResponse.json({ user })
    response.cookies.set(cookie.name, cookie.value, cookie.options)

    logger.info('Login successful', { userId: user.id })
    return response
  } catch (error) {
    const apiError = toApiError(error)
    logger.error('Login failed', error as Error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('mia_user', '', { maxAge: 0, path: '/' })
  return response
}
