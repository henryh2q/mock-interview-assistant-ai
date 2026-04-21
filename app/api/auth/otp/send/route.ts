import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { toApiError, ValidationError } from '@/lib/errors'
import { normalizePhone, isValidPhone } from '@/lib/utils'
import { logger } from '@/lib/logger'
import twilio from 'twilio'

const BodySchema = z.object({
  phone: z.string().min(1),
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
    if (!parsed.success) throw new ValidationError('Invalid request body')

    const phone = normalizePhone(parsed.data.phone)
    if (!isValidPhone(phone)) throw new ValidationError('Phone number must be 10–15 digits')

    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID
    if (!serviceSid) throw new Error('TWILIO_VERIFY_SERVICE_SID not configured')

    const client = getTwilioClient()
    await client.verify.v2.services(serviceSid).verifications.create({
      to: `+${phone}`,
      channel: 'sms',
    })

    logger.info('OTP sent', { phone: phone.slice(0, 4) + '****' })
    return NextResponse.json({ success: true })
  } catch (error) {
    const e = toApiError(error)
    logger.error('OTP send failed', error as Error)
    return NextResponse.json({ error: e.message }, { status: e.statusCode })
  }
}
