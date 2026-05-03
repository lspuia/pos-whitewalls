import { ResetForm } from './reset-form'

export const metadata = { title: 'Set password' }

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-gray-900">Set your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a password for your account.
          </p>
        </div>
        <ResetForm />
      </div>
    </div>
  )
}
