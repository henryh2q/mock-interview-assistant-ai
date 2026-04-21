'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Check, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface EditableTextAreaProps {
  label: string
  value: string
  onSave: (v: string) => Promise<void>
  minLength?: number
  rows?: number
}

export function EditableTextArea({
  label,
  value,
  onSave,
  minLength = 50,
  rows = 8,
}: EditableTextAreaProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim().length < minLength) {
      toast.warning(`${label} must be at least ${minLength} characters`)
      return
    }
    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={rows}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"
        />
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setDraft(value); setEditing(false) }}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative group">
      <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto pr-8">
        {value}
      </pre>
      <button
        type="button"
        onClick={() => { setDraft(value); setEditing(true) }}
        className="absolute top-0 right-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-100"
      >
        <Pencil className="w-3.5 h-3.5" /> Edit
      </button>
    </div>
  )
}
