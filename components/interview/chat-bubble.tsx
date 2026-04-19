'use client'

import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVoice } from '@/hooks/useVoice'
import { Button } from '@/components/ui/button'

interface ChatBubbleProps {
  role: 'interviewer' | 'candidate'
  content: string
  questionIndex?: number | null
}

function InterviewerBubble({ content, questionIndex }: { content: string; questionIndex?: number | null }) {
  const { playbackState, speak, stopSpeaking } = useVoice()
  const isPlaying = playbackState === 'playing'
  const isLoading = playbackState === 'loading'

  return (
    <div className="flex gap-3 flex-row">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-primary">
        <Bot className="w-4 h-4" />
      </div>

      <div className="max-w-[80%] space-y-1">
        {questionIndex !== null && questionIndex !== undefined && (
          <p className="text-xs text-muted-foreground font-medium">
            Question {questionIndex + 1}
          </p>
        )}
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-muted text-foreground rounded-tl-sm relative group">
          {content}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute -right-9 top-1/2 -translate-y-1/2 h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            onClick={() => (isPlaying ? stopSpeaking() : speak(content))}
            disabled={isLoading}
            title={isPlaying ? 'Stop' : 'Listen to question'}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ChatBubble({ role, content, questionIndex }: ChatBubbleProps) {
  if (role === 'interviewer') {
    return <InterviewerBubble content={content} questionIndex={questionIndex} />
  }

  return (
    <div className="flex gap-3 flex-row-reverse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white bg-slate-500">
        <User className="w-4 h-4" />
      </div>
      <div className="max-w-[80%] space-y-1 items-end">
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-primary text-primary-foreground rounded-tr-sm">
          {content}
        </div>
      </div>
    </div>
  )
}
