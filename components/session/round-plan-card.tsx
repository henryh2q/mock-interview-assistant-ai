import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RoundTypeBadge } from '@/components/shared/round-type-badge'
import { RoundPlan } from '@/types/ai'
import { Clock, HelpCircle, X } from 'lucide-react'

interface RoundPlanCardProps {
  round: RoundPlan
  index: number
  onRemove?: (index: number) => void
  readOnly?: boolean
}

export function RoundPlanCard({ round, index, onRemove, readOnly }: RoundPlanCardProps) {
  return (
    <Card className="relative">
      {!readOnly && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(index)}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <CardHeader className="pb-2 pr-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">Round {index + 1}</span>
          <RoundTypeBadge type={round.type} />
        </div>
        <CardTitle className="text-base">{round.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {round.duration_min} min
          </span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            {round.question_count} questions
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Focus areas</p>
          <div className="flex flex-wrap gap-1.5">
            {round.focus_areas.map((area) => (
              <Badge key={area} variant="secondary" className="text-xs">
                {area}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
