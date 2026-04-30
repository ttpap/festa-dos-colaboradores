import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('attractions')
    .select('*')
    .order('event_date')
    .order('ordem')

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('attractions')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await request.json()
  const supabase = createAdminClient()

  const { error } = await supabase.from('attractions').delete().eq('id', id)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
