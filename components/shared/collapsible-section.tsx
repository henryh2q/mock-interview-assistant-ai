'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
  open: boolean
  onToggle: () => void
  icon?: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function CollapsibleSection({
  open,
  onToggle,
  icon,
  title,
  subtitle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium min-w-0">
          {icon}
          <span className="shrink-0">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground font-normal truncate">— {subtitle}</span>
          )}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t pt-3">{children}</div>}
    </div>
  )
}
