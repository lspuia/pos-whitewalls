export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ status: 'ok', env: process.env.NODE_ENV })
}
