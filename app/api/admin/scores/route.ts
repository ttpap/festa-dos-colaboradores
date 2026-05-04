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

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { event_date } = await request.json()
  if (!event_date) return NextResponse.json({ error: 'event_date obrigatório' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: attractions } = await supabase
    .from('attractions')
    .select('id')
    .eq('event_date', event_date)

  const ids = (attractions ?? []).map((a: { id: string }) => a.id)
  if (ids.length === 0) return NextResponse.json({ deleted: 0 })

  const { count, error } = await supabase
    .from('votes')
    .delete({ count: 'exact' })
    .in('attraction_id', ids)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}
