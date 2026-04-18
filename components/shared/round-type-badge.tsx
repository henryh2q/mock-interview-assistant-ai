import { Badge } from '@/components/ui/badge'
import { RoundType } from '@/types/database'

const config: Record<RoundType, { label: string; className: string }> = {
  hr: { label: 'HR Screen', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  technical: { label: 'Technical', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  culture_fit: { label: 'Culture Fit', className: 'bg-teal-100 text-teal-800 border-teal-200' },
}

export function RoundTypeBadge({ type }: { type: RoundType | string }) {
  const c = config[type as RoundType] ?? { label: type, className: 'bg-gray-100 text-gray-800 border-gray-200' }
  return (
    <Badge variant="outline" className={`${c.className} border font-medium`}>
      {c.label}
    </Badge>
  )
}
