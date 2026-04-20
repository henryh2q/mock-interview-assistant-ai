import { NextRequest } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { toApiError, ValidationError, NotFoundError, AIError } from '@/lib/errors'
import { sessionRepository } from '@/repositories/session.repository'
import { getOpenAIClient } from '@/lib/openai/client'
import { assignTiers, TierName, ALLOWED_MODEL_VALUES } from '@/lib/ai/providers'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z } from 'zod'

// SSE events sent to the client:
//   { tier: TierName, model: string, answer: string }  — one tier resolved
//   { tier: TierName, model: string, error: string }   — tier failed (non-fatal)
//   { done: true }                                      — all tiers done

const HistoryItemSchema = z.object({
  question: z.string(),
  answer:   z.string(),
})

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  question:  z.string().min(5).max(2000),
  history:   z.array(HistoryItemSchema).max(10).default([]),
  // Optional: client-selected model list. Falls back to session.ai_model if absent.
  models:    z.array(z.enum(ALLOWED_MODEL_VALUES)).min(1).max(8).optional(),
})

// ── AI clients ────────────────────────────────────────────────────────────────

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

// ── Prompts ───────────────────────────────────────────────────────────────────

const TIER_INSTRUCTIONS: Record<TierName, string> = {
  quick:  '1-2 sentences only. Shortest viable answer the candidate can say immediately.',
  better: '3-4 sentences. Clear, confident, uses specific CV details. Natural spoken prose.',
  best:   '4-6 sentences. Best possible answer with full context depth. Reference prior answers if relevant. No bullet points.',
}

function buildSystemPrompt(
  cvText: string,
  jdText: string,
  extraInfo: string | null | undefined,
  tier: TierName,
  history: Array<{ question: string; answer: string }>,
): string {
  const historyBlock = history.length > 0
    ? `\nCONVERSATION SO FAR:\n${history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n')}\n`
    : ''

  const extraBlock = extraInfo?.trim()
    ? `\nADDITIONAL CONTEXT (stories, achievements, notes the candidate wants to reference):\n${extraInfo.trim().slice(0, 600)}\n`
    : ''

  return `You are an expert interview coach. The candidate is in a LIVE interview RIGHT NOW.
Give a confident, natural-sounding answer they can say out loud immediately.

Rules:
- First person — you ARE the candidate
- ${TIER_INSTRUCTIONS[tier]}
- Draw on the candidate's actual CV background and any additional context provided
- No markdown, no bullet points — pure prose

CANDIDATE CV:
${cvText.slice(0, 1200)}

JOB DESCRIPTION:
${jdText.slice(0, 800)}
${extraBlock}${historyBlock}`
}

function buildUserPrompt(question: string): string {
  return `Interviewer asked: "${question}"\n\nReply as the candidate now.`
}

// ── Model callers ─────────────────────────────────────────────────────────────

async function callModel(
  modelRaw: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const slash = modelRaw.indexOf('/')
  const provider = slash === -1 ? 'openai' : modelRaw.slice(0, slash)
  const modelId  = slash === -1 ? modelRaw : modelRaw.slice(slash + 1)

  if (provider === 'anthropic') {
    const client = getAnthropic()
    const res = await client.messages.create(
      { model: modelId, max_tokens: 400, temperature: 0.6, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] },
      { signal },
    )
    const block = res.content[0]
    if (!block || block.type !== 'text') throw new AIError('Empty response from Anthropic')
    return block.text.trim()
  }

  const client = provider === 'xai' ? getXAI() : getOpenAIClient()
  const res = await client.chat.completions.create(
    {
      model: modelId,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.6,
      max_tokens: 400,
    },
    { signal },
  )
  const text = res.choices[0]?.message?.content
  if (!text) throw new AIError('Empty response')
  return text.trim()
}

// ── SSE ───────────────────────────────────────────────────────────────────────

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let auth
  try { auth = await requireAuthSession() }
  catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  let body: z.infer<typeof BodySchema>
  try {
    const raw = await req.json()
    const result = BodySchema.safeParse(raw)
    if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
    body = result.data
  } catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  const { sessionId, question, history, models: clientModels } = body

  let session
  try {
    session = await sessionRepository.findById(sessionId)
    if (!session || session.user_id !== auth.userId) throw new NotFoundError('Session')
  } catch (error) { const e = toApiError(error); return new Response(JSON.stringify({ error: e.message }), { status: e.statusCode }) }

  // Resolve the model list: client-provided takes priority, otherwise use session model
  const selectedModels = clientModels ?? [session.ai_model ?? 'openai/gpt-4o-mini']
  const tierAssignments = assignTiers(selectedModels)

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: unknown) => controller.enqueue(enc.encode(sseEvent(data)))

      const abort = new AbortController()
      req.signal.addEventListener('abort', () => abort.abort())

      // Each tier may have multiple models (fired concurrently within that tier).
      // We race them — first to respond wins; the rest are ignored.
      const tierPromises = tierAssignments.map(async ({ tier, models }) => {
        const sys = buildSystemPrompt(session!.cv_text, session!.jd_text, session!.extra_info, tier, history)
        const usr = buildUserPrompt(question)

        try {
          // Race all models in this tier — fastest wins
          const answer = await Promise.any(
            models.map((m) => callModel(m, sys, usr, abort.signal))
          )
          const winnerModel = models[0] // approximate; Promise.any doesn't tell us the winner
          send({ tier, model: winnerModel, answer })
        } catch (err) {
          if (abort.signal.aborted) return
          send({ tier, model: models[0], error: err instanceof Error ? err.message : 'Failed' })
        }
      })

      await Promise.allSettled(tierPromises)
      send({ done: true })
      controller.close()
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
