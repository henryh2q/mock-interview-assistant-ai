import { logger } from '@/lib/logger'
import { AIError } from '@/lib/errors'
import { withRetry } from '@/lib/utils'
import { callProvider } from '@/lib/ai/call'
import { DEFAULT_MODEL } from '@/lib/ai/providers'
import {
  InterviewPlanSchema,
  QuestionSchema,
  EvaluationSchema,
  BestAnswerSchema,
  RoundVerdictSchema,
  type InterviewPlan,
  type AIQuestion,
  type AIEvaluation,
  type AIBestAnswer,
  type AIRoundVerdict,
} from '@/types/ai'
import { RoundType } from '@/types/database'
import { buildPlanSystemPrompt, buildPlanUserPrompt } from '@/prompts/plan'
import { buildQuestionSystemPrompt, buildQuestionUserPrompt } from '@/prompts/question'
import { buildEvaluateSystemPrompt, buildEvaluateUserPrompt } from '@/prompts/evaluate'
import { buildBestAnswerSystemPrompt, buildBestAnswerUserPrompt } from '@/prompts/best-answer'
import { buildVerdictSystemPrompt, buildVerdictUserPrompt } from '@/prompts/verdict'

async function callAI<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: { parse: (data: unknown) => T },
  context: Record<string, unknown> = {},
  modelOverride?: string,
): Promise<T> {
  const model = modelOverride ?? DEFAULT_MODEL
  return withRetry(
    async () => {
      const raw = await callProvider(systemPrompt, userPrompt, model)

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        logger.error('AI returned invalid JSON', undefined, { raw, ...context })
        throw new AIError('AI returned invalid JSON — please retry')
      }

      const result = schema.parse(parsed)
      logger.info('AI call succeeded', { model, ...context })
      return result
    },
    2,
    1000,
  )
}

class AIService {
  async generateInterviewPlan(params: {
    jdText: string
    cvText: string
    extraInfo?: string | null
    aiModel?: string
  }): Promise<InterviewPlan> {
    return callAI(
      buildPlanSystemPrompt(),
      buildPlanUserPrompt(params.jdText, params.cvText, params.extraInfo),
      InterviewPlanSchema,
      { task: 'generate_plan' },
      params.aiModel,
    )
  }

  async generateQuestion(params: {
    roundType: RoundType
    jdText: string
    cvText: string
    roundTitle: string
    focusAreas: string[]
    previousQuestions: string[]
    questionIndex: number
    totalQuestions: number
    previousRoundSummary?: string | null
    aiModel?: string
  }): Promise<AIQuestion> {
    return callAI(
      buildQuestionSystemPrompt(params.roundType),
      buildQuestionUserPrompt(params),
      QuestionSchema,
      { task: 'generate_question', index: params.questionIndex },
      params.aiModel,
    )
  }

  async evaluateAnswer(params: {
    roundType: RoundType
    question: string
    answer: string
    jdText: string
    roundTitle: string
    focusAreas: string[]
    englishLevel: string
    aiModel?: string
  }): Promise<AIEvaluation> {
    return callAI(
      buildEvaluateSystemPrompt(params.roundType),
      buildEvaluateUserPrompt(params),
      EvaluationSchema,
      { task: 'evaluate_answer' },
      params.aiModel,
    )
  }

  async generateBestAnswer(params: {
    question: string
    jdText: string
    cvText: string
    roundTitle: string
    focusAreas: string[]
    candidateAnswer: string
    evaluation: { score: number; weaknesses: string[]; missing_points: string[] }
    aiModel?: string
  }): Promise<AIBestAnswer> {
    return callAI(
      buildBestAnswerSystemPrompt(),
      buildBestAnswerUserPrompt(params),
      BestAnswerSchema,
      { task: 'generate_best_answer' },
      params.aiModel,
    )
  }

  async generateRoundVerdict(params: {
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
    aiModel?: string
  }): Promise<AIRoundVerdict> {
    return callAI(
      buildVerdictSystemPrompt(),
      buildVerdictUserPrompt(params),
      RoundVerdictSchema,
      { task: 'generate_verdict' },
      params.aiModel,
    )
  }
}

export const aiService = new AIService()
