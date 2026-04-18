import { supabaseAdmin } from '@/lib/supabase/server'
import { Evaluation, RoundResult } from '@/types/database'
import { AIEvaluation, AIRoundVerdict } from '@/types/ai'
import { logger } from '@/lib/logger'

export class EvaluationRepository {
  async findByMessageId(messageId: string): Promise<Evaluation | null> {
    const { data, error } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('message_id', messageId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('EvaluationRepository.findByMessageId failed', error as Error, { messageId })
      throw error
    }
    return data ?? null
  }

  async findByRoundId(roundId: string): Promise<Evaluation[]> {
    const { data, error } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('EvaluationRepository.findByRoundId failed', error as Error, { roundId })
      throw error
    }
    return data ?? []
  }

  async create(input: {
    message_id: string
    round_id: string
    question_content: string
    evaluation: AIEvaluation
    best_answer?: string | null
  }): Promise<Evaluation> {
    const { data, error } = await supabaseAdmin
      .from('evaluations')
      .insert({
        message_id: input.message_id,
        round_id: input.round_id,
        question_content: input.question_content,
        score: input.evaluation.score,
        strengths: input.evaluation.strengths,
        weaknesses: input.evaluation.weaknesses,
        english_feedback: input.evaluation.english_feedback,
        missing_points: input.evaluation.missing_points,
        best_answer: input.best_answer,
      })
      .select()
      .single()

    if (error) {
      logger.error('EvaluationRepository.create failed', error as Error)
      throw error
    }
    return data
  }

  async updateBestAnswer(id: string, bestAnswer: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('evaluations')
      .update({ best_answer: bestAnswer })
      .eq('id', id)

    if (error) {
      logger.error('EvaluationRepository.updateBestAnswer failed', error as Error, { id })
      throw error
    }
  }

  async createRoundResult(input: {
    round_id: string
    session_id: string
    verdict: AIRoundVerdict
  }): Promise<RoundResult> {
    const { data, error } = await supabaseAdmin
      .from('round_results')
      .insert({
        round_id: input.round_id,
        session_id: input.session_id,
        verdict: input.verdict.verdict,
        overall_score: input.verdict.overall_score,
        english_score: input.verdict.english_score,
        strengths: input.verdict.strengths,
        improvements: input.verdict.improvements,
        action_items: input.verdict.action_items,
      })
      .select()
      .single()

    if (error) {
      logger.error('EvaluationRepository.createRoundResult failed', error as Error)
      throw error
    }
    return data
  }

  async findRoundResult(roundId: string): Promise<RoundResult | null> {
    const { data, error } = await supabaseAdmin
      .from('round_results')
      .select('*')
      .eq('round_id', roundId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('EvaluationRepository.findRoundResult failed', error as Error, { roundId })
      throw error
    }
    return data ?? null
  }
}

export const evaluationRepository = new EvaluationRepository()
