import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = createAdminClient()

  const { data: judge } = await supabase
    .from('judges')
    .select('id, event_date')
    .eq('code', code)
    .single()

  if (!judge) return NextResponse.json({ error: 'Jurado não encontrado' }, { status: 404 })

  const { data: votes } = await supabase
    .from('votes')
    .select('*')
    .eq('judge_id', judge.id)

  return NextResponse.json({ votes: votes ?? [], event_date: judge.event_date })
}
