import { supabaseAdmin } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export type EventType =
  | 'user_login'
  | 'session_created'
  | 'session_duplicated'
  | 'round_started'
  | 'round_completed'
  | 'answer_submitted'
  | 'answer_saved'
  | 'verdict_generated'

class AnalyticsService {
  async track(
    eventType: EventType,
    userId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await supabaseAdmin.from('events').insert({
        user_id: userId,
        event_type: eventType,
        metadata: metadata ?? null,
      })
    } catch (error) {
      // Analytics failure should never break the main flow
      logger.warn('Analytics track failed', { eventType, userId, error: String(error) })
    }
  }
}

export const analyticsService = new AnalyticsService()
