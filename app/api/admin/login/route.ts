import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorrecta' }, { status: 401 })
  }

  const session = await getSession()
  session.isAdmin = true
  await session.save()

  return NextResponse.json({ ok: true })
}
