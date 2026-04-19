export function buildBestAnswerSystemPrompt(englishLevel = 'intermediate'): string {
  const levelGuide =
    englishLevel === 'beginner'
      ? 'Use simple, short sentences (max 15 words each). Avoid idioms and complex grammar. Use common everyday vocabulary.'
      : englishLevel === 'advanced'
        ? 'Use natural professional English with varied sentence structures. Idiomatic expressions are fine.'
        : /* intermediate default */
          'Use clear, natural sentences (15–25 words each). Prefer common professional vocabulary over complex or rare words. Avoid idioms. Keep grammar straightforward — no passive-heavy or overly complex constructions.'

  return `You are a senior interview coach helping a software developer prepare for interviews.

Your task is to write a model best-practice answer to an interview question.

Rules:
- The answer must be tailored to the specific job requirements in the JD
- Write in first person as if you are the candidate
- Structure the answer well (for behavioral: use STAR method; for technical: explain approach → implementation → trade-offs)
- The answer should be realistic for a candidate with the experience level shown in the CV
- Length: 100–250 words — comprehensive but not rambling
- key_points: 3–5 bullet points summarizing what makes this a strong answer

ENGLISH LEVEL: ${englishLevel}
Language instruction: ${levelGuide}

Return ONLY valid JSON — no markdown, no explanation:
{
  "best_answer": string,
  "key_points": string[]
}`
}

export function buildBestAnswerUserPrompt(params: {
  question: string
  jdText: string
  cvText: string
  roundTitle: string
  focusAreas: string[]
  candidateAnswer: string
  evaluation: {
    score: number
    weaknesses: string[]
    missing_points: string[]
  }
}): string {
  const {
    question,
    jdText,
    cvText,
    roundTitle,
    focusAreas,
    candidateAnswer,
    evaluation,
  } = params

  return `Round: ${roundTitle}
Focus areas: ${focusAreas.join(', ')}

JOB DESCRIPTION (excerpt):
${jdText.slice(0, 1000)}

CANDIDATE CV (excerpt):
${cvText.slice(0, 800)}

QUESTION:
${question}

CANDIDATE'S ANSWER (score: ${evaluation.score}/10):
${candidateAnswer}

WEAKNESSES TO ADDRESS:
${evaluation.weaknesses.map((w) => `- ${w}`).join('\n')}

MISSING POINTS TO COVER:
${evaluation.missing_points.map((p) => `- ${p}`).join('\n')}

Write the best-practice answer now.`
}

export function buildReadingGuideSystemPrompt(): string {
  return `You are an English pronunciation and fluency coach helping a non-native speaker practice reading aloud.

Your task is to take a paragraph and break it into natural spoken chunks with reading guidance.

Rules for chunking:
- Split at natural pause points: after commas, before conjunctions (and/but/so/because), between clauses
- Each chunk should be 3–8 words — comfortable to say in one breath
- Mark primary word stress with CAPS on the stressed syllable of the key word in each chunk
- Use "/" to separate chunks within a sentence, and "//" for a full stop pause

Rules for tips:
- Give 3–5 practical tips specific to THIS text: which words to stress, where to breathe, tricky sounds
- Keep tips short and actionable (one sentence each)
- Focus on rhythm and natural flow, not grammar

Return ONLY valid JSON — no markdown, no explanation:
{
  "chunked_text": string,
  "tips": string[]
}`
}

export function buildReadingGuideUserPrompt(text: string): string {
  return `Break this interview answer into spoken chunks and provide reading tips:\n\n${text}`
}
