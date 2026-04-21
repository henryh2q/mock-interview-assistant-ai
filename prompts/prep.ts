export function buildPrepSystemPrompt(language: 'english' | 'vietnamese'): string {
  const langRule = language === 'vietnamese'
    ? 'Write all questions and answers in Vietnamese (natural spoken Vietnamese).'
    : 'Write all questions and answers in English.'

  return `You are a senior interview coach preparing a candidate for a real job interview.

Your task: generate a collection of the most likely interview questions for this specific role and candidate, with ideal model answers tailored to their CV.

Rules:
- ${langRule}
- Generate 10–15 questions covering HR, technical, and culture-fit angles
- Each answer must be specific to the candidate's CV — not generic
- Answers should be 2–4 sentences: confident, natural, ready to say out loud
- Cover the most likely weaknesses and gaps you spot between the CV and JD
- No markdown inside answers — pure prose

Return ONLY valid JSON:
{
  "items": [
    {
      "category": "hr" | "technical" | "culture_fit",
      "question": string,
      "answer": string
    }
  ]
}`
}

export function buildPrepUserPrompt(
  jdText: string,
  cvText: string,
  extraInfo?: string | null,
): string {
  return `Generate a preparation Q&A collection for this candidate.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

CANDIDATE CV:
${cvText.slice(0, 2000)}

${extraInfo?.trim() ? `EXTRA CONTEXT:\n${extraInfo.trim().slice(0, 500)}\n` : ''}
Generate the questions and answers now.`
}
