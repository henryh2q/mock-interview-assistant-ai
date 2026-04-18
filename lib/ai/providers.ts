/**
 * Model string format: "<provider>/<model-id>"
 * Examples:
 *   openai/gpt-4o-mini
 *   anthropic/claude-opus-4-7
 *   xai/grok-3
 *
 * If no prefix is given, "openai" is assumed (backwards-compat).
 */

export type Provider = 'openai' | 'anthropic' | 'xai'

export interface ParsedModel {
  provider: Provider
  modelId: string
  raw: string
}

export function parseModel(raw: string): ParsedModel {
  const slash = raw.indexOf('/')
  if (slash === -1) {
    return { provider: 'openai', modelId: raw, raw }
  }
  const prefix = raw.slice(0, slash)
  const modelId = raw.slice(slash + 1)

  if (prefix === 'anthropic') return { provider: 'anthropic', modelId, raw }
  if (prefix === 'xai') return { provider: 'xai', modelId, raw }
  return { provider: 'openai', modelId: modelId || raw, raw }
}

// ── Well-known model catalogue (used only for the UI picker) ──────────────────

export interface ModelOption {
  value: string        // the full "provider/model-id" string stored in DB
  label: string
  description: string
  provider: Provider
}

export const MODEL_OPTIONS: ModelOption[] = [
  // OpenAI
  { value: 'openai/gpt-4o-mini',  label: 'GPT-4o Mini',  description: 'Fast & cost-effective',         provider: 'openai' },
  { value: 'openai/gpt-4o',       label: 'GPT-4o',        description: 'Most capable, balanced speed',  provider: 'openai' },
  { value: 'openai/gpt-4-turbo',  label: 'GPT-4 Turbo',   description: 'High quality, slower',          provider: 'openai' },
  // Anthropic
  { value: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fast & efficient',             provider: 'anthropic' },
  { value: 'anthropic/claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', description: 'Balanced quality & speed',    provider: 'anthropic' },
  { value: 'anthropic/claude-opus-4-7',           label: 'Claude Opus 4.7',   description: 'Most powerful Claude model',  provider: 'anthropic' },
  // xAI
  { value: 'xai/grok-3',       label: 'Grok 3',       description: 'xAI — powerful reasoning',  provider: 'xai' },
  { value: 'xai/grok-3-mini',  label: 'Grok 3 Mini',  description: 'xAI — fast & lightweight',  provider: 'xai' },
]

export const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export const ALLOWED_MODEL_VALUES = MODEL_OPTIONS.map((m) => m.value) as [string, ...string[]]
