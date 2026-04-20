import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { toApiError, ValidationError, NotFoundError, AIError } from '@/lib/errors'
import { sessionRepository } from '@/repositories/session.repository'
import { DEFAULT_MODEL, parseModel } from '@/lib/ai/providers'
import { getOpenAIClient } from '@/lib/openai/client'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z } from 'zod'

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  question: z.string().min(5).max(2000),
})

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new AIError('Missing ANTHROPIC_API_KEY', false)
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

let _xai: OpenAI | null = null
function getXAI(): OpenAI {
  if (_xai) return _xai
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new AIError('Missing XAI_API_KEY', false)
  _xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' })
  return _xai
}

async function generatePlainTextAnswer(
  systemPrompt: string,
  userPrompt: string,
  modelRaw: string,
): Promise<string> {
  const { provider, modelId } = parseModel(modelRaw)

  if (provider === 'anthropic') {
    const client = getAnthropic()
    const res = await client.messages.create({
      model: modelId,
      max_tokens: 512,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })
    const block = res.content[0]
    if (!block || block.type !== 'text') throw new AIError('Empty response from Anthropic')
    return block.text
  }

  const client = provider === 'xai' ? getXAI() : getOpenAIClient()
  const res = await client.chat.completions.create({
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 512,
    // No response_format — we want plain text, not JSON
  })
  const text = res.choices[0]?.message?.content
  if (!text) throw new AIError('Empty response from AI')
  return text
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthSession()

    const body = await req.json()
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid input')
    }

    const { sessionId, question } = parsed.data

    const session = await sessionRepository.findById(sessionId)
    if (!session || session.user_id !== auth.userId) {
      throw new NotFoundError('Session')
    }

    const model = session.ai_model ?? DEFAULT_MODEL

    const systemPrompt = `You are an expert interview coach helping a candidate in a live job interview.
Give a confident, natural-sounding answer the candidate can say out loud RIGHT NOW.

Rules:
- Write in first person (you ARE the candidate)
- 3–5 sentences max; slightly longer only for complex technical questions
- Use the candidate's actual background and experiences from their CV
- No bullet points, no markdown — pure prose that sounds natural when spoken
- Be specific and confident

CANDIDATE CV:
${session.cv_text.slice(0, 1200)}

JOB DESCRIPTION:
${session.jd_text.slice(0, 800)}`

    const userPrompt = `Interviewer asked: "${question}"

Reply as the candidate now.`

    const answer = await generatePlainTextAnswer(systemPrompt, userPrompt, model)

    return NextResponse.json({ answer })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
