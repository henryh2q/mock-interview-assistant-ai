import { Badge } from '@/components/ui/badge'
import { CheckCircle, RefreshCw } from 'lucide-react'

interface VerdictBadgeProps {
  verdict: 'pass' | 'practice'
  size?: 'sm' | 'lg'
}

export function VerdictBadge({ verdict, size = 'sm' }: VerdictBadgeProps) {
  const isPass = verdict === 'pass'
  const sizeClass = size === 'lg' ? 'text-base px-4 py-2' : 'text-sm'

  return (
    <Badge
      variant="outline"
      className={`${sizeClass} font-semibold border-2 gap-1 ${
        isPass
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'bg-amber-50 text-amber-700 border-amber-300'
      }`}
    >
      {isPass ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      {isPass ? 'Pass' : 'Keep Practicing'}
    </Badge>
  )
}
