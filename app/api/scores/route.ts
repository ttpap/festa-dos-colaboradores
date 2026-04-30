import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()

  const { data: eventSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'active_event')
    .single()

  const activeEvent = eventSetting?.value ?? '2026-05-05'

  const [attractionsRes, votesRes] = await Promise.all([
    supabase
      .from('attractions')
      .select('id, nome, tema, ordem')
      .eq('event_date', activeEvent)
      .order('ordem'),
    supabase.from('votes').select('attraction_id, total'),
  ])

  const attractions = attractionsRes.data ?? []
  const votes = votesRes.data ?? []

  const scores = attractions.map((a) => {
    const aVotes = votes.filter((v) => v.attraction_id === a.id)
    return {
      id: a.id,
      nome: a.nome,
      tema: a.tema,
      ordem: a.ordem,
      total_score: aVotes.reduce((sum, v) => sum + (v.total ?? 0), 0),
      vote_count: aVotes.length,
    }
  })

  return NextResponse.json(scores)
}
