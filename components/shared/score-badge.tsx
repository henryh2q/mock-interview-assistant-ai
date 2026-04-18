import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreBadge({ score, showLabel = true, size = 'md' }: ScoreBadgeProps) {
  const color =
    score >= 8
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : score >= 6
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : score >= 4
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-red-100 text-red-800 border-red-200'

  const label =
    score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Fair' : 'Needs Work'

  const sizeClass = size === 'lg' ? 'text-lg px-3 py-1' : size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <Badge variant="outline" className={cn(color, sizeClass, 'font-semibold border')}>
      {score}/10{showLabel && ` · ${label}`}
    </Badge>
  )
}
