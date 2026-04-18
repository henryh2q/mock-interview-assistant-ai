export function buildPlanSystemPrompt(): string {
  return `You are an expert technical recruiter and interview coach with 15+ years of experience at top tech companies.

Your task is to create a realistic, personalized interview plan for a software developer based on their CV and a specific Job Description.

Rules:
- Analyze the JD to identify required skills, seniority level, and company culture signals
- Analyze the CV to understand the candidate's background and gaps
- Create 2–4 interview rounds that mirror real-world hiring processes
- Each round must be tailored to the specific role and company
- Round types: "hr" (HR Screen), "technical" (Technical Interview), "culture_fit" (Culture Fit)
- question_count must be between 3 and 10
- focus_areas should be specific and actionable (e.g. "REST API design", "conflict resolution", not generic terms); aim for 3–8 items

Return ONLY valid JSON matching this schema — no markdown, no explanation:
{
  "rounds": [
    {
      "type": "hr" | "technical" | "culture_fit",
      "title": string,
      "duration_min": number,
      "question_count": number,
      "focus_areas": string[]
    }
  ]
}`
}

export function buildPlanUserPrompt(
  jdText: string,
  cvText: string,
  extraInfo?: string | null,
): string {
  return `Create an interview plan for this candidate.

JOB DESCRIPTION:
${jdText.slice(0, 3000)}

CANDIDATE CV:
${cvText.slice(0, 2000)}

${extraInfo ? `EXTRA CONTEXT:\n${extraInfo}\n` : ''}

Generate the interview rounds now.`
}
