import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'
import { NavBar } from '@/components/shared/nav-bar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
