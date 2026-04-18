'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  const [answer, setAnswer] = useState('')
  const { recordingState, startRecording, stopRecording } = useVoice()

  const isTooShort = answer.trim().length < MIN_LENGTH
  const isOverLimit = answer.length > MAX_LENGTH
  const isRecordingOrTranscribing = recordingState !== 'idle'

  const handleSubmit = () => {
    if (isTooShort || isOverLimit || disabled) return
    onSubmit(answer.trim())
    setAnswer('')
  }

  const handleStopRecording = async () => {
    const transcript = await stopRecording()
    if (transcript) {
      setAnswer((prev) => {
        const separator = prev.trim() ? ' ' : ''
        return prev + separator + transcript
      })
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Type your answer or use the mic to speak..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={disabled || isEvaluating || isRecordingOrTranscribing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
        }}
        className="min-h-[120px] resize-none"
        maxLength={MAX_LENGTH + 50}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              isTooShort && answer.length > 0
                ? 'text-amber-600'
                : isOverLimit
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {answer.trim().length}/{MAX_LENGTH}
            {isTooShort && answer.length > 0 && ` · min ${MIN_LENGTH} characters`}
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
