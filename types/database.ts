export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced'
export type InterviewLanguage = 'english' | 'vietnamese'
export type SessionStatus = 'draft' | 'active' | 'completed'
export type RoundType = 'hr' | 'technical' | 'culture_fit'
export type RoundStatus = 'pending' | 'active' | 'completed'
export type MessageRole = 'interviewer' | 'candidate'
export type RoundVerdict = 'pass' | 'practice'

export interface User {
  id: string
  phone: string
  name: string | null
  target_role: string | null
  years_experience: number | null
  english_level: EnglishLevel
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  name: string | null
  jd_text: string
  cv_text: string
  extra_info: string | null
  jd_file_path: string | null
  cv_file_path: string | null
  status: SessionStatus
  ai_model: string | null
  shuffle_questions: boolean
  interview_language: InterviewLanguage
  created_at: string
  updated_at: string
}

export interface Round {
  id: string
  session_id: string
  type: RoundType
  title: string
  order_index: number
  duration_min: number | null
  question_count: number
  focus_areas: string[]
  status: RoundStatus
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  round_id: string
  session_id: string
  role: MessageRole
  content: string
  question_index: number | null
  created_at: string
}

export interface Evaluation {
  id: string
  message_id: string
  round_id: string
  question_content: string
  score: number | null
  strengths: string[]
  weaknesses: string[]
  english_feedback: string | null
  missing_points: string[]
  best_answer: string | null
  created_at: string
}

export interface RoundResult {
  id: string
  round_id: string
  session_id: string
  verdict: RoundVerdict
  overall_score: number | null
  english_score: number | null
  strengths: string[]
  improvements: string[]
  action_items: string[]
  created_at: string
}

export interface SavedAnswer {
  id: string
  user_id: string
  evaluation_id: string
  question_content: string
  candidate_answer: string
  best_answer: string
  round_type: RoundType
  tags: string[]
  created_at: string
}

export interface Event {
  id: string
  user_id: string | null
  event_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DailyUsage {
  id: string
  user_id: string
  date: string
  sessions_created: number
  ai_calls: number
}

// Extended types with joins
export interface SessionWithRounds extends Session {
  rounds: Round[]
}

export interface RoundWithMessages extends Round {
  messages: Message[]
  result?: RoundResult
}

export interface EvaluationWithMessage extends Evaluation {
  message: Message
}

export interface SavedAnswerWithMeta extends SavedAnswer {
  is_saved?: boolean
}
