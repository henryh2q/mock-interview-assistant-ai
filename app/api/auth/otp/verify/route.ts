import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { toApiError, ValidationError } from '@/lib/errors'
import { normalizePhone, isValidPhone } from '@/lib/utils'
import { buildAuthCookie } from '@/lib/auth'
import { userRepository } from '@/repositories/user.repository'
import { analyticsService } from '@/services/analytics.service'
import { logger } from '@/lib/logger'
import twilio from 'twilio'

const BodySchema = z.object({
  phone: z.string().min(1),
  code:  z.string().length(6, 'OTP must be 6 digits'),
})

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return twilio(sid, token)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid request body')

    const phone = normalizePhone(parsed.data.phone)
    if (!isValidPhone(phone)) throw new ValidationError('Phone number must be 10–15 digits')

    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!serviceSid) throw new Error('TWILIO_VERIFY_SERVICE_SID not configured')

    const client = getTwilioClient()
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: `+${phone}`,
      code: parsed.data.code,
    })

    if (check.status !== 'approved') {
      return NextResponse.json({ error: 'Incorrect or expired code. Please try again.' }, { status: 400 })
    }

    const user = await userRepository.upsertByPhone(phone)
    await analyticsService.track('user_login', user.id, { is_new: !user.name, method: 'otp' })

    const cookie = buildAuthCookie({ userId: user.id, phone: user.phone })
    const response = NextResponse.json({ user })
    response.cookies.set(cookie.name, cookie.value, cookie.options)

    logger.info('OTP login successful', { userId: user.id })
    return response
  } catch (error) {
    const e = toApiError(error)
    logger.error('OTP verify failed', error as Error)
    return NextResponse.json({ error: e.message }, { status: e.statusCode })
  }
}
