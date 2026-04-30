import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSession } from '@/lib/session'
import { nanoid } from 'nanoid'

export async function GET() {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('judges').select('*').order('created_at')

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { label, event_date } = await request.json()
  const code = nanoid(8).toUpperCase()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('judges')
    .insert({ code, label: label || null, event_date: event_date || null })
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
  const { error } = await supabase.from('judges').delete().eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
