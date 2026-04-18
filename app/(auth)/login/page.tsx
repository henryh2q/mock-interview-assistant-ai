import { redirect } from 'next/navigation'
import { getAuthSession } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'
import { Bot } from 'lucide-react'

export const metadata = { title: 'Sign In — Mock Interview AI' }

export default async function LoginPage() {
  const session = await getAuthSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <Bot className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Mock Interview AI</h1>
          <p className="text-muted-foreground mt-2">
            Practice interviews tailored to your CV and job description
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <h2 className="text-lg font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your phone number to get started</p>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          New number? We&apos;ll create your account automatically.
        </p>
      </div>
    </div>
  )
}
