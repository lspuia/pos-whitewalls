import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Staff access only</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
