import Link from 'next/link'
import { requireAuthSession } from '@/lib/auth'
import { sessionRepository } from '@/repositories/session.repository'
import { roundRepository } from '@/repositories/round.repository'
import { SessionCard } from '@/components/dashboard/session-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Plus, BrainCircuit } from 'lucide-react'

export const metadata = { title: 'Dashboard — Mock Interview AI' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const auth = await requireAuthSession()
  const sessions = await sessionRepository.findByUserId(auth.userId)

  const sessionsWithMeta = await Promise.all(
    sessions.map(async (session) => {
      const rounds = await roundRepository.findBySessionId(session.id)
      const completedRounds = rounds.filter((r) => r.status === 'completed').length
      return { session, completedRounds, totalRounds: rounds.length }
    }),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button asChild>
          <Link href="/sessions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<BrainCircuit className="w-8 h-8" />}
          title="No sessions yet"
          description="Start your first mock interview. Upload your CV and job description to get a personalized interview plan."
          action={{ label: 'Start First Session', href: '/sessions/new' }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessionsWithMeta.map(({ session, completedRounds, totalRounds }) => (
            <SessionCard
              key={session.id}
              session={session}
              completedRounds={completedRounds}
              totalRounds={totalRounds}
            />
          ))}
        </div>
      )}
    </div>
  )
}
