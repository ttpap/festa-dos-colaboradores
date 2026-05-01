'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import type { Attraction, Settings } from '@/lib/types'

const EVENTS: Record<string, string> = {
  '2026-05-05': '05 de Maio de 2026',
  '2026-05-07': '07 de Maio de 2026',
}

export default function ApresentadorPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [activeEvent, setActiveEvent] = useState('2026-05-05')
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [attrRes, settingsRes] = await Promise.all([
      fetch('/api/attractions'),
      fetch('/api/settings'),
    ])
    const [attrData, settingsData]: [Attraction[], Settings] = await Promise.all([
      attrRes.json(),
      settingsRes.json(),
    ])
    const event = settingsData?.active_event ?? '2026-05-05'
    setActiveEvent(event)
    setAttractions(
      Array.isArray(attrData)
        ? attrData.filter(a => a.event_date === event).sort((a, b) => a.ordem - b.ordem)
        : []
    )
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const list = attractions

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 select-none">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/logo.jpeg"
            alt="BZ"
            width={48}
            height={48}
            className="rounded-full shrink-0"
            style={{ boxShadow: '0 0 16px rgba(0,201,255,0.3)' }}
          />
          <div>
            <h1 className="text-2xl font-bold bz-gradient-text">Sequência de Apresentações</h1>
            <p className="text-sm text-muted-foreground">
              {EVENTS[activeEvent]} — {list.length} participante{list.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-muted-foreground text-center py-16">A carregar…</p>
        )}

        {!loading && list.length === 0 && (
          <p className="text-muted-foreground text-center py-16">
            Nenhuma atração configurada para este evento.
          </p>
        )}

        {/* List */}
        {!loading && list.length > 0 && (
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
                  {/* Number */}
                  <span
                    className={[
                      'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold mt-0.5',
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isDone
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-secondary text-secondary-foreground',
                    ].join(' ')}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={['text-lg font-bold leading-tight', isCurrent ? 'text-primary' : ''].join(' ')}>
                      {a.nome}
                    </p>
                    {a.empresa && (
                      <p className="text-sm font-medium text-muted-foreground mt-0.5">{a.empresa}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 italic">{a.tema}</p>
                  </div>

                  {/* Current badge */}
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
        {!loading && list.length > 0 && (
          <div className="flex justify-between items-center mt-8 gap-3">
            <button
              onClick={() => setCurrent(prev =>
                prev === null ? 0 : prev > 0 ? prev - 1 : prev
              )}
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
              onClick={() => setCurrent(prev =>
                prev === null ? 0 : prev < list.length - 1 ? prev + 1 : prev
              )}
              disabled={current === list.length - 1}
              className="flex-1 rounded-lg border border-primary/60 bg-primary/10 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-30"
            >
              Próximo →
            </button>
          </div>
        )}

        {/* Progress */}
        {current !== null && list.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            {current + 1} de {list.length}
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10 opacity-40">
          Toque numa entrada para marcá-la como actual • /apresentador
        </p>
      </div>
    </div>
  )
}
