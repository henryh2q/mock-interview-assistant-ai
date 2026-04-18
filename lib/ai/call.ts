import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { AIError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { parseModel } from './providers'

// ── Client singletons ─────────────────────────────────────────────────────────

let _openai: OpenAI | null = null
let _anthropic: Anthropic | null = null
let _xai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (_openai) return _openai
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new AIError('Missing OPENAI_API_KEY environment variable', false)
  _openai = new OpenAI({ apiKey })
  return _openai
}

function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new AIError('Missing ANTHROPIC_API_KEY environment variable', false)
  _anthropic = new Anthropic({ apiKey })
  return _anthropic
}

function getXAI(): OpenAI {
  if (_xai) return _xai
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new AIError('Missing XAI_API_KEY environment variable', false)
  _xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' })
  return _xai
}

// ── Unified call ──────────────────────────────────────────────────────────────

const NON_RETRYABLE_STATUS = [400, 401, 403, 429]

export async function callProvider(
  systemPrompt: string,
  userPrompt: string,
  modelRaw: string,
): Promise<string> {
  const { provider, modelId } = parseModel(modelRaw)

  logger.info('AI call starting', { provider, model: modelId })

  try {
    if (provider === 'anthropic') {
      return await callAnthropic(systemPrompt, userPrompt, modelId)
    }
    // openai and xai both use the OpenAI-compatible SDK
    const client = provider === 'xai' ? getXAI() : getOpenAI()
    return await callOpenAICompat(client, systemPrompt, userPrompt, modelId)
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status && NON_RETRYABLE_STATUS.includes(status)) {
      if (status === 429) {
        throw new AIError(`${provider} quota exceeded. Please check your billing.`, false)
      }
      throw new AIError(`AI request rejected (${status}) — please check your API key.`, false)
    }
    throw err
  }
}

async function callOpenAICompat(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  })
  const raw = response.choices[0]?.message?.content
  if (!raw) throw new AIError('Empty response from AI')
  return raw
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const client = getAnthropic()
  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    temperature: 0.4,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const block = response.content[0]
  if (!block || block.type !== 'text') throw new AIError('Empty response from Anthropic')
  return block.text
}
