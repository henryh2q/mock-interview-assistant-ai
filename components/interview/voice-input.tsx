'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecordingState } from '@/hooks/useVoice'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  recordingState: RecordingState
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export function VoiceInput({ recordingState, onStart, onStop, disabled }: VoiceInputProps) {
  const isRecording = recordingState === 'recording'
  const isTranscribing = recordingState === 'transcribing'

  const handleClick = () => {
    if (isRecording) {
      onStop()
    } else if (recordingState === 'idle') {
      onStart()
    }
  }

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Record answer'}
      className={cn(
        'flex-shrink-0 transition-all',
        isRecording && 'animate-pulse',
      )}
    >
      {isTranscribing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  )
}
