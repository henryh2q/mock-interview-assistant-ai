'use client'

import { type InterviewLanguage } from '@/types/database'

interface Option {
  value: InterviewLanguage
  label: string
  flag: string
  description: string
}

const OPTIONS: Option[] = [
  { value: 'english',    label: 'English',    flag: '🇬🇧', description: 'Answer in English — pronunciation guide enabled' },
  { value: 'vietnamese', label: 'Vietnamese',  flag: '🇻🇳', description: 'Answer in Vietnamese' },
]

interface LanguagePickerProps {
  value: InterviewLanguage
  onChange: (v: InterviewLanguage) => void
}

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-3 py-3 text-left transition-colors ${
            value === opt.value
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <p className="text-sm font-semibold">{opt.flag} {opt.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{opt.description}</p>
        </button>
      ))}
    </div>
  )
}

export const LANGUAGE_LABELS: Record<InterviewLanguage, string> = {
  english:    '🇬🇧 English',
  vietnamese: '🇻🇳 Vietnamese',
}
