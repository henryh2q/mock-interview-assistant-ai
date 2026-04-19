'use client'

import { useState, useCallback } from 'react'
import { Message, Evaluation } from '@/types/database'
import { AIBestAnswer } from '@/types/ai'
import { toast } from 'sonner'

export interface InterviewTurn {
  questionMessage: Message
  answerMessage?: Message
  evaluation?: Evaluation
  bestAnswer?: AIBestAnswer
  isSaved?: boolean
}

export interface UseInterviewReturn {
  turns: InterviewTurn[]
  currentQuestionIndex: number
  isLoadingQuestion: boolean
  isEvaluating: boolean
  contextHint: string | null
  initializeTurns: (initialTurns: InterviewTurn[]) => void
  fetchNextQuestion: (params: {
    sessionId: string
    roundId: string
    questionIndex: number
    previousRoundSummary?: string | null
  }) => Promise<void>
  submitAnswer: (params: {
    sessionId: string
    roundId: string
    answer: string
    questionMessageId: string
  }) => Promise<void>
  saveAnswer: (params: {
    sessionId: string
    roundId: string
    evaluationId: string
    turnIndex: number
  }) => Promise<void>
  generateVerdict: (params: {
    sessionId: string
    roundId: string
  }) => Promise<{ verdict: string; overall_score: number } | null>
  isGeneratingVerdict: boolean
}

export function useInterview(): UseInterviewReturn {
  const [turns, setTurns] = useState<InterviewTurn[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false)
  const [contextHint, setContextHint] = useState<string | null>(null)

  const initializeTurns = useCallback((initialTurns: InterviewTurn[]) => {
    setTurns(initialTurns)
    if (initialTurns.length > 0) {
      const lastQuestion = initialTurns[initialTurns.length - 1].questionMessage
      setCurrentQuestionIndex(lastQuestion.question_index ?? initialTurns.length - 1)
    }
  }, [])

  const fetchNextQuestion = useCallback(
    async (params: {
      sessionId: string
      roundId: string
      questionIndex: number
      previousRoundSummary?: string | null
    }) => {
      setIsLoadingQuestion(true)
      try {
        const res = await fetch(
          `/api/sessions/${params.sessionId}/rounds/${params.roundId}/questions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question_index: params.questionIndex,
              previous_round_summary: params.previousRoundSummary,
            }),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to get question')
          return
        }

        setTurns((prev) => [...prev, { questionMessage: data.message }])
        setContextHint(data.context_hint ?? null)
        setCurrentQuestionIndex(params.questionIndex)
      } catch {
        toast.error('Network error. Please try again.')
      } finally {
        setIsLoadingQuestion(false)
      }
    },
    [],
  )

  const submitAnswer = useCallback(
    async (params: {
      sessionId: string
      roundId: string
      answer: string
      questionMessageId: string
    }) => {
      setIsEvaluating(true)
      try {
        const res = await fetch(
          `/api/sessions/${params.sessionId}/rounds/${params.roundId}/evaluate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answer: params.answer,
              question_message_id: params.questionMessageId,
            }),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to evaluate answer')
          return
        }

        const answerMessage: Message = {
          id: data.candidate_message_id,
          round_id: params.roundId,
          session_id: params.sessionId,
          role: 'candidate',
          content: params.answer,
          question_index: null,
          created_at: new Date().toISOString(),
        }

        setTurns((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last) {
            updated[updated.length - 1] = {
              ...last,
              answerMessage,
              evaluation: data.evaluation,
              bestAnswer: data.best_answer,
            }
          }
          return updated
        })
      } catch {
        toast.error('Network error. Please try again.')
      } finally {
        setIsEvaluating(false)
      }
    },
    [],
  )

  const saveAnswer = useCallback(
    async (params: {
      sessionId: string
      roundId: string
      evaluationId: string
      turnIndex: number
    }) => {
      try {
        const res = await fetch(
          `/api/sessions/${params.sessionId}/rounds/${params.roundId}/save`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evaluation_id: params.evaluationId }),
          },
        )

        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to save answer')
          return
        }

        if (data.already_saved) {
          toast.info('Already saved to your library')
        } else {
          toast.success('Saved to your library')
        }

        setTurns((prev) => {
          const updated = [...prev]
          if (updated[params.turnIndex]) {
            updated[params.turnIndex] = { ...updated[params.turnIndex], isSaved: true }
          }
          return updated
        })
      } catch {
        toast.error('Failed to save answer')
      }
    },
    [],
  )

  const generateVerdict = useCallback(
    async (params: { sessionId: string; roundId: string }) => {
      setIsGeneratingVerdict(true)
      try {
        const res = await fetch(
          `/api/sessions/${params.sessionId}/rounds/${params.roundId}/verdict`,
          { method: 'POST' },
        )

        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to generate verdict')
          return null
        }

        return data.verdict
      } catch {
        toast.error('Failed to generate verdict')
        return null
      } finally {
        setIsGeneratingVerdict(false)
      }
    },
    [],
  )

  return {
    turns,
    currentQuestionIndex,
    isLoadingQuestion,
    isEvaluating,
    contextHint,
    initializeTurns,
    fetchNextQuestion,
    submitAnswer,
    saveAnswer,
    generateVerdict,
    isGeneratingVerdict,
  }
}
