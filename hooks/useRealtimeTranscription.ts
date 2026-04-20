'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type TranscriptionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'paused'
  | 'error'

// A single word token with a timestamp so the UI can animate word-by-word.
export interface WordToken {
  word: string
  id: number   // monotonically increasing, used as React key
}

export interface UseRealtimeTranscriptionOptions {
  // Called the moment VAD commits a complete utterance (before Whisper finalization).
  // Use this to trigger answer generation immediately on speech end.
  onUtteranceCommit?: (text: string) => void
}

export interface UseRealtimeTranscriptionReturn {
  status: TranscriptionStatus
  // Tokens for the current in-progress utterance, streamed word-by-word
  liveTokens: WordToken[]
  // Full text of previously committed + finalized utterances
  committedText: string
  errorMessage: string | null
  start: (useSystemAudio?: boolean) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  clearTranscript: () => void
  // Manually commit whatever is currently in liveTokens as a question
  commitManual: () => void
}

let tokenIdCounter = 0

export function useRealtimeTranscription(
  opts: UseRealtimeTranscriptionOptions = {},
): UseRealtimeTranscriptionReturn {
  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [liveTokens, setLiveTokens] = useState<WordToken[]>([])
  const [committedText, setCommittedText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const wsRef           = useRef<WebSocket | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef    = useRef<ScriptProcessorNode | null>(null)
  const pausedRef       = useRef(false)
  // Accumulates raw delta text so we can split into word tokens
  const deltaBufferRef  = useRef('')
  // Latest committed text for manual commit
  const liveTokensRef   = useRef<WordToken[]>([])
  const onCommitRef     = useRef(opts.onUtteranceCommit)

  // Keep callback ref fresh without re-running effects
  useEffect(() => { onCommitRef.current = opts.onUtteranceCommit }, [opts.onUtteranceCommit])
  // Mirror liveTokens into a ref for use in callbacks
  useEffect(() => { liveTokensRef.current = liveTokens }, [liveTokens])

  const cleanup = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000)
    }
    wsRef.current = null
    pausedRef.current = false
    deltaBufferRef.current = ''
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  // Splits a raw delta string into word tokens and appends to liveTokens.
  // Deltas from Whisper arrive mid-word, so we only emit a token when we see
  // a space boundary (complete word), buffering incomplete trailing text.
  const appendDelta = useCallback((delta: string) => {
    deltaBufferRef.current += delta
    const parts = deltaBufferRef.current.split(' ')
    // Last part may be incomplete — keep it in the buffer
    deltaBufferRef.current = parts.pop() ?? ''

    const newTokens: WordToken[] = parts
      .filter((w) => w.length > 0)
      .map((word) => ({ word, id: ++tokenIdCounter }))

    if (newTokens.length > 0) {
      setLiveTokens((prev) => [...prev, ...newTokens])
    }
  }, [])

  // Called when Whisper finalizes a complete utterance
  const finalizeUtterance = useCallback((finalText: string) => {
    // Flush any remaining buffer as a final token
    if (deltaBufferRef.current.trim()) {
      setLiveTokens((prev) => [
        ...prev,
        { word: deltaBufferRef.current.trim(), id: ++tokenIdCounter },
      ])
      deltaBufferRef.current = ''
    }

    const text = finalText.trim()
    if (text) {
      setCommittedText((prev) => (prev ? `${prev} ${text}` : text))
    }
    setLiveTokens([])
  }, [])

  const start = useCallback(async (useSystemAudio = false) => {
    if (status === 'listening' || status === 'connecting') return
    setStatus('connecting')
    setErrorMessage(null)

    try {
      // 1. Get ephemeral token
      const tokenRes = await fetch('/api/realtime/session', { method: 'POST' })
      const tokenData = await tokenRes.json() as { error?: string; client_secret?: { value?: string } | string }
      if (!tokenRes.ok) throw new Error(tokenData.error ?? 'Failed to create realtime session')
      const ephemeralKey =
        typeof tokenData.client_secret === 'object'
          ? tokenData.client_secret?.value
          : tokenData.client_secret

      // 2. Capture audio
      let stream: MediaStream
      if (useSystemAudio) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: false, audio: true })
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        })
      }
      streamRef.current = stream

      // 3. Open WebSocket
      const ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview',
        ['realtime', `openai-insecure-api-key.${ephemeralKey}`, 'openai-beta.realtime-v1'],
      )
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text'],
            instructions: 'Transcribe speech accurately word by word. Do not generate responses.',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,  // slightly tighter than before
            },
          },
        }))
        setStatus('listening')
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string
            delta?: string
            transcript?: string
            error?: { message?: string }
          }

          // Word-by-word delta — fires as Whisper recognizes each word
          if (msg.type === 'conversation.item.input_audio_transcription.delta') {
            appendDelta(msg.delta ?? '')
          }

          // Utterance complete — Whisper finalized the full sentence
          if (msg.type === 'conversation.item.input_audio_transcription.completed') {
            const text = (msg.transcript ?? '').trim()
            finalizeUtterance(text)
            // Fire the commit callback immediately after finalization
            if (text && onCommitRef.current) onCommitRef.current(text)
          }

          // VAD detected speech end — fire commit callback early with live tokens
          // so answer generation starts ~300-500ms before Whisper finalizes.
          if (msg.type === 'input_audio_buffer.speech_stopped') {
            const partial = [
              ...liveTokensRef.current.map((t) => t.word),
              deltaBufferRef.current.trim(),
            ].filter(Boolean).join(' ').trim()

            if (partial && onCommitRef.current) {
              onCommitRef.current(partial)
            }
          }

          if (msg.type === 'error') {
            setErrorMessage(msg.error?.message ?? 'Realtime API error')
            setStatus('error')
          }
        } catch {
          // ignore malformed frames
        }
      }

      ws.onerror = () => {
        setErrorMessage('WebSocket connection failed')
        setStatus('error')
        cleanup()
      }

      ws.onclose = (e) => {
        if (e.code !== 1000) setStatus('idle')
      }

      // 4. Pipe audio → PCM16 → WebSocket
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(2048, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (pausedRef.current) return
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

        const float32 = e.inputBuffer.getChannelData(0)
        const pcm16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
        }
        // Use a more efficient base64 encoding for large buffers
        const bytes = new Uint8Array(pcm16.buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }))
      }

      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start'
      setErrorMessage(msg)
      setStatus('error')
      cleanup()
    }
  }, [status, cleanup, appendDelta, finalizeUtterance])

  const stop = useCallback(() => {
    cleanup()
    setStatus('idle')
    setLiveTokens([])
  }, [cleanup])

  const pause = useCallback(() => {
    pausedRef.current = true
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    setStatus('listening')
  }, [])

  const clearTranscript = useCallback(() => {
    setLiveTokens([])
    setCommittedText('')
    deltaBufferRef.current = ''
  }, [])

  const commitManual = useCallback(() => {
    const text = [
      ...liveTokensRef.current.map((t) => t.word),
      deltaBufferRef.current.trim(),
    ].filter(Boolean).join(' ').trim()

    if (text && onCommitRef.current) onCommitRef.current(text)
  }, [])

  return {
    status,
    liveTokens,
    committedText,
    errorMessage,
    start,
    stop,
    pause,
    resume,
    clearTranscript,
    commitManual,
  }
}
