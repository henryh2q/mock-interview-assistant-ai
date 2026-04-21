import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { toApiError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { callProvider } from '@/lib/ai/call'
import { buildPrepSystemPrompt, buildPrepUserPrompt } from '@/prompts/prep'
import { logger } from '@/lib/logger'
import { type PrepQAItem } from '@/types/database'

const PREP_MODEL = 'openai/gpt-4-turbo'

const BodySchema = z.object({
  language: z.enum(['english', 'vietnamese']).optional(),
})

const PrepItemSchema = z.object({
  category: z.enum(['hr', 'technical', 'culture_fit']),
  question: z.string(),
  answer: z.string(),
})

const PrepResponseSchema = z.object({
  items: z.array(PrepItemSchema),
})

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

async function resolveSession(sessionId: string, userId: string) {
  const session = await sessionRepository.findById(sessionId)
  if (!session) throw new NotFoundError('Session')
  if (session.user_id !== userId) throw new UnauthorizedError()
  return session
}

// GET — return cached prep Q&A if it exists
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthSession()
    const { id: sessionId } = await params
    const session = await resolveSession(sessionId, auth.userId)
    return NextResponse.json({ items: session.prep_qa ?? null })
  } catch (error) {
    const e = toApiError(error)
    return NextResponse.json({ error: e.message }, { status: e.statusCode })
  }
}

// POST — generate fresh prep Q&A, stream items back, persist to DB when done
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let auth
  try { auth = await requireAuthSession() }
  catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  const { id: sessionId } = await params

  let language: 'english' | 'vietnamese' = 'english'
  try {
    const raw = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) throw new ValidationError('Invalid input')
    language = parsed.data.language ?? 'english'
  } catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  let session
  try { session = await resolveSession(sessionId, auth.userId) }
  catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) => controller.enqueue(enc.encode(sseEvent(data)))

      try {
        const sys = buildPrepSystemPrompt(language)
        const usr = buildPrepUserPrompt(session!.jd_text, session!.cv_text, session!.extra_info)

        logger.info('Generating prep Q&A', { sessionId, model: PREP_MODEL, language })
        const raw = await callProvider(sys, usr, PREP_MODEL)

        let parsed: unknown
        try { parsed = JSON.parse(raw) } catch {
          send({ error: 'AI returned invalid JSON — please retry' })
          return
        }

        const result = PrepResponseSchema.safeParse(parsed)
        if (!result.success) {
          send({ error: 'Unexpected AI response format — please retry' })
          return
        }

        const items = result.data.items as PrepQAItem[]

        // Persist to DB
        await sessionRepository.updatePrepQA(sessionId, items)
        logger.info('Prep Q&A stored', { sessionId, count: items.length })

        // Stream items to client
        for (const item of items) {
          send({ item })
        }
        send({ done: true })
      } catch (err) {
        logger.error('Prep generation failed', err as Error, { sessionId })
        send({ error: err instanceof Error ? err.message : 'Generation failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
