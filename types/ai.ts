import { z } from 'zod'

// ── Interview Plan ────────────────────────────────────────────────────────────

export const RoundPlanSchema = z.object({
  type: z.enum(['hr', 'technical', 'culture_fit']),
  title: z.string().min(1),
  duration_min: z.number().int().min(5).max(120),
  question_count: z.number().int().min(1).max(10),
  focus_areas: z.array(z.string()).min(1),
})

export const InterviewPlanSchema = z.object({
  rounds: z.array(RoundPlanSchema).min(1).max(5),
})

export type RoundPlan = z.infer<typeof RoundPlanSchema>
export type InterviewPlan = z.infer<typeof InterviewPlanSchema>

// ── Question ──────────────────────────────────────────────────────────────────

export const QuestionSchema = z.object({
  question: z.string().min(10),
  context_hint: z.string().optional(),
})

export type AIQuestion = z.infer<typeof QuestionSchema>

// ── Evaluation ────────────────────────────────────────────────────────────────

export const EvaluationSchema = z.object({
  score: z.number().int().min(1).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  english_feedback: z.string(),
  missing_points: z.array(z.string()),
})

export type AIEvaluation = z.infer<typeof EvaluationSchema>

// ── Best Answer ───────────────────────────────────────────────────────────────

export const BestAnswerSchema = z.object({
  best_answer: z.string().min(20),
  key_points: z.array(z.string()).min(1),
})

export type AIBestAnswer = z.infer<typeof BestAnswerSchema>

// ── Round Verdict ─────────────────────────────────────────────────────────────

export const RoundVerdictSchema = z.object({
  verdict: z.enum(['pass', 'practice']),
  overall_score: z.number().min(1).max(10),
  english_score: z.number().int().min(1).max(10),
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()),
  action_items: z.array(z.string()).min(1),
  summary: z.string(),
})

export type AIRoundVerdict = z.infer<typeof RoundVerdictSchema>

// ── AI Call Context ───────────────────────────────────────────────────────────

export interface AIContext {
  jd_text: string
  cv_text: string
  extra_info?: string | null
  round_type?: string
  round_title?: string
  focus_areas?: string[]
  english_level?: string
  previous_questions?: string[]
  previous_round_summary?: string | null
}
