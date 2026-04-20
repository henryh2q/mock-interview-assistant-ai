import { supabaseAdmin } from '@/lib/supabase/server'
import { Session, SessionStatus, SessionWithRounds } from '@/types/database'
import { logger } from '@/lib/logger'

export interface CreateSessionInput {
  user_id: string
  name?: string | null
  jd_text: string
  cv_text: string
  extra_info?: string | null
  jd_file_path?: string | null
  cv_file_path?: string | null
  ai_model?: string | null
  shuffle_questions?: boolean
}

export class SessionRepository {
  async findById(id: string): Promise<Session | null> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('SessionRepository.findById failed', error as Error, { id })
      throw error
    }
    return data ?? null
  }

  async findByIdWithRounds(id: string): Promise<SessionWithRounds | null> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*, rounds(*)')
      .eq('id', id)
      .order('order_index', { referencedTable: 'rounds', ascending: true })
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('SessionRepository.findByIdWithRounds failed', error as Error, { id })
      throw error
    }
    return data ?? null
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('SessionRepository.findByUserId failed', error as Error, { userId })
      throw error
    }
    return data ?? []
  }

  async create(input: CreateSessionInput): Promise<Session> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: input.user_id,
        name: input.name,
        jd_text: input.jd_text,
        cv_text: input.cv_text,
        extra_info: input.extra_info,
        jd_file_path: input.jd_file_path,
        cv_file_path: input.cv_file_path,
        ai_model: input.ai_model ?? null,
        shuffle_questions: input.shuffle_questions ?? false,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      logger.error('SessionRepository.create failed', error as Error, { userId: input.user_id })
      throw error
    }
    return data
  }

  async updateExtraInfo(id: string, extraInfo: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ extra_info: extraInfo, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('SessionRepository.updateExtraInfo failed', error as Error, { id })
      throw error
    }
  }

  async updateContent(id: string, fields: {
    jd_text?: string
    cv_text?: string
    extra_info?: string | null
    ai_model?: string | null
    name?: string | null
  }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('SessionRepository.updateContent failed', error as Error, { id })
      throw error
    }
  }

  async updateStatus(id: string, status: SessionStatus): Promise<void> {
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error('SessionRepository.updateStatus failed', error as Error, { id, status })
      throw error
    }
  }
}

export const sessionRepository = new SessionRepository()
