import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createAdminClient()

  const [attractionsRes, votesRes, judgesRes] = await Promise.all([
    supabase.from('attractions').select('*').order('event_date').order('ordem'),
    supabase.from('votes').select('*, judges(code, label)'),
    supabase.from('judges').select('*').order('created_at'),
  ])

  return NextResponse.json({
    attractions: attractionsRes.data ?? [],
    votes: votesRes.data ?? [],
    judges: judgesRes.data ?? [],
  })
}
