'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileText, Loader2, UploadCloud, X } from 'lucide-react'

interface FileUploadZoneProps {
  label: string
  fileType: 'cv' | 'jd'
  onTextExtracted: (text: string, filePath: string) => void
  disabled?: boolean
}

export function FileUploadZone({
  label,
  fileType,
  onTextExtracted,
  disabled,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be under 5MB')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', fileType)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
        return
      }

      setUploadedFile(file.name)
      setPreview(data.text.slice(0, 300))
      // filePath may be null if storage bucket isn't set up — use filename as fallback ID
      onTextExtracted(data.text, data.filePath ?? file.name)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const clear = () => {
    setUploadedFile(null)
    setPreview(null)
    setError(null)
    onTextExtracted('', '')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {!uploadedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
            disabled={disabled}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Uploading & extracting text...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <UploadCloud className="w-8 h-8" />
              <div>
                <span className="text-sm font-medium text-foreground">Click to upload</span>
                <span className="text-sm"> or drag & drop</span>
              </div>
              <span className="text-xs">PDF only · Max 5MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4 text-primary" />
              {uploadedFile}
            </div>
            <Button variant="ghost" size="icon" onClick={clear} className="h-6 w-6">
              <X className="w-4 h-4" />
            </Button>
          </div>
          {preview && (
            <p className="text-xs text-muted-foreground line-clamp-3 border-t pt-2">{preview}...</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
