import { Progress } from '@/components/ui/progress'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { RoundType } from '@/types/database'

interface RoundProgressProps {
  roundTitle: string
  roundType: RoundType
  currentQuestion: number
  totalQuestions: number
}

export function RoundProgress({
  roundTitle,
  roundType,
  currentQuestion,
  totalQuestions,
}: RoundProgressProps) {
  const progress = totalQuestions > 0 ? (currentQuestion / totalQuestions) * 100 : 0

  return (
    <div className="space-y-2 p-4 border-b bg-background">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RoundTypeBadge type={roundType} />
          <span className="text-sm font-medium">{roundTitle}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Question {currentQuestion} of {totalQuestions}
        </span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}
