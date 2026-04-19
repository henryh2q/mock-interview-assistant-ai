'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

export type RecordingState = 'idle' | 'recording' | 'transcribing'
export type PlaybackState = 'idle' | 'loading' | 'playing'

export interface UseVoiceReturn {
  recordingState: RecordingState
  playbackState: PlaybackState
  startRecording: () => Promise<void>
  stopRecording: () => Promise<string | null>
  speak: (text: string) => Promise<void>
  stopSpeaking: () => void
}

export function useVoice(): UseVoiceReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    if (recordingState !== 'idle') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(250)
      setRecordingState('recording')
    } catch {
      toast.error('Microphone access denied. Please allow microphone permissions.')
    }
  }, [recordingState])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recordingState !== 'recording') return null

    setRecordingState('transcribing')

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })

        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        mediaRecorderRef.current = null

        if (blob.size < 1000) {
          toast.error('Recording too short. Please speak for at least a second.')
          setRecordingState('idle')
          resolve(null)
          return
        }

        try {
          const formData = new FormData()
          formData.append('audio', blob)

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await res.json()
          if (!res.ok) {
            toast.error(data.error ?? 'Transcription failed')
            resolve(null)
            return
          }

          resolve(data.text as string)
        } catch {
          toast.error('Transcription failed. Please try again.')
          resolve(null)
        } finally {
          setRecordingState('idle')
        }
      }

      recorder.stop()
    })
  }, [recordingState])

  const speak = useCallback(async (text: string) => {
    if (playbackState !== 'idle') {
      audioRef.current?.pause()
      setPlaybackState('idle')
      return
    }

    setPlaybackState('loading')

    // iOS Safari requires audio.play() to be called synchronously within a
    // user gesture. We create and unlock the audio element immediately (before
    // any await), then load the real src once the fetch completes.
    const audio = new Audio()
    audioRef.current = audio

    // Unlock audio context on iOS by playing a silent data URL synchronously
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAA' +
      'EAAQARKwAAESsAAAEACABkYXRhAAAAAA=='
    audio.play().catch(() => {}) // intentionally silent; errors are fine here

    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Text-to-speech failed')
        setPlaybackState('idle')
        return
      }

      const arrayBuffer = await res.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ''),
      )
      const dataUrl = `data:audio/mpeg;base64,${base64}`

      audio.onended = () => setPlaybackState('idle')
      audio.onerror = () => {
        toast.error('Playback failed. Please try again.')
        setPlaybackState('idle')
      }

      audio.src = dataUrl
      setPlaybackState('playing')
      await audio.play()
    } catch {
      toast.error('Text-to-speech failed. Please try again.')
      setPlaybackState('idle')
    }
  }, [playbackState])

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaybackState('idle')
  }, [])

  return { recordingState, playbackState, startRecording, stopRecording, speak, stopSpeaking }
}
