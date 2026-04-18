import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { getOpenAIClient } from '@/lib/openai/client'
import { toApiError, ValidationError } from '@/lib/errors'
import { z } from 'zod'

const SpeakSchema = z.object({
  text: z.string().min(1).max(4096),
})

export async function POST(req: NextRequest) {
  try {
    await requireAuthSession()

    const body = await req.json()
    const parsed = SpeakSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const openai = getOpenAIClient()
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx',
      input: parsed.data.text,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
