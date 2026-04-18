import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'

export default async function RootPage() {
  const session = await getAuthSession()
  if (session) redirect('/dashboard')
  redirect('/login')
}
