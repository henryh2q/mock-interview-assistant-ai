import { supabaseAdmin } from '@/lib/supabase/server'
import { RoundType, SavedAnswer } from '@/types/database'
import { logger } from '@/lib/logger'

export class SavedAnswerRepository {
  async findByUserId(
    userId: string,
    filters?: { roundType?: RoundType; search?: string },
  ): Promise<SavedAnswer[]> {
    let query = supabaseAdmin
      .from('saved_answers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (filters?.roundType) {
      query = query.eq('round_type', filters.roundType)
    }

    if (filters?.search) {
      query = query.or(
        `question_content.ilike.%${filters.search}%,candidate_answer.ilike.%${filters.search}%,best_answer.ilike.%${filters.search}%`,
      )
    }

    const { data, error } = await query

    if (error) {
      logger.error('SavedAnswerRepository.findByUserId failed', error as Error, { userId })
      throw error
    }
    return data ?? []
  }

  async findByEvaluationId(
    evaluationId: string,
    userId: string,
  ): Promise<SavedAnswer | null> {
    const { data, error } = await supabaseAdmin
      .from('saved_answers')
      .select('*')
      .eq('evaluation_id', evaluationId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('SavedAnswerRepository.findByEvaluationId failed', error as Error)
      throw error
    }
    return data ?? null
  }

  async create(input: {
    user_id: string
    evaluation_id: string
    question_content: string
    candidate_answer: string
    best_answer: string
    round_type: RoundType
    tags?: string[]
  }): Promise<SavedAnswer> {
    const { data, error } = await supabaseAdmin
      .from('saved_answers')
      .insert({
        user_id: input.user_id,
        evaluation_id: input.evaluation_id,
        question_content: input.question_content,
        candidate_answer: input.candidate_answer,
        best_answer: input.best_answer,
        round_type: input.round_type,
        tags: input.tags ?? [],
      })
      .select()
      .single()

    if (error) {
      logger.error('SavedAnswerRepository.create failed', error as Error)
      throw error
    }
    return data
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('saved_answers')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      logger.error('SavedAnswerRepository.delete failed', error as Error, { id })
      throw error
    }
  }
}

export const savedAnswerRepository = new SavedAnswerRepository()
