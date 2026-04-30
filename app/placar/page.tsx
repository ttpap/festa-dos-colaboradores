'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { AttractionScore } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']
const PLACE_LABELS = ['1º Lugar', '2º Lugar', '3º Lugar']

// 12 reveal sub-steps total. Order per place:
//   subStep 1 = colocação (medal + "Xº Lugar")
//   subStep 2 = + empresa
//   subStep 3 = + celebridade (tema)
//   subStep 4 = + nome + pontuação
// Delays (ms) = how long each sub-step stays on screen before next.
const STEP_DELAYS = [
  // 3rd place
  4500, // 1→2: colocação on screen
  4500, // 2→3: empresa
  4500, // 3→4: celebridade
  6500, // 4→5: nome+pts → long pause before 2nd
  // 2nd place
  5000, // 5→6: colocação
  5000, // 6→7: empresa
  5000, // 7→8: celebridade
  7000, // 8→9: nome+pts → longer pause before 1st
  // 1st place
  6000, //  9→10: colocação (build maximum suspense)
  6000, // 10→11: empresa
  6000, // 11→12: celebridade
  9000, // 12→13: nome+pts → linger on winner
]

export default function PlacarPage() {
  const [scores, setScores] = useState<AttractionScore[]>([])
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [animKey, setAnimKey] = useState(0)

  // 0 = not started | 1–12 = dramatic reveal in progress | 13 = done / final frame
  const [revealStep, setRevealStep] = useState(0)
  const [countdown, setCountdown] = useState(0) // 5→4→3→2→1 before reveal starts
  const revealStartedRef = useRef(false)

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
    const isRevealed = data.result_revealed === 'true'
    setRevealed(isRevealed)
    setScoresRevealed(data.scores_revealed === 'true')
  }, [])

  useEffect(() => {
    fetchScores()
    fetchSettings()
  }, [fetchScores, fetchSettings])

  // 10s refresh loop — runs forever; also polls settings so it catches result_revealed changes
  useEffect(() => {
    const id = setInterval(() => {
      fetchScores()
      fetchSettings()
    }, 10000)
    return () => clearInterval(id)
  }, [fetchScores, fetchSettings])

  // Advance dramatic reveal steps
  useEffect(() => {
    if (revealStep === 0 || revealStep >= 13) return
    const delay = STEP_DELAYS[revealStep - 1] ?? 4000
    const t = setTimeout(() => setRevealStep(s => s + 1), delay)
    return () => clearTimeout(t)
  }, [revealStep])

  // Realtime — settings changes
  useEffect(() => {
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new.key === 'result_revealed') {
          const val = payload.new.value === 'true'
          setRevealed(val)
          if (!val) { setRevealStep(0); revealStartedRef.current = false; setCountdown(0) }
        }
        if (payload.new.key === 'scores_revealed') {
          setScoresRevealed(payload.new.value === 'true')
          setAnimKey(k => k + 1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // 5-second countdown then launch reveal
  useEffect(() => {
    if (!revealed || revealStartedRef.current) return
    revealStartedRef.current = true
    let count = 5
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(interval)
        setCountdown(0)
        setRevealStep(1)
      } else {
        setCountdown(count)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [revealed])

  const sortedScores = [...scores].sort((a, b) => b.total_score - a.total_score)
  const maxScore = Math.max(...sortedScores.map(s => s.total_score), 1)
  const displayScores = (revealed || scoresRevealed)
    ? sortedScores
    : [...scores].sort((a, b) => a.ordem - b.ordem)

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.jpeg" alt="BZ" width={72} height={72}
            className="rounded-full animate-pulse"
            style={{ boxShadow: '0 0 40px rgba(0,201,255,0.4)' }} />
          <p className="text-muted-foreground text-sm">A carregar...</p>
        </div>
      </div>
    )
  }

  // ── PHASE 0: nothing revealed ─────────────────────────────────────────────
  if (!scoresRevealed && !revealed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,201,255,0.12) 0%, oklch(0.075 0.022 255) 70%)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute w-72 h-72 rounded-full border border-primary/15 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.5s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '1.8s', animationDelay: '1s' }} />
        </div>
        <div className="text-center relative z-10">
          <div className="relative inline-block mb-8">
            <Image src="/logo.jpeg" alt="BZ Logo" width={140} height={140} className="rounded-full"
              style={{ boxShadow: '0 0 80px rgba(0,201,255,0.35), 0 0 160px rgba(0,82,212,0.2)' }} />
            <span className="absolute -bottom-2 -right-2 text-3xl animate-bounce">🎉</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bz-gradient-text mb-2">Desfile 2026</h1>
          <p className="text-muted-foreground text-sm tracking-[0.2em] uppercase mb-6">Festa dos Colaboradores</p>
          <div className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 mb-4"
            style={{ background: 'rgba(0,201,255,0.1)', border: '1px solid rgba(0,201,255,0.25)' }}>
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

  // ── COUNTDOWN (5s before reveal) ─────────────────────────────────────────
  if (revealed && revealStep === 0 && countdown > 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(234,179,8,0.15) 0%, oklch(0.075 0.022 255) 70%)' }}
      >
        {/* Pulsing rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full border border-yellow-500/20 animate-ping" style={{ animationDuration: '1s' }} />
          <div className="absolute w-64 h-64 rounded-full border border-yellow-500/30 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.3s' }} />
        </div>
        <div className="text-center relative z-10">
          <Image src="/logo.jpeg" alt="BZ" width={80} height={80} className="rounded-full mx-auto mb-8"
            style={{ boxShadow: '0 0 40px rgba(234,179,8,0.3)' }} />
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-6">Resultado Final</p>
          <div
            className="text-9xl font-black tabular-nums text-yellow-400 leading-none mb-6"
            style={{ textShadow: '0 0 80px rgba(234,179,8,0.7)', transition: 'all 0.3s' }}
          >
            {countdown}
          </div>
          <p className="text-muted-foreground text-sm">A revelação começa já a seguir...</p>
        </div>
      </div>
    )
  }

  // ── DRAMATIC REVEAL (steps 1–12) ──────────────────────────────────────────
  if (revealed && revealStep > 0 && revealStep < 13) {
    // 4 sub-steps per place: 1=colocação, 2=empresa, 3=celebridade, 4=nome+pts
    const rankIndex = revealStep <= 4 ? 2 : revealStep <= 8 ? 1 : 0
    const subStep   = revealStep <= 4 ? revealStep : revealStep <= 8 ? revealStep - 4 : revealStep - 8
    const subject   = sortedScores[rankIndex]
    const medal     = MEDALS[rankIndex]
    const placeLabel = PLACE_LABELS[rankIndex]
    const isFirst   = rankIndex === 0

    const bgGlow = isFirst
      ? 'radial-gradient(ellipse at 50% 40%, rgba(234,179,8,0.22) 0%, oklch(0.075 0.022 255) 70%)'
      : rankIndex === 1
        ? 'radial-gradient(ellipse at 50% 40%, rgba(160,160,160,0.1) 0%, oklch(0.075 0.022 255) 70%)'
        : 'radial-gradient(ellipse at 50% 40%, rgba(180,90,20,0.12) 0%, oklch(0.075 0.022 255) 70%)'

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: bgGlow }}>

        {/* Pulsing halo — intensifies as more is revealed */}
        {isFirst && subStep >= 2 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[28rem] h-[28rem] rounded-full border border-yellow-500/15 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-80 h-80 rounded-full border border-yellow-500/25 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.4s' }} />
            {subStep >= 4 && (
              <div className="absolute w-56 h-56 rounded-full border border-yellow-500/35 animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.8s' }} />
            )}
          </div>
        )}

        <div className="text-center max-w-md w-full relative z-10">
          {/* Sub-step 1: Colocação alone — medal + place label fade in fresh per place */}
          <div
            key={`title-${rankIndex}`}
            className="mb-8 animate-in fade-in zoom-in-50 duration-1000"
          >
            <span className="text-9xl block leading-none mb-5"
              style={{ filter: `drop-shadow(0 0 32px ${isFirst ? 'rgba(234,179,8,0.7)' : rankIndex === 1 ? 'rgba(200,200,200,0.45)' : 'rgba(180,90,20,0.45)'})` }}>
              {medal}
            </span>
            <h2 className={`text-5xl md:text-6xl font-black tracking-tight ${isFirst ? 'text-yellow-400' : 'bz-gradient-text'}`}
              style={isFirst ? { textShadow: '0 0 60px rgba(234,179,8,0.4)' } : {}}>
              {placeLabel}
            </h2>
          </div>

          {/* Progressive card — only renders from sub-step 2 onwards */}
          {subStep >= 2 && (
            <div
              key={`card-${rankIndex}`}
              className="rounded-2xl overflow-hidden text-left animate-in fade-in slide-in-from-bottom-6 duration-700"
              style={{
                background: 'oklch(0.115 0.028 258)',
                border: isFirst ? '1px solid rgba(234,179,8,0.5)' : '1px solid rgba(0,201,255,0.25)',
                boxShadow: isFirst
                  ? '0 0 60px rgba(234,179,8,0.18), 0 0 120px rgba(234,179,8,0.08)'
                  : '0 0 40px rgba(0,201,255,0.12)',
              }}>

              {/* Empresa — sub-step 2+ */}
              <div className="px-7 pt-7 pb-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Empresa</p>
                <p className={`text-3xl font-bold ${isFirst ? 'text-yellow-400' : 'text-primary'}`}>
                  {subject?.empresa || '—'}
                </p>
              </div>

              {/* Celebridade / Fantasia — sub-step 3+ */}
              {subStep >= 3 && (
                <div
                  key={`tema-${rankIndex}`}
                  className="px-7 pb-5 animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  <div className="border-t border-border/50 pt-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Fantasia / Celebridade</p>
                    <p className="text-2xl font-semibold text-foreground">{subject?.tema}</p>
                  </div>
                </div>
              )}

              {/* Nome + pontuação — sub-step 4 */}
              {subStep >= 4 && (
                <div
                  key={`name-${rankIndex}`}
                  className="px-7 pb-7 animate-in fade-in slide-in-from-bottom-4 duration-1000"
                >
                  <div className="border-t border-border/50 pt-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Participante</p>
                    <p className={`text-3xl font-bold mb-4 ${isFirst ? 'text-yellow-200' : 'text-foreground'}`}>
                      {subject?.nome}
                    </p>
                    <p className={`text-7xl font-black tabular-nums ${isFirst ? 'text-yellow-400' : 'text-primary'}`}
                      style={isFirst ? { textShadow: '0 0 40px rgba(234,179,8,0.5)' } : {}}>
                      {subject?.total_score}
                      <span className="text-xl font-normal text-muted-foreground ml-2">pts</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suspense dots while next piece is loading */}
          {subStep < 4 && (
            <div className="flex justify-center gap-2 mt-8 opacity-50">
              <span className={`w-2.5 h-2.5 rounded-full animate-bounce ${isFirst ? 'bg-yellow-400' : 'bg-primary'}`} style={{ animationDelay: '0s' }} />
              <span className={`w-2.5 h-2.5 rounded-full animate-bounce ${isFirst ? 'bg-yellow-400' : 'bg-primary'}`} style={{ animationDelay: '0.2s' }} />
              <span className={`w-2.5 h-2.5 rounded-full animate-bounce ${isFirst ? 'bg-yellow-400' : 'bg-primary'}`} style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── FINAL FRAME (step ≥ 13) or normal scoreboard ─────────────────────────
  const isDone = revealed && revealStep >= 13

  return (
    <div
      className="min-h-screen text-foreground p-6 md:p-10"
      style={{
        background: isDone
          ? 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.1) 0%, oklch(0.075 0.022 255) 60%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(0,201,255,0.08) 0%, oklch(0.075 0.022 255) 60%)',
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Image src="/logo.jpeg" alt="BZ" width={80} height={80} className="rounded-full"
              style={{ boxShadow: isDone ? '0 0 40px rgba(234,179,8,0.3)' : '0 0 40px rgba(0,201,255,0.3)' }} />
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2">Festa dos Colaboradores</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bz-gradient-text">🏆 Desfile 2026</h1>
          <div className="mt-4">
            {isDone ? (
              <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="text-yellow-400 text-sm font-semibold">🎊 Resultado final revelado!</span>
              </div>
            ) : null}
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
              const rank = (revealed || isDone) ? idx : null
              const barWidth = s.total_score > 0 ? Math.round((s.total_score / maxScore) * 100) : 0
              const isWinner = (revealed || isDone) && rank === 0

              return (
                <div
                  key={isDone ? s.id : `${s.id}-${animKey}`}
                  className={`relative rounded-xl overflow-hidden bg-card border transition-all duration-700
                    ${isWinner ? 'border-yellow-500/50 scale-[1.03]'
                      : (revealed || isDone) && rank === 1 ? 'border-zinc-400/30'
                      : (revealed || isDone) && rank === 2 ? 'border-amber-700/35'
                      : 'border-border'}`}
                  style={{
                    ...(!isDone ? {
                      opacity: 0,
                      animation: 'cardSlideIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      animationDelay: `${idx * 120}ms`,
                    } : {}),
                    ...(isWinner ? { boxShadow: '0 0 40px rgba(234,179,8,0.18), 0 0 80px rgba(234,179,8,0.07)' } : {}),
                  }}
                >
                  <div className="absolute inset-0 transition-all duration-1000 pointer-events-none"
                    style={{ width: `${barWidth}%`, opacity: isWinner ? 0.14 : 0.09, background: 'linear-gradient(90deg, #00C9FF 0%, #0052D4 100%)' }} />

                  <div className="relative flex items-center gap-4 px-5 py-4">
                    <div className="w-10 text-center shrink-0">
                      {(revealed || isDone) ? (
                        rank !== null && rank < 3
                          ? <span className="text-3xl">{MEDALS[rank]}</span>
                          : <span className="text-muted-foreground font-bold text-lg">{idx + 1}</span>
                      ) : <span className="text-muted-foreground/30 text-lg">·</span>}
                    </div>
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
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold tabular-nums ${
                        (revealed || isDone) && rank === 0 ? 'text-yellow-400'
                        : (revealed || isDone) && rank === 1 ? 'text-zinc-300'
                        : (revealed || isDone) && rank === 2 ? 'text-amber-500'
                        : 'text-primary'}`}>
                        {s.total_score}
                      </p>
                      <p className="text-xs" style={{ color: 'oklch(0.42 0.055 220)' }}>
                        {s.vote_count} {s.vote_count === 1 ? 'jurado' : 'jurados'}
                      </p>
                    </div>
                  </div>

                  {isWinner && (
                    <div className="absolute inset-x-0 top-0 h-0.5"
                      style={{ background: 'linear-gradient(90deg, #00C9FF, #FFD700, #00C9FF)' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isDone && (
          <p className="text-center text-xs mt-8" style={{ color: 'oklch(0.32 0.04 250)' }}>
            Actualiza automaticamente a cada 10s
          </p>
        )}
      </div>
    </div>
  )
}
