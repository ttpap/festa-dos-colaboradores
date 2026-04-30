import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const { judge_code, attraction_id, adesao_tema, criatividade, performance } = await request.json()

  const supabase = createAdminClient()

  const { data: judge, error: judgeError } = await supabase
    .from('judges')
    .select('id')
    .eq('code', judge_code)
    .single()

  if (judgeError || !judge) {
    return NextResponse.json({ error: 'Jurado inválido' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('votes')
    .upsert(
      { judge_id: judge.id, attraction_id, adesao_tema, criatividade, performance },
      { onConflict: 'attraction_id,judge_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}
