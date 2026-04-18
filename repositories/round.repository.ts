import { supabaseAdmin } from '@/lib/supabase/server'
import { Round, RoundStatus, RoundType } from '@/types/database'
import { logger } from '@/lib/logger'

export interface CreateRoundInput {
  session_id: string
  type: RoundType
  title: string
  order_index: number
  duration_min?: number | null
  question_count: number
  focus_areas: string[]
}

export class RoundRepository {
  async findById(id: string): Promise<Round | null> {
    const { data, error } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('RoundRepository.findById failed', error as Error, { id })
      throw error
    }
    return data ?? null
  }

  async findBySessionId(sessionId: string): Promise<Round[]> {
    const { data, error } = await supabaseAdmin
      .from('rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    if (error) {
      logger.error('RoundRepository.findBySessionId failed', error as Error, { sessionId })
      throw error
    }
    return data ?? []
  }

  async createMany(rounds: CreateRoundInput[]): Promise<Round[]> {
    const { data, error } = await supabaseAdmin
      .from('rounds')
      .insert(rounds)
      .select()

    if (error) {
      logger.error('RoundRepository.createMany failed', error as Error)
      throw error
    }
    return data ?? []
  }

  async updateStatus(id: string, status: RoundStatus): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rounds')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('RoundRepository.updateStatus failed', error as Error, { id, status })
      throw error
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rounds')
      .delete()
      .eq('session_id', sessionId)

    if (error) {
      logger.error('RoundRepository.deleteBySessionId failed', error as Error, { sessionId })
      throw error
    }
  }
}

export const roundRepository = new RoundRepository()
