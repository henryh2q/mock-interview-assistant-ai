import { RoundType } from '@/types/database'

const rubricByRound: Record<RoundType, string> = {
  hr: `Scoring rubric:
- Clarity and structure of communication (30%)
- Relevance and depth of answer (30%)
- English fluency and professionalism (20%)
- Enthusiasm and cultural fit signals (20%)`,

  technical: `Scoring rubric:
- Technical correctness and depth (40%)
- Problem-solving approach (25%)
- Communication of technical concepts (20%)
- English clarity (15%)`,

  culture_fit: `Scoring rubric:
- Use of specific examples (STAR method) (35%)
- Values alignment with JD company culture (30%)
- Self-awareness and growth mindset (20%)
- English clarity and storytelling (15%)`,
}

export function buildEvaluateSystemPrompt(roundType: RoundType): string {
  return `You are an expert interview evaluator assessing a software developer candidate.

Evaluate the candidate's answer to the interview question based on the job requirements.

${rubricByRound[roundType]}

Edge cases:
- If the answer is very short (<20 words) or says "I don't know": score 1–2, note it needs expansion
- If the answer is off-topic: score 1–3, note the mismatch
- If the answer is in non-English: score the content but note English improvement needed
- english_feedback: always provide specific, constructive English improvement tips (grammar, vocabulary, structure). If English is good, say so briefly.

Return ONLY valid JSON — no markdown, no explanation:
{
  "score": number (1–10),
  "strengths": string[],
  "weaknesses": string[],
  "english_feedback": string,
  "missing_points": string[]
}`
}

export function buildEvaluateUserPrompt(params: {
  question: string
  answer: string
  jdText: string
  roundTitle: string
  focusAreas: string[]
  englishLevel: string
}): string {
  const { question, answer, jdText, roundTitle, focusAreas, englishLevel } =
    params
  return `Round: ${roundTitle}
Focus areas: ${focusAreas.join(', ')}
Candidate English level (self-reported): ${englishLevel}

JOB DESCRIPTION (excerpt):
${jdText.slice(0, 1000)}

QUESTION:
${question}

CANDIDATE'S ANSWER:
${answer}

Evaluate this answer now.`
}
