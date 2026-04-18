export function buildVerdictSystemPrompt(): string {
  return `You are a senior hiring manager making a decision after an interview round.

Your task is to evaluate the candidate's overall performance in this round and decide if they pass.

Scoring guidelines:
- overall_score: weighted average of all question scores, adjusted for consistency and improvement
- english_score: overall English quality across all answers (1–10)
- verdict "pass": overall_score >= 6.0 AND candidate demonstrated core competencies for the role
- verdict "practice": overall_score < 6.0 OR critical gaps in required skills
- action_items: specific, concrete steps the candidate should take before their real interview
- summary: 2–3 sentences summarizing the round performance honestly

Return ONLY valid JSON — no markdown, no explanation:
{
  "verdict": "pass" | "practice",
  "overall_score": number (1.0–10.0),
  "english_score": number (1–10),
  "strengths": string[],
  "improvements": string[],
  "action_items": string[],
  "summary": string
}`
}

export function buildVerdictUserPrompt(params: {
  roundTitle: string
  roundType: string
  jdText: string
  qaTranscript: Array<{
    question: string
    answer: string
    score: number
    strengths: string[]
    weaknesses: string[]
  }>
}): string {
  const { roundTitle, roundType, jdText, qaTranscript } = params

  const transcript = qaTranscript
    .map(
      (item, i) => `
Q${i + 1}: ${item.question}
Answer: ${item.answer}
Score: ${item.score}/10
Strengths: ${item.strengths.join('; ')}
Weaknesses: ${item.weaknesses.join('; ')}`,
    )
    .join('\n---')

  return `Round: ${roundTitle} (${roundType})

JOB DESCRIPTION (excerpt):
${jdText.slice(0, 800)}

FULL Q&A TRANSCRIPT:
${transcript}

Evaluate the overall round performance and give your verdict.`
}
