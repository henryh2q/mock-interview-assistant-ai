import { NextRequest, NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { messageRepository } from '@/repositories/message.repository'
import { evaluationRepository } from '@/repositories/evaluation.repository'
import { toApiError, NotFoundError, UnauthorizedError } from '@/lib/errors'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuthSession()
    const { id: sessionId } = await params

    const session = await sessionRepository.findById(sessionId)
    if (!session) throw new NotFoundError('Session')
    if (session.user_id !== auth.userId) throw new UnauthorizedError()

    const rounds = await roundRepository.findBySessionId(sessionId)

    const roundsWithData = await Promise.all(
      rounds.map(async (round) => {
        const [messages, evaluations, result] = await Promise.all([
          messageRepository.findByRoundId(round.id),
          evaluationRepository.findByRoundId(round.id),
          evaluationRepository.findRoundResult(round.id),
        ])
        return { ...round, messages, evaluations, result }
      }),
    )

    return NextResponse.json({ rounds: roundsWithData })
  } catch (error) {
    const apiError = toApiError(error)
    return NextResponse.json(
      { error: apiError.message, code: apiError.code },
      { status: apiError.statusCode },
    )
  }
}
