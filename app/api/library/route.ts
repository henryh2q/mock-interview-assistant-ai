import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { savedAnswerRepository } from '@/repositories/saved-answer.repository'
import { toApiError } from '@/lib/errors'
import { RoundType } from '@/types/database'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthSession()
    const { searchParams } = new URL(req.url)

    const roundType = searchParams.get('round_type') as RoundType | null
    const search = searchParams.get('search') ?? undefined

    const answers = await savedAnswerRepository.findByUserId(auth.userId, {
      roundType: roundType ?? undefined,
      search,
    })

    return NextResponse.json({ answers })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthSession()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await savedAnswerRepository.delete(id, auth.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
