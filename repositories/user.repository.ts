import { supabaseAdmin } from '@/lib/supabase/server'
import { User } from '@/types/database'
import { logger } from '@/lib/logger'

export class UserRepository {
  async findByPhone(phone: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('UserRepository.findByPhone failed', error as Error, { phone })
      throw error
    }
    return data ?? null
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('UserRepository.findById failed', error as Error, { id })
      throw error
    }
    return data ?? null
  }

  async upsertByPhone(phone: string): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({ phone }, { onConflict: 'phone' })
      .select()
      .single()

    if (error) {
      logger.error('UserRepository.upsertByPhone failed', error as Error, { phone })
      throw error
    }
    return data
  }
}

export const userRepository = new UserRepository()
