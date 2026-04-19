'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useInterview, InterviewTurn } from '@/hooks/useInterview'
import { ChatBubble } from '@/components/interview/chat-bubble'
import { AnswerInput } from '@/components/interview/answer-input'
import { EvaluationCard } from '@/components/interview/evaluation-card'
import { RoundProgress } from '@/components/interview/round-progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, ArrowRight, CheckCircle, Trophy } from 'lucide-react'
import { Round, Message, Evaluation } from '@/types/database'
import { AIBestAnswer } from '@/types/ai'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type RoundWithData = Round & {
  messages: Message[]
  evaluations: Evaluation[]
  result?: { verdict: string; overall_score: number } | null
}

function buildTurnsFromHistory(round: RoundWithData): InterviewTurn[] {
  const interviewerMsgs = round.messages
    .filter((m) => m.role === 'interviewer')
    .sort((a, b) => (a.question_index ?? 0) - (b.question_index ?? 0))

  // evaluation.message_id points to the candidate answer message
  const candidateMsgIdToEval = new Map(
    round.evaluations.map((e) => [e.message_id, e]),
  )
  const candidateMsgs = round.messages
    .filter((m) => m.role === 'candidate')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  return interviewerMsgs.map((qMsg, idx) => {
    // Candidate messages appear in the same order as questions
    const answerMsg = candidateMsgs[idx]
    const evaluation = answerMsg ? candidateMsgIdToEval.get(answerMsg.id) : undefined

    const bestAnswer: AIBestAnswer | undefined = evaluation?.best_answer
      ? { best_answer: evaluation.best_answer, key_points: [] }
      : undefined

    return {
      questionMessage: qMsg,
      answerMessage: answerMsg,
      evaluation,
      bestAnswer,
      isSaved: false,
    }
  })
}

export default function InterviewRoundPage() {
  const { id: sessionId, roundId } = useParams<{ id: string; roundId: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const historyInitialized = useRef(false)

  const { data: roundData } = useSWR<{ rounds: RoundWithData[] }>(
    `/api/sessions/${sessionId}/rounds`,
    fetcher,
  )
  const { data: sessionData } = useSWR<{ session: { ai_model: string | null } }>(
    `/api/sessions/${sessionId}`,
    fetcher,
  )

  const round = roundData?.rounds?.find((r) => r.id === roundId) as RoundWithData | undefined
  const aiModel = sessionData?.session?.ai_model ?? undefined

  const {
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
  } = useInterview()

  const isCompleted = round?.status === 'completed'

  // Restore history from DB on first load
  useEffect(() => {
    if (!round || historyInitialized.current) return
    historyInitialized.current = true

    if (round.messages && round.messages.length > 0) {
      const restoredTurns = buildTurnsFromHistory(round)
      if (restoredTurns.length > 0) {
        initializeTurns(restoredTurns)
        // If not completed and last turn has an answer, the user can click "Next Question"
        // If last turn has no answer yet, it shows the answer input (waitingForAnswer)
        return
      }
    }

    // No history — fetch first question (only if not completed)
    if (!isCompleted) {
      fetchNextQuestion({ sessionId, roundId, questionIndex: 0 })
    }
  }, [round])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, isEvaluating, isLoadingQuestion])

  const answeredCount = turns.filter((t) => t.evaluation).length
  const isRoundComplete = round && answeredCount >= round.question_count
  const isLastQuestion = round && currentQuestionIndex === round.question_count - 1
  const currentTurn = turns[turns.length - 1]
  const waitingForAnswer =
    !isCompleted &&
    currentTurn &&
    !currentTurn.evaluation &&
    !isEvaluating &&
    !isLoadingQuestion
  const canAskNext =
    !isCompleted &&
    currentTurn?.evaluation &&
    !isLastQuestion &&
    !isLoadingQuestion &&
    answeredCount === turns.length  // all current turns have been answered

  const handleNextQuestion = () => {
    fetchNextQuestion({
      sessionId,
      roundId,
      questionIndex: currentQuestionIndex + 1,
    })
  }

  const handleFinishRound = async () => {
    const result = await generateVerdict({ sessionId, roundId })
    if (result) {
      router.push(`/sessions/${sessionId}/round/${roundId}/result`)
    }
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-3.5rem)]">
      <RoundProgress
        roundTitle={round.title}
        roundType={round.type as 'hr' | 'technical' | 'culture_fit'}
        currentQuestion={Math.min(answeredCount + 1, round.question_count)}
        totalQuestions={round.question_count}
      />

      {isCompleted && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            You completed this round. Showing your practice history.
          </div>
          <Button
            size="sm"
            variant="outline"
            className="flex-shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
            onClick={() => router.push(`/sessions/${sessionId}/round/${roundId}/result`)}
          >
            <Trophy className="w-4 h-4 mr-1.5" />
            View Result
          </Button>
        </div>
      )}

      <div className="flex-1 py-6 space-y-6">
        {turns.map((turn, idx) => (
          <div key={idx} className="space-y-4">
            <ChatBubble
              role="interviewer"
              content={turn.questionMessage.content}
              questionIndex={turn.questionMessage.question_index}
            />

            {turn.answerMessage && (
              <ChatBubble role="candidate" content={turn.answerMessage.content} />
            )}

            {turn.evaluation && turn.bestAnswer && (
              <EvaluationCard
                evaluation={turn.evaluation}
                bestAnswer={turn.bestAnswer}
                isSaved={turn.isSaved}
                aiModel={aiModel}
                onSave={
                  isCompleted
                    ? undefined
                    : () =>
                        saveAnswer({
                          sessionId,
                          roundId,
                          evaluationId: turn.evaluation!.id,
                          turnIndex: idx,
                        })
                }
              />
            )}
          </div>
        ))}

        {isLoadingQuestion && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {isEvaluating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-11">
            <Loader2 className="w-4 h-4 animate-spin" />
            Evaluating your answer and generating best practice...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {!isCompleted && (
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
          {contextHint && waitingForAnswer && (
            <p className="text-xs text-muted-foreground bg-blue-50 rounded-lg px-3 py-2">
              💡 {contextHint}
            </p>
          )}

          {waitingForAnswer && (
            <AnswerInput
              onSubmit={(answer) =>
                submitAnswer({
                  sessionId,
                  roundId,
                  answer,
                  questionMessageId: currentTurn.questionMessage.id,
                })
              }
              isEvaluating={isEvaluating}
            />
          )}

          {canAskNext && (
            <Button onClick={handleNextQuestion} className="w-full gap-1">
              Next Question <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {isRoundComplete && currentTurn?.evaluation && (
            <Button
              onClick={handleFinishRound}
              disabled={isGeneratingVerdict}
              className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isGeneratingVerdict ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating verdict...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Finish Round & Get Verdict</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
