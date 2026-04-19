import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { callProvider } from '@/lib/ai/call'
import { ReadingGuideSchema } from '@/types/ai'
import { buildReadingGuideSystemPrompt, buildReadingGuideUserPrompt } from '@/prompts/best-answer'
import { toApiError, ValidationError } from '@/lib/errors'
import { z } from 'zod'

const BodySchema = z.object({
  text: z.string().min(20).max(2000),
  model: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await requireAuthSession()

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const raw = await callProvider(
      buildReadingGuideSystemPrompt(),
      buildReadingGuideUserPrompt(parsed.data.text),
      parsed.data.model ?? 'openai/gpt-4o-mini',
    )

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      throw new ValidationError('AI returned invalid JSON')
    }

    const guide = ReadingGuideSchema.parse(data)
    return NextResponse.json(guide)
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
