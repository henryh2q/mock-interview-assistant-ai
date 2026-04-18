'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUploadZone } from '@/components/session/file-upload-zone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, ArrowLeft, AlertCircle, Shuffle, Bot } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MODEL_OPTIONS, DEFAULT_MODEL, type Provider } from '@/lib/ai/providers'

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  xai: 'xAI',
}

const PROVIDERS: Provider[] = ['openai', 'anthropic', 'xai']

export default function NewSessionPage() {
  const router = useRouter()
  const [cvText, setCvText] = useState('')
  const [cvFilePath, setCvFilePath] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdFilePath, setJdFilePath] = useState('')
  const [extraInfo, setExtraInfo] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Enable button if: file uploaded OR enough text pasted (>=50 chars)
  const cvReady = cvFilePath !== '' || cvText.length >= 50
  const jdReady = jdFilePath !== '' || jdText.length >= 50
  const canSubmit = cvReady && jdReady

  // Show paste fallback when file uploaded but text extraction failed
  const cvNeedsPaste = cvFilePath !== '' && cvText.length < 50
  const jdNeedsPaste = jdFilePath !== '' && jdText.length < 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_text: cvText,
          jd_text: jdText,
          extra_info: extraInfo || null,
          name: sessionName || null,
          cv_file_path: cvFilePath || null,
          jd_file_path: jdFilePath || null,
          ai_model: aiModel,
          shuffle_questions: shuffleQuestions,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create session')
        return
      }

      toast.success('Session created!')
      router.push(`/sessions/${data.session.id}/review`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Interview Session</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your CV and job description to generate a personalized interview plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CV Upload */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold">1. Your CV</h2>
          <FileUploadZone
            label="Upload CV (PDF)"
            fileType="cv"
            onTextExtracted={(text, path) => {
              setCvText(text)
              setCvFilePath(path)
            }}
            disabled={loading}
          />
          {/* Show paste fallback if: no file yet, OR file uploaded but text extraction failed */}
          {(!cvFilePath || cvNeedsPaste) && (
            <div className="pt-1 space-y-1.5">
              {cvNeedsPaste && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Could not extract text from this PDF. Please paste your CV content below.
                </div>
              )}
              <Label className="text-sm text-muted-foreground">
                {cvNeedsPaste ? 'Paste CV text (required)' : 'Or paste CV text'}
              </Label>
              <Textarea
                placeholder="Paste your CV content here..."
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                className="min-h-[100px]"
                disabled={loading}
              />
            </div>
          )}
        </div>

        {/* JD Upload */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold">2. Job Description</h2>
          <Tabs defaultValue="upload">
            <TabsList className="mb-3">
              <TabsTrigger value="upload">Upload PDF</TabsTrigger>
              <TabsTrigger value="paste">Paste Text</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-3">
              <FileUploadZone
                label="Upload Job Description (PDF)"
                fileType="jd"
                onTextExtracted={(text, path) => {
                  setJdText(text)
                  setJdFilePath(path)
                }}
                disabled={loading}
              />
              {jdNeedsPaste && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Could not extract text from this PDF. Please paste the JD content below.
                  </div>
                  <Label className="text-sm text-muted-foreground">Paste JD text (required)</Label>
                  <Textarea
                    placeholder="Paste the job description here..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="min-h-[120px]"
                    disabled={loading}
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="paste">
              <Textarea
                placeholder="Paste the job description here..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                className="min-h-[160px]"
                disabled={loading}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Extra info */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">3. Extra Information <span className="text-muted-foreground font-normal text-sm">(optional)</span></h2>

          <div className="space-y-2">
            <Label>Session Name</Label>
            <Input
              placeholder="e.g. Shopee Backend Engineer – April 2026"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={loading}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Context</Label>
            <Textarea
              placeholder="e.g. Target company is Shopee. I'm weak on system design. Interview is in 2 weeks."
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              disabled={loading}
              maxLength={500}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground text-right">{extraInfo.length}/500</p>
          </div>

          {/* AI Model selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              AI Model
            </Label>
            <div className="space-y-3">
              {PROVIDERS.map((provider) => {
                const models = MODEL_OPTIONS.filter((m) => m.provider === provider)
                return (
                  <div key={provider}>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      {PROVIDER_LABELS[provider]}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {models.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          disabled={loading}
                          onClick={() => setAiModel(m.value)}
                          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            aiModel === m.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          <p className="text-xs font-semibold leading-tight">{m.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Shuffle questions toggle */}
          <button
            type="button"
            disabled={loading}
            onClick={() => setShuffleQuestions((v) => !v)}
            className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
              shuffleQuestions
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Shuffle className={`w-4 h-4 ${shuffleQuestions ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-left">
                <p className={`text-sm font-medium ${shuffleQuestions ? 'text-primary' : ''}`}>
                  Mix question order
                </p>
                <p className="text-xs text-muted-foreground">
                  Randomize focus areas so questions come in unpredictable order
                </p>
              </div>
            </div>
            <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
              shuffleQuestions ? 'bg-primary' : 'bg-muted'
            }`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                shuffleQuestions ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canSubmit && (
          <p className="text-sm text-muted-foreground text-center">
            {!cvReady && !jdReady
              ? 'Upload or paste both your CV and job description to continue'
              : !cvReady
                ? 'Add your CV to continue'
                : 'Add the job description to continue'}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={!canSubmit || loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating session...
            </>
          ) : (
            'Create Session & Generate Interview Plan'
          )}
        </Button>
      </form>
    </div>
  )
}
