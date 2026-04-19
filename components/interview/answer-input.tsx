'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/interview/voice-input'
import { useVoice } from '@/hooks/useVoice'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

const MIN_LENGTH = 20
const MAX_LENGTH = 2000

interface AnswerInputProps {
  onSubmit: (answer: string) => void
  disabled?: boolean
  isEvaluating?: boolean
}

export function AnswerInput({ onSubmit, disabled, isEvaluating }: AnswerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [charCount, setCharCount] = useState(0)
  const { recordingState, startRecording, stopRecording } = useVoice()

  const isRecordingOrTranscribing = recordingState !== 'idle'

  const syncCount = useCallback(() => {
    const val = textareaRef.current?.value ?? ''
    setCharCount(val.trim().length)
  }, [])

  // Native event listeners — covers iOS Safari where React onChange can miss events
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.addEventListener('input', syncCount)
    el.addEventListener('change', syncCount)
    el.addEventListener('keyup', syncCount)
    el.addEventListener('compositionend', syncCount)
    return () => {
      el.removeEventListener('input', syncCount)
      el.removeEventListener('change', syncCount)
      el.removeEventListener('keyup', syncCount)
      el.removeEventListener('compositionend', syncCount)
    }
  }, [syncCount])

  const handleSubmit = () => {
    // Always read directly from the DOM — never trust React state for the value
    const value = textareaRef.current?.value.trim() ?? ''
    if (value.length < MIN_LENGTH) {
      toast.warning(`Answer must be at least ${MIN_LENGTH} characters`)
      return
    }
    if (value.length > MAX_LENGTH) {
      toast.warning(`Answer must be under ${MAX_LENGTH} characters`)
      return
    }
    if (disabled || isEvaluating) return
    onSubmit(value)
    if (textareaRef.current) textareaRef.current.value = ''
    setCharCount(0)
  }

  const handleStopRecording = async () => {
    const transcript = await stopRecording()
    if (transcript && textareaRef.current) {
      const sep = textareaRef.current.value.trim() ? ' ' : ''
      textareaRef.current.value += sep + transcript
      syncCount()
    }
  }

  const isOverLimit = charCount > MAX_LENGTH
  const isTooShort = charCount < MIN_LENGTH
  const isDisabled = disabled || isEvaluating || isRecordingOrTranscribing

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        placeholder="Type your answer or use the mic to speak..."
        disabled={isDisabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
        className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 resize-none"
        maxLength={MAX_LENGTH + 50}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              isOverLimit
                ? 'text-destructive'
                : isTooShort && charCount > 0
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
            }`}
          >
            {charCount}/{MAX_LENGTH}
            {isTooShort && charCount > 0 && ` · min ${MIN_LENGTH} chars`}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">⌘ + Enter to submit</span>
        </div>

        <div className="flex items-center gap-2">
          <VoiceInput
            recordingState={recordingState}
            onStart={startRecording}
            onStop={handleStopRecording}
            disabled={disabled || isEvaluating}
          />

          {/* Button is never disabled by charCount — validation happens inside handleSubmit
              so iOS users can always tap it and get a clear toast if too short */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || isEvaluating || isRecordingOrTranscribing}
            size="sm"
            className="gap-1"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Answer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
