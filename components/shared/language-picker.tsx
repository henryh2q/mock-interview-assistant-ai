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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as InterviewLanguage)}
      className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.flag} {opt.label}
        </option>
      ))}
    </select>
  )
}

export const LANGUAGE_LABELS: Record<InterviewLanguage, string> = {
  english:    '🇬🇧 English',
  vietnamese: '🇻🇳 Vietnamese',
}
