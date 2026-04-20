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
  speedRank: number    // lower = faster; used to auto-assign Quick/Better/Best tiers
}

export const MODEL_OPTIONS: ModelOption[] = [
  // OpenAI — ranked by typical latency
  { value: 'openai/gpt-4o-mini',  label: 'GPT-4o Mini',  description: 'Fast & cost-effective',         provider: 'openai',    speedRank: 1 },
  { value: 'openai/gpt-4o',       label: 'GPT-4o',        description: 'Most capable, balanced speed',  provider: 'openai',    speedRank: 3 },
  { value: 'openai/gpt-4-turbo',  label: 'GPT-4 Turbo',   description: 'High quality, slower',          provider: 'openai',    speedRank: 5 },
  // Anthropic
  { value: 'anthropic/claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  description: 'Fast & efficient',            provider: 'anthropic', speedRank: 2 },
  { value: 'anthropic/claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', description: 'Balanced quality & speed',    provider: 'anthropic', speedRank: 4 },
  { value: 'anthropic/claude-opus-4-7',           label: 'Claude Opus 4.7',   description: 'Most powerful Claude model',  provider: 'anthropic', speedRank: 6 },
  // xAI
  { value: 'xai/grok-3-mini',  label: 'Grok 3 Mini',  description: 'xAI — fast & lightweight',  provider: 'xai', speedRank: 2 },
  { value: 'xai/grok-3',       label: 'Grok 3',        description: 'xAI — powerful reasoning',  provider: 'xai', speedRank: 4 },
]

export const DEFAULT_MODEL = 'openai/gpt-4o-mini'

export const ALLOWED_MODEL_VALUES = MODEL_OPTIONS.map((m) => m.value) as [string, ...string[]]

// ── Tier assignment ───────────────────────────────────────────────────────────

export type TierName = 'quick' | 'better' | 'best'

export interface TierAssignment {
  tier: TierName
  models: string[]   // one or more models sharing this tier (all fired concurrently)
  label: string      // display label e.g. "Quick" or "Quick (×2)"
}

/**
 * Given a list of selected model values (1–N), sort them by speedRank and
 * assign them to Quick / Better / Best tiers.
 *
 * Rules:
 * - Sort ascending by speedRank (fastest first).
 * - 1 model  → all three tiers get that model (deduped at call time).
 * - 2 models → fastest → Quick+Better, slowest → Best.
 * - 3 models → fastest → Quick, middle → Better, slowest → Best.
 * - 4+ models → fastest → Quick, middle group → Better (fired concurrently), slowest → Best.
 *
 * Models with equal speedRank are grouped into the same tier.
 */
export function assignTiers(selectedValues: string[]): TierAssignment[] {
  if (selectedValues.length === 0) return []

  const resolved = selectedValues
    .map((v) => MODEL_OPTIONS.find((m) => m.value === v))
    .filter((m): m is ModelOption => m !== undefined)

  // Sort fastest → slowest
  const sorted = [...resolved].sort((a, b) => a.speedRank - b.speedRank)

  if (sorted.length === 1) {
    const m = sorted[0]
    return [
      { tier: 'quick',  models: [m.value], label: 'Quick'  },
      { tier: 'better', models: [m.value], label: 'Better' },
      { tier: 'best',   models: [m.value], label: 'Best'   },
    ]
  }

  if (sorted.length === 2) {
    return [
      { tier: 'quick',  models: [sorted[0].value], label: 'Quick'  },
      { tier: 'better', models: [sorted[0].value], label: 'Better' },
      { tier: 'best',   models: [sorted[1].value], label: 'Best'   },
    ]
  }

  // 3+ models: split into thirds, group equal-rank into same tier
  const quickGroup  = [sorted[0]]
  const betterGroup: ModelOption[] = []
  const bestGroup   = [sorted[sorted.length - 1]]

  // Middle models go to "better" (or share quick rank)
  for (let i = 1; i < sorted.length - 1; i++) {
    if (sorted[i].speedRank === sorted[0].speedRank) {
      quickGroup.push(sorted[i])
    } else {
      betterGroup.push(sorted[i])
    }
  }

  const betterModels = betterGroup.length > 0 ? betterGroup : quickGroup

  return [
    {
      tier: 'quick',
      models: quickGroup.map((m) => m.value),
      label: quickGroup.length > 1 ? `Quick (×${quickGroup.length})` : 'Quick',
    },
    {
      tier: 'better',
      models: betterModels.map((m) => m.value),
      label: betterModels.length > 1 ? `Better (×${betterModels.length})` : 'Better',
    },
    {
      tier: 'best',
      models: bestGroup.map((m) => m.value),
      label: 'Best',
    },
  ]
}
