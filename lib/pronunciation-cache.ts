export interface PronunciationData {
  ipa: string
  syllables: string
  example: string
}

const cache = new Map<string, PronunciationData>()

export function getCached(word: string): PronunciationData | null {
  return cache.get(word.toLowerCase()) ?? null
}

export function setCached(word: string, data: PronunciationData): void {
  cache.set(word.toLowerCase(), data)
}
