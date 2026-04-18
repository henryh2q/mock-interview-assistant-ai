import { supabaseAdmin } from '@/lib/supabase/server'
import { Message, MessageRole } from '@/types/database'
import { logger } from '@/lib/logger'

export interface CreateMessageInput {
  round_id: string
  session_id: string
  role: MessageRole
  content: string
  question_index?: number | null
}

export class MessageRepository {
  async findByRoundId(roundId: string): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('MessageRepository.findByRoundId failed', error as Error, { roundId })
      throw error
    }
    return data ?? []
  }

  async create(input: CreateMessageInput): Promise<Message> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert(input)
      .select()
      .single()

    if (error) {
      logger.error('MessageRepository.create failed', error as Error)
      throw error
    }
    return data
  }

  async countCandidateMessages(roundId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('round_id', roundId)
      .eq('role', 'candidate')

    if (error) {
      logger.error('MessageRepository.countCandidateMessages failed', error as Error, { roundId })
      throw error
    }
    return count ?? 0
  }
}

export const messageRepository = new MessageRepository()
