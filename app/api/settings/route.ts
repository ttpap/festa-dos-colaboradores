import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('settings').select('*')

  const map: Record<string, string> = {}
  data?.forEach((s) => { map[s.key] = s.value })
  return NextResponse.json(map)
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const updates: Record<string, string> = await request.json()
  const supabase = createAdminClient()

  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      supabase.from('settings').update({ value }).eq('key', key)
    )
  )

  return NextResponse.json({ ok: true })
}
