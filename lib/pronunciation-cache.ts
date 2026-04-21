// Module-level cache shared across all WordPronounce instances in the page.
// Keys are lowercase words; values are pronunciation data or a pending Promise.

export interface PronunciationData {
  ipa: string
  syllables: string
  example: string
}

type CacheEntry = PronunciationData | Promise<PronunciationData | null>

const cache = new Map<string, CacheEntry>()

export function getCached(word: string): PronunciationData | null {
  const entry = cache.get(word.toLowerCase())
  if (!entry || entry instanceof Promise) return null
  return entry
}

export function isPending(word: string): boolean {
  const entry = cache.get(word.toLowerCase())
  return entry instanceof Promise
}

async function fetchPronunciation(word: string): Promise<PronunciationData | null> {
  try {
    const res = await fetch('/api/pronunciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word }),
    })
    if (!res.ok) return null
    return await res.json() as PronunciationData
  } catch {
    return null
  }
}

// Prefetch a single word — idempotent, safe to call multiple times.
export function prefetch(word: string): void {
  const key = word.toLowerCase()
  if (cache.has(key)) return

  const promise = fetchPronunciation(key).then((data) => {
    if (data) cache.set(key, data)
    else cache.delete(key)
    return data
  })

  cache.set(key, promise)
}

// Prefetch all words in an answer text, skipping short/punctuation tokens.
export function prefetchAnswer(text: string): void {
  const words = text.split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, '').length > 2)
  for (const word of words) prefetch(word.replace(/[^a-zA-Z']/g, ''))
}
