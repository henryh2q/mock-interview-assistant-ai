import { NextRequest } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { toApiError, ValidationError } from '@/lib/errors'
import { getOpenAIClient } from '@/lib/openai/client'
import { z } from 'zod'

const BodySchema = z.object({
  word: z.string().min(1).max(100).trim(),
})

export async function POST(req: NextRequest) {
  try { await requireAuthSession() }
  catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  let word: string
  try {
    const raw = await req.json()
    const result = BodySchema.safeParse(raw)
    if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
    word = result.data.word
  } catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  try {
    const client = getOpenAIClient()
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a pronunciation dictionary. Given a word, respond with ONLY a JSON object: {"ipa": "...", "syllables": "...", "example": "..."}. IPA uses standard notation like /ˈθɝː.ə.li/. No markdown, no explanation.',
        },
        { role: 'user', content: word },
      ],
      temperature: 0,
      max_tokens: 80,
      response_format: { type: 'json_object' },
    })

    const text = res.choices[0]?.message?.content ?? '{}'
    const data = JSON.parse(text) as { ipa?: string; syllables?: string; example?: string }

    return new Response(JSON.stringify({
      word,
      ipa: data.ipa ?? '',
      syllables: data.syllables ?? '',
      example: data.example ?? '',
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to get pronunciation' }), { status: 500 })
  }
}
