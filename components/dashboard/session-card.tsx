import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Session } from '@/types/database'
import { formatDate, truncate } from '@/lib/utils'
import { CalendarDays, Clock, BookOpen, Radio } from 'lucide-react'

interface SessionCardProps {
  session: Session
  completedRounds?: number
  totalRounds?: number
  overallScore?: number | null
}

export function SessionCard({
  session,
  completedRounds = 0,
  totalRounds = 0,
  overallScore,
}: SessionCardProps) {
  const isCompleted = session.status === 'completed'
  const isActive = session.status === 'active'

  const practiceHref = isCompleted
    ? `/sessions/${session.id}/history`
    : `/sessions/${session.id}/review`

  const interviewingHref = `/sessions/${session.id}/interviewing`

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug">
            {truncate(session.name ?? 'Interview Session', 60)}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0'
                : isActive
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shrink-0'
                  : 'bg-gray-50 text-gray-600 border-gray-200 shrink-0'
            }
          >
            {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Draft'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {formatDate(session.created_at)}
          </span>
          {totalRounds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {completedRounds}/{totalRounds} rounds
            </span>
          )}
          {overallScore !== null && overallScore !== undefined && (
            <span className="font-medium text-foreground">
              Score: {overallScore}/10
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
          <Link href={practiceHref}>
            <BookOpen className="w-3.5 h-3.5" />
            {isCompleted ? 'Review' : isActive ? 'Practice' : 'Set Up'}
          </Link>
        </Button>
        {(isActive || isCompleted) && (
          <Button asChild size="sm" className="flex-1 gap-1.5 bg-red-500 hover:bg-red-600 text-white">
            <Link href={interviewingHref}>
              <Radio className="w-3.5 h-3.5" />
              Interviewing
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
