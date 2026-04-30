'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
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

  useEffect(() => {
    const interval = setInterval(fetchScores, 10000)
    return () => clearInterval(interval)
  }, [fetchScores])

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
          <Image src="/logo.jpeg" alt="BZ" width={72} height={72} className="rounded-full animate-pulse" style={{ boxShadow: '0 0 40px rgba(0,201,255,0.4)' }} />
          <p className="text-muted-foreground text-sm tracking-wide">A carregar...</p>
        </div>
      </div>
    )
  }

  // Phase 0: voting in progress
  if (!scoresRevealed && !revealed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,201,255,0.12) 0%, oklch(0.075 0.022 255) 70%)' }}
      >
        {/* Decorative glow rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-72 h-72 rounded-full border border-primary/15 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.5s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '1s' }} />
        </div>

        <div className="text-center relative z-10">
          {/* Logo */}
          <div className="relative inline-block mb-8">
            <Image
              src="/logo.jpeg"
              alt="BZ Logo"
              width={140}
              height={140}
              className="rounded-full"
              style={{ boxShadow: '0 0 80px rgba(0,201,255,0.35), 0 0 160px rgba(0,82,212,0.2)' }}
            />
            <span className="absolute -bottom-2 -right-2 text-3xl animate-bounce">🎉</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bz-gradient-text mb-2">
            Desfile 2026
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase mb-6">
            Festa dos Colaboradores
          </p>

          <div
            className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 mb-4"
            style={{ background: 'rgba(0,201,255,0.1)', border: '1px solid rgba(0,201,255,0.25)' }}
          >
            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            <span className="text-primary font-semibold">Votação em curso...</span>
          </div>

          <div className="flex justify-center gap-3 text-3xl mt-4 opacity-60">
            <span className="animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
            <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>🎭</span>
            <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>✨</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen text-foreground p-6 md:p-10"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,201,255,0.08) 0%, oklch(0.075 0.022 255) 60%)' }}
    >
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Image
              src="/logo.jpeg"
              alt="BZ"
              width={80}
              height={80}
              className="rounded-full"
              style={{ boxShadow: '0 0 40px rgba(0,201,255,0.3)' }}
            />
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2">
            Festa dos Colaboradores
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bz-gradient-text">
            🏆 Desfile 2026
          </h1>

          <div className="mt-4">
            {revealed ? (
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-400 text-sm font-semibold">🎊 Resultado final revelado!</span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
                style={{ background: 'rgba(0,201,255,0.08)', border: '1px solid rgba(0,201,255,0.22)' }}
              >
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-primary text-sm font-medium">Pontuações reveladas — aguarda o vencedor...</span>
              </div>
            )}
          </div>
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
              const barWidth = s.total_score > 0 ? Math.round((s.total_score / maxScore) * 100) : 0
              const isWinner = revealed && rank === 0

              return (
                <div
                  key={`${s.id}-${animKey}`}
                  className={`relative rounded-xl overflow-hidden bg-card border transition-all duration-700
                    ${isWinner
                      ? 'border-yellow-500/50 scale-[1.03]'
                      : revealed && rank === 1
                        ? 'border-zinc-400/30'
                        : revealed && rank === 2
                          ? 'border-amber-700/35'
                          : 'border-border'
                    }
                  `}
                  style={{
                    opacity: 0,
                    animation: `cardSlideIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    animationDelay: `${idx * 120}ms`,
                    ...(isWinner ? { boxShadow: '0 0 40px rgba(234,179,8,0.18), 0 0 80px rgba(234,179,8,0.07)' } : {}),
                  }}
                >
                  {/* Score bar */}
                  <div
                    className="absolute inset-0 transition-all duration-1000 pointer-events-none"
                    style={{
                      width: `${barWidth}%`,
                      opacity: isWinner ? 0.14 : 0.09,
                      background: 'linear-gradient(90deg, #00C9FF 0%, #0052D4 100%)',
                    }}
                  />

                  <div className="relative flex items-center gap-4 px-5 py-4">
                    {/* Rank */}
                    <div className="w-10 text-center shrink-0">
                      {revealed ? (
                        rank !== null && rank < 3
                          ? <span className="text-3xl">{MEDALS[rank]}</span>
                          : <span className="text-muted-foreground font-bold text-lg">{idx + 1}</span>
                      ) : (
                        <span className="text-muted-foreground/30 text-lg">·</span>
                      )}
                    </div>

                    {/* Name + tema + empresa */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-lg leading-tight truncate ${isWinner ? 'text-yellow-300' : 'text-foreground'}`}>
                        {s.nome}
                      </p>
                      <p className="text-muted-foreground text-sm truncate">{s.tema}</p>
                      {s.empresa && (
                        <p className="text-xs truncate font-medium" style={{ color: 'oklch(0.45 0.07 220)' }}>
                          {s.empresa}
                        </p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold tabular-nums ${
                        revealed && rank === 0 ? 'text-yellow-400'
                        : revealed && rank === 1 ? 'text-zinc-300'
                        : revealed && rank === 2 ? 'text-amber-500'
                        : 'text-primary'
                      }`}>
                        {s.total_score}
                      </p>
                      <p className="text-xs" style={{ color: 'oklch(0.42 0.055 220)' }}>
                        {s.vote_count} {s.vote_count === 1 ? 'jurado' : 'jurados'}
                      </p>
                    </div>
                  </div>

                  {/* Winner confetti strip */}
                  {isWinner && (
                    <div
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ background: 'linear-gradient(90deg, #00C9FF, #FFD700, #00C9FF)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: 'oklch(0.32 0.04 250)' }}>
          Actualiza automaticamente a cada 10s
        </p>
      </div>
    </div>
  )
}
