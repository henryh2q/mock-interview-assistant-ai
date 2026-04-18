export function buildBestAnswerSystemPrompt(): string {
  return `You are a senior interview coach helping a software developer prepare for interviews.

Your task is to write a model best-practice answer to an interview question.

Rules:
- The answer must be tailored to the specific job requirements in the JD
- Write in first person as if you are the candidate
- Structure the answer well (for behavioral: use STAR method; for technical: explain approach → implementation → trade-offs)
- The answer should be realistic for a candidate with the experience level shown in the CV
- Length: 100–250 words — comprehensive but not rambling
- key_points: 3–5 bullet points summarizing what makes this a strong answer
- Write in clear, professional English — this serves as an English learning example too

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
