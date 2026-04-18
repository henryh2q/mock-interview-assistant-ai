import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { RateLimitError } from '@/lib/errors'

const LIMITS = {
  sessions_per_day: 3,
  ai_calls_per_day: 100,
}

class RateLimitService {
  private async getOrCreateUsage(userId: string, date: string) {
    const { data: existing } = await supabaseAdmin
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    if (existing) return existing

    const { data, error } = await supabaseAdmin
      .from('daily_usage')
      .insert({ user_id: userId, date })
      .select()
      .single()

    if (error) {
      logger.error('RateLimitService.getOrCreateUsage failed', error as Error, { userId, date })
      throw error
    }
    return data
  }

  async checkSessionLimit(userId: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    const usage = await this.getOrCreateUsage(userId, date)

    if (usage.sessions_created >= LIMITS.sessions_per_day) {
      throw new RateLimitError(
        `You have reached the limit of ${LIMITS.sessions_per_day} sessions per day. Try again tomorrow.`,
      )
    }
  }

  async incrementSessionCount(userId: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    const { error } = await supabaseAdmin.rpc('increment_sessions_created', {
      p_user_id: userId,
      p_date: date,
    })
    if (error) {
      logger.warn('RateLimitService.incrementSessionCount failed', { userId, error: String(error) })
    }
  }

  async checkAICallLimit(userId: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    const usage = await this.getOrCreateUsage(userId, date)

    if (usage.ai_calls >= LIMITS.ai_calls_per_day) {
      throw new RateLimitError(
        'You have reached the daily AI call limit. Please try again tomorrow.',
      )
    }
  }

  async incrementAICallCount(userId: string): Promise<void> {
    const date = new Date().toISOString().split('T')[0]
    await supabaseAdmin.rpc('increment_ai_calls', {
      p_user_id: userId,
      p_date: date,
    })
  }
}

export const rateLimitService = new RateLimitService()
