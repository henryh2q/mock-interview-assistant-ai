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
//
// Tiers run sequentially: Quick first, then Better extends Quick, then Best extends Better.
// Each tier receives the previous tier's answer so responses build on each other.

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

// Each tier instruction describes what to ADD relative to the previous tier's answer.
const TIER_INSTRUCTIONS: Record<TierName, string> = {
  quick:
    'Give a SHORT opening answer: 1-2 sentences only. State your core point immediately. The candidate will say this first to buy time.',
  better:
    'The candidate already said the Quick answer. Now ADD 2-3 sentences that sharpen the point: give a specific example, metric, or CV detail that backs up what was just said. Do NOT repeat the Quick answer — continue from it naturally.',
  best:
    'The candidate already said the Quick + Better answers. Now ADD 2-3 sentences of deeper insight: motivation, broader impact, a concise story, or connection to the role. Do NOT repeat anything already said — only add what makes the answer complete and memorable.',
}

function buildSystemPrompt(
  cvText: string,
  jdText: string,
  extraInfo: string | null | undefined,
  tier: TierName,
  history: Array<{ question: string; answer: string }>,
  priorTierAnswer?: string,   // the answer from the previous tier, to build upon
): string {
  const historyBlock = history.length > 0
    ? `\nCONVERSATION SO FAR:\n${history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join('\n')}\n`
    : ''

  const extraBlock = extraInfo?.trim()
    ? `\nADDITIONAL CONTEXT (stories, achievements, notes the candidate wants to reference):\n${extraInfo.trim().slice(0, 600)}\n`
    : ''

  const priorBlock = priorTierAnswer
    ? `\nWHAT THE CANDIDATE ALREADY SAID:\n"${priorTierAnswer}"\n`
    : ''

  return `You are an expert interview coach. The candidate is in a LIVE interview RIGHT NOW.
Give a confident, natural-sounding answer they can say out loud immediately.

Rules:
- First person — you ARE the candidate
- ${TIER_INSTRUCTIONS[tier]}
- Draw on the candidate's actual CV background and any additional context provided
- No markdown, no bullet points — pure prose
- Output ONLY the words the candidate should speak next — nothing else

CANDIDATE CV:
${cvText.slice(0, 1200)}

JOB DESCRIPTION:
${jdText.slice(0, 800)}
${extraBlock}${priorBlock}${historyBlock}`
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

      // Tiers run sequentially: Quick → Better → Best.
      // Each tier receives the previous tier's answer so it can extend rather than re-answer.
      const usr = buildUserPrompt(question)
      let priorAnswer: string | undefined

      for (const { tier, models } of tierAssignments) {
        if (abort.signal.aborted) break

        const sys = buildSystemPrompt(
          session!.cv_text, session!.jd_text, session!.extra_info,
          tier, history, priorAnswer,
        )

        try {
          // Race all models in this tier — fastest wins
          const answer = await Promise.any(
            models.map((m) => callModel(m, sys, usr, abort.signal))
          )
          send({ tier, model: models[0], answer })
          priorAnswer = priorAnswer ? `${priorAnswer} ${answer}` : answer
        } catch (err) {
          if (abort.signal.aborted) break
          send({ tier, model: models[0], error: err instanceof Error ? err.message : 'Failed' })
          // Don't update priorAnswer on failure — next tier falls back to the last good answer
        }
      }

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
