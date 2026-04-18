'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useInterview } from '@/hooks/useInterview'
import { ChatBubble } from '@/components/interview/chat-bubble'
import { AnswerInput } from '@/components/interview/answer-input'
import { EvaluationCard } from '@/components/interview/evaluation-card'
import { RoundProgress } from '@/components/interview/round-progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, ArrowRight, CheckCircle } from 'lucide-react'
import { Round } from '@/types/database'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function InterviewRoundPage() {
  const { id: sessionId, roundId } = useParams<{ id: string; roundId: string }>()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: roundData } = useSWR<{ rounds: Round[] }>(
    `/api/sessions/${sessionId}/rounds`,
    fetcher,
  )

  const round = roundData?.rounds?.find((r) => r.id === roundId) as (Round & { result?: unknown }) | undefined

  const {
    turns,
    currentQuestionIndex,
    isLoadingQuestion,
    isEvaluating,
    contextHint,
    fetchNextQuestion,
    submitAnswer,
    saveAnswer,
    generateVerdict,
    isGeneratingVerdict,
  } = useInterview()

  const answeredCount = turns.filter((t) => t.evaluation).length
  const isRoundComplete = round && answeredCount >= round.question_count
  const isLastQuestion = round && currentQuestionIndex === round.question_count - 1
  const currentTurn = turns[turns.length - 1]
  const waitingForAnswer = currentTurn && !currentTurn.evaluation && !isEvaluating && !isLoadingQuestion
  const canAskNext = currentTurn?.evaluation && !isLastQuestion && !isLoadingQuestion

  // Auto-ask first question on mount
  useEffect(() => {
    if (!round || turns.length > 0) return
    fetchNextQuestion({ sessionId, roundId, questionIndex: 0 })
  }, [round, turns.length, sessionId, roundId, fetchNextQuestion])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, isEvaluating, isLoadingQuestion])

  const handleNextQuestion = () => {
    fetchNextQuestion({
      sessionId,
      roundId,
      questionIndex: currentQuestionIndex + 1,
    })
  }

  const handleFinishRound = async () => {
    const verdict = await generateVerdict({ sessionId, roundId })
    if (verdict) {
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
                onSave={() =>
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
    </div>
  )
}
