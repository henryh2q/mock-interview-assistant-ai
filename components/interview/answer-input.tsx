'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { VoiceInput } from '@/components/interview/voice-input'
import { useVoice } from '@/hooks/useVoice'
import { Loader2, Send } from 'lucide-react'

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
  const isTooShort = charCount < MIN_LENGTH
  const isOverLimit = charCount > MAX_LENGTH

  // Native event listeners for iOS Safari compatibility
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const update = () => setCharCount(el.value.trim().length)
    el.addEventListener('input', update)
    el.addEventListener('change', update)
    return () => {
      el.removeEventListener('input', update)
      el.removeEventListener('change', update)
    }
  }, [])

  const handleSubmit = () => {
    const value = textareaRef.current?.value.trim() ?? ''
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH || disabled) return
    onSubmit(value)
    if (textareaRef.current) textareaRef.current.value = ''
    setCharCount(0)
  }

  const handleStopRecording = async () => {
    const transcript = await stopRecording()
    if (transcript && textareaRef.current) {
      const sep = textareaRef.current.value.trim() ? ' ' : ''
      textareaRef.current.value += sep + transcript
      setCharCount(textareaRef.current.value.trim().length)
    }
  }

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
              isTooShort && charCount > 0
                ? 'text-amber-600'
                : isOverLimit
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {charCount}/{MAX_LENGTH}
            {isTooShort && charCount > 0 && ` · min ${MIN_LENGTH} characters`}
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

          <Button
            onClick={handleSubmit}
            disabled={disabled || isEvaluating || isTooShort || isOverLimit || isRecordingOrTranscribing}
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
