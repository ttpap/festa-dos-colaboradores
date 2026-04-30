'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AttractionScore } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function PlacarPage() {
  const [scores, setScores] = useState<AttractionScore[]>([])
  const [revealed, setRevealed] = useState(false)
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [animKey, setAnimKey] = useState(0)

  const fetchScores = useCallback(async () => {
    const res = await fetch('/api/scores')
    const data = await res.json()
    setScores(data)
    setAnimKey(k => k + 1)
    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setRevealed(data.result_revealed === 'true')
    setScoresRevealed(data.scores_revealed === 'true')
  }, [])

  useEffect(() => {
    fetchScores()
    fetchSettings()
  }, [fetchScores, fetchSettings])

  // Refresh + animate every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchScores, 10000)
    return () => clearInterval(interval)
  }, [fetchScores])

  // Realtime settings — also triggers animation on reveal
  useEffect(() => {
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new.key === 'result_revealed') {
          setRevealed(payload.new.value === 'true')
          setAnimKey(k => k + 1)
        }
        if (payload.new.key === 'scores_revealed') {
          setScoresRevealed(payload.new.value === 'true')
          setAnimKey(k => k + 1)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const displayScores = (revealed || scoresRevealed)
    ? [...scores].sort((a, b) => b.total_score - a.total_score)
    : [...scores].sort((a, b) => a.ordem - b.ordem)

  const maxScore = Math.max(...displayScores.map(s => s.total_score), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full bz-gradient animate-pulse"
            style={{ boxShadow: '0 0 40px rgba(0,201,255,0.3)' }}
          />
          <p className="text-muted-foreground text-sm tracking-wide">A carregar...</p>
        </div>
      </div>
    )
  }

  // Phase 0: nothing revealed yet
  if (!scoresRevealed && !revealed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div
            className="w-28 h-28 rounded-full bz-gradient mx-auto mb-8 flex items-center justify-center text-5xl animate-pulse"
            style={{ boxShadow: '0 0 60px rgba(0,201,255,0.25)' }}
          >
            🎭
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bz-gradient-text">
            Desfile 2026
          </h1>
          <p className="text-muted-foreground mt-2 text-xs tracking-[0.2em] uppercase">
            Festa dos Colaboradores
          </p>
          <div
            className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2"
            style={{
              background: 'rgba(0,201,255,0.08)',
              border: '1px solid rgba(0,201,255,0.22)',
            }}
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-primary text-sm font-medium">Votação em curso...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-3">
            Festa dos Colaboradores
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bz-gradient-text">
            🏆 Desfile 2026
          </h1>

          {revealed ? (
            <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-400 text-sm font-medium">Resultado final revelado!</span>
            </div>
          ) : (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                background: 'rgba(0,201,255,0.08)',
                border: '1px solid rgba(0,201,255,0.22)',
              }}
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-sm font-medium">
                Pontuações reveladas — aguarda o vencedor...
              </span>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        {displayScores.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            <p className="text-xl">Aguardando atrações...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayScores.map((s, idx) => {
              const rank = revealed ? idx : null
              const barWidth = s.total_score > 0
                ? Math.round((s.total_score / maxScore) * 100)
                : 0

              const isWinner = revealed && rank === 0

              return (
                <div
                  key={`${s.id}-${animKey}`}
                  className={`relative rounded-xl overflow-hidden bg-card border transition-all duration-700
                    ${isWinner
                      ? 'border-yellow-500/40 scale-[1.02]'
                      : revealed && rank === 1
                        ? 'border-zinc-400/30'
                        : revealed && rank === 2
                          ? 'border-amber-700/30'
                          : 'border-border'
                    }
                  `}
                  style={{
                    opacity: 0,
                    animation: `cardSlideIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    animationDelay: `${idx * 120}ms`,
                    ...(isWinner
                      ? { boxShadow: '0 0 32px rgba(234,179,8,0.14)' }
                      : {}),
                  }}
                >
                  {/* BZ brand score bar */}
                  <div
                    className="absolute inset-0 transition-all duration-1000 pointer-events-none"
                    style={{
                      width: `${barWidth}%`,
                      opacity: 0.08,
                      background: 'linear-gradient(90deg, #00C9FF 0%, #0052D4 100%)',
                    }}
                  />

                  <div className="relative flex items-center gap-4 px-5 py-4">
                    {/* Rank indicator */}
                    <div className="w-8 text-center shrink-0">
                      {revealed ? (
                        rank !== null && rank < 3
                          ? <span className="text-2xl">{MEDALS[rank]}</span>
                          : <span className="text-muted-foreground font-bold text-lg">{idx + 1}</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-lg">·</span>
                      )}
                    </div>

                    {/* Name + tema + empresa */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg leading-tight truncate text-foreground">
                        {s.nome}
                      </p>
                      <p className="text-muted-foreground text-sm truncate">{s.tema}</p>
                      {s.empresa && (
                        <p className="text-xs truncate" style={{ color: 'oklch(0.4 0.065 220)' }}>
                          {s.empresa}
                        </p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold tabular-nums ${
                        revealed && rank === 0 ? 'text-yellow-400'
                        : revealed && rank === 1 ? 'text-zinc-300'
                        : revealed && rank === 2 ? 'text-amber-600'
                        : 'text-primary'
                      }`}>
                        {s.total_score}
                      </p>
                      <p className="text-xs" style={{ color: 'oklch(0.4 0.065 220)' }}>
                        {s.vote_count} {s.vote_count === 1 ? 'jurado' : 'jurados'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: 'oklch(0.3 0.04 250)' }}>
          Actualiza automaticamente a cada 10s
        </p>
      </div>
    </div>
  )
}
