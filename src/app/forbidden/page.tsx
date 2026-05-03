import Link from 'next/link'

export const metadata = { title: '403 Forbidden' }

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500">403</p>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">
          Access denied
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/dashboard/memos"
          className="mt-4 inline-block text-sm text-gray-900 underline underline-offset-2"
        >
          Go to memos
        </Link>
      </div>
    </div>
  )
}
