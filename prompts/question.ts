import { RoundType } from '@/types/database'

const roundPersona: Record<RoundType, string> = {
  hr: 'You are a friendly but professional HR recruiter conducting a phone screen.',
  technical:
    'You are a senior software engineer conducting a technical interview. Ask deep, specific questions.',
  culture_fit:
    'You are an engineering manager conducting a culture fit interview. Focus on values, collaboration, and growth mindset.',
}

export function buildQuestionSystemPrompt(roundType: RoundType): string {
  return `${roundPersona[roundType]}

Your task is to generate ONE interview question for the candidate.

Rules:
- The question must be relevant to the round type and focus areas provided
- Reference specific details from the JD or CV to make it personal and realistic
- Never repeat a question already asked in this session
- Questions should be open-ended and require thoughtful answers
- For technical rounds: mix conceptual, practical, and problem-solving questions
- Keep the question concise (1–3 sentences max)
- context_hint is optional — use it to give a brief note on what a great answer would cover (1 sentence max)

Return ONLY valid JSON — no markdown, no explanation:
{
  "question": string,
  "context_hint": string | null
}`
}

export function buildQuestionUserPrompt(params: {
  jdText: string
  cvText: string
  roundTitle: string
  focusAreas: string[]
  previousQuestions: string[]
  questionIndex: number
  totalQuestions: number
  previousRoundSummary?: string | null
}): string {
  const {
    jdText,
    cvText,
    roundTitle,
    focusAreas,
    previousQuestions,
    questionIndex,
    totalQuestions,
    previousRoundSummary,
  } = params

  return `Round: ${roundTitle}
Focus areas: ${focusAreas.join(', ')}
Question ${questionIndex + 1} of ${totalQuestions}

JOB DESCRIPTION (excerpt):
${jdText.slice(0, 1500)}

CANDIDATE CV (excerpt):
${cvText.slice(0, 1000)}

${previousRoundSummary ? `PREVIOUS ROUND PERFORMANCE:\n${previousRoundSummary}\n` : ''}

${
  previousQuestions.length > 0
    ? `ALREADY ASKED (do NOT repeat these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : ''
}

Generate the next interview question now.`
}
