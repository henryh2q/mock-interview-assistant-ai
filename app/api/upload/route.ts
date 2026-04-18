import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { requireAuthSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { toApiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text.trim()
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthSession()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('type') as string | null

    if (!file) throw new ValidationError('No file provided')
    if (!fileType || !['cv', 'jd'].includes(fileType)) {
      throw new ValidationError('File type must be "cv" or "jd"')
    }
    if (file.type !== 'application/pdf') {
      throw new ValidationError('Only PDF files are accepted')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError('File size must be under 5MB')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${auth.userId}/${fileType}/${Date.now()}.pdf`

    // Storage upload (optional — app works without it)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('interview-docs')
      .upload(fileName, buffer, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      logger.warn('File storage failed (continuing without storage)', {
        userId: auth.userId,
        fileType,
        error: uploadError.message,
      })
    }

    // Extract text using the new class-based PDFParse API
    let text = ''
    try {
      text = await extractTextFromPDF(buffer)
    } catch (parseError) {
      logger.warn('PDF text extraction failed', {
        userId: auth.userId,
        fileType,
        error: String(parseError),
      })
    }

    const storedPath = uploadError ? null : fileName
    logger.info('File processed', {
      userId: auth.userId,
      fileType,
      chars: text.length,
      stored: !uploadError,
    })

    return NextResponse.json({ filePath: storedPath ?? file.name, text })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
