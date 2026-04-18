import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { getOpenAIClient } from '@/lib/openai/client'
import { toApiError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    await requireAuthSession()

    const formData = await req.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof Blob)) {
      throw new ValidationError('Audio file is required')
    }

    if (audio.size > 25 * 1024 * 1024) {
      throw new ValidationError('Audio file must be under 25MB')
    }

    const file = new File([audio], 'recording.webm', { type: audio.type || 'audio/webm' })

    const openai = getOpenAIClient()
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
