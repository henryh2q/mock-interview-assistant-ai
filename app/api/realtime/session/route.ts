import { NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { getOpenAIClient } from '@/lib/openai/client'
import { toApiError } from '@/lib/errors'

// Creates a short-lived ephemeral token for the OpenAI Realtime API.
// The token is used client-side to open a WebSocket directly to OpenAI,
// so the API key is never exposed to the browser.
export async function POST() {
  try {
    await requireAuthSession()

    const openai = getOpenAIClient()
    const session = await openai.beta.realtime.sessions.create({
      model: 'gpt-4o-mini-realtime-preview',
      modalities: ['text', 'audio'],
      instructions:
        'You are a transcription assistant. Transcribe everything you hear accurately and concisely.',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
      },
    })

    return NextResponse.json({ client_secret: session.client_secret })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
