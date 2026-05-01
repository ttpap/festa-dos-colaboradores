'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import type { Attraction } from '@/lib/types'

const EVENTS = [
  { value: '2026-05-05', label: '05 de Maio', sub: 'Segunda-feira' },
  { value: '2026-05-07', label: '07 de Maio', sub: 'Quarta-feira' },
]

export default function ApresentadorPage() {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<number | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/attractions')
    const data = await res.json()
    setAllAttractions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const list = selectedEvent
    ? allAttractions
        .filter(a => a.event_date === selectedEvent)
        .sort((a, b) => a.ordem - b.ordem)
    : []

  // Day picker
  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="BZ"
              width={64}
              height={64}
              className="rounded-full"
              style={{ boxShadow: '0 0 24px rgba(0,201,255,0.35)' }}
            />
            <h1 className="text-2xl font-bold bz-gradient-text text-center">Sequência de Apresentações</h1>
            <p className="text-sm text-muted-foreground text-center">Escolhe o dia da festa</p>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">A carregar…</p>
          ) : (
            <div className="w-full flex flex-col gap-3">
              {EVENTS.map(ev => {
                const count = allAttractions.filter(a => a.event_date === ev.value).length
                return (
                  <button
                    key={ev.value}
                    onClick={() => { setSelectedEvent(ev.value); setCurrent(null) }}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/60 hover:bg-primary/5 transition-all duration-150 text-left"
                  >
                    <div>
                      <p className="text-base font-bold">{ev.label}</p>
                      <p className="text-xs text-muted-foreground">{ev.sub}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{count} participante{count !== 1 ? 's' : ''} →</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const evLabel = EVENTS.find(e => e.value === selectedEvent)?.label ?? selectedEvent

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 select-none">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/logo.jpeg"
            alt="BZ"
            width={44}
            height={44}
            className="rounded-full shrink-0"
            style={{ boxShadow: '0 0 16px rgba(0,201,255,0.3)' }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold bz-gradient-text">Sequência de Apresentações</h1>
            <p className="text-sm text-muted-foreground">{evLabel} — {list.length} participante{list.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setSelectedEvent(null); setCurrent(null) }}
            className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors shrink-0"
          >
            Trocar dia
          </button>
        </div>

        {list.length === 0 && (
          <p className="text-muted-foreground text-center py-16">Nenhuma atração configurada para este dia.</p>
        )}

        {/* List */}
        {list.length > 0 && (
          <ol className="flex flex-col gap-3">
            {list.map((a, i) => {
              const isCurrent = current === i
              const isDone = current !== null && i < current
              return (
                <li
                  key={a.id}
                  onClick={() => setCurrent(isCurrent ? null : i)}
                  className={[
                    'relative flex items-start gap-4 rounded-xl border px-5 py-4 cursor-pointer transition-all duration-200',
                    isCurrent
                      ? 'border-primary/70 bg-primary/10 shadow-lg shadow-primary/10'
                      : isDone
                        ? 'border-border/30 opacity-40'
                        : 'border-border/60 bg-card hover:border-primary/40 hover:bg-card/80',
                  ].join(' ')}
                >
                  <span className={[
                    'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold mt-0.5',
                    isCurrent ? 'bg-primary text-primary-foreground' : isDone ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground',
                  ].join(' ')}>
                    {isDone ? '✓' : i + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={['text-lg font-bold leading-tight', isCurrent ? 'text-primary' : ''].join(' ')}>
                      {a.nome}
                    </p>
                    {a.empresa && (
                      <p className="text-sm font-medium text-muted-foreground mt-0.5">{a.empresa}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 italic">{a.tema}</p>
                  </div>

                  {isCurrent && (
                    <span className="absolute top-3 right-4 text-xs font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                      A apresentar
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {/* Controls */}
        {list.length > 0 && (
          <div className="flex justify-between items-center mt-8 gap-3">
            <button
              onClick={() => setCurrent(prev => prev === null ? 0 : prev > 0 ? prev - 1 : prev)}
              disabled={current === null || current === 0}
              className="flex-1 rounded-lg border border-border py-3 text-sm font-medium disabled:opacity-30 hover:bg-secondary transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrent(null)}
              className="px-4 rounded-lg border border-border py-3 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Resetar
            </button>
            <button
              onClick={() => setCurrent(prev => prev === null ? 0 : prev < list.length - 1 ? prev + 1 : prev)}
              disabled={current === list.length - 1}
              className="flex-1 rounded-lg border border-primary/60 bg-primary/10 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-30"
            >
              Próximo →
            </button>
          </div>
        )}

        {current !== null && list.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">{current + 1} de {list.length}</p>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10 opacity-40">
          Toque numa entrada para marcá-la como actual • /apresentador
        </p>
      </div>
    </div>
  )
}
