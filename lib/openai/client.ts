import OpenAI from 'openai'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (_client) return _client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable')
  _client = new OpenAI({ apiKey })
  return _client
}

// Lazy proxy
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAIClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const AI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
