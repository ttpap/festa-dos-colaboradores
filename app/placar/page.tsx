'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { AttractionScore } from '@/lib/types'

// ── Constants ────────────────────────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']
const CONFETTI_COLORS = ['#FFD700','#F59E0B','#00C9FF','#ffffff','#F472B6','#34D399','#FBBF24']
const DARK_BG = 'oklch(0.075 0.022 255)'

function placeOrdinal(n: number) { return `${n}º Lugar` }

// ── Types ────────────────────────────────────────────────────────────────────
type RankGroup = { place: number; entries: AttractionScore[]; isTie: boolean }
type Particle  = {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; rot: number; rotSpeed: number; circle: boolean
}

// ── Olympic ranking ───────────────────────────────────────────────────────────
function computeRankGroups(scores: AttractionScore[]): RankGroup[] {
  const sorted = [...scores].sort((a, b) => b.total_score - a.total_score)
  const groups: RankGroup[] = []
  let place = 1, i = 0
  while (i < sorted.length) {
    const score = sorted[i].total_score
    const group: AttractionScore[] = []
    while (i < sorted.length && sorted[i].total_score === score) { group.push(sorted[i]); i++ }
    groups.push({
      place,
      entries: [...group].sort((a, b) => (a.empresa ?? '').localeCompare(b.empresa ?? '')),
      isTie: group.length > 1,
    })
    place += group.length
  }
  return groups
}

// 12 sub-steps: 4 × 3 slots (3rd-best → 2nd-best → winner)
const STEP_DELAYS = [4500,4500,4500,6500, 5000,5000,5000,7000, 6000,6000,6000,9000]

// ── Podium card ───────────────────────────────────────────────────────────────
function PodiumCard({ group, isFirst }: { group: RankGroup; isFirst?: boolean }) {
  const isSecond = group.place === 2
  const medal    = group.place <= 3 ? MEDALS[group.place - 1] : '🏅'

  const topBar     = isFirst  ? 'linear-gradient(90deg,#00C9FF,#FFD700,#F59E0B,#00C9FF)'
                   : isSecond ? 'linear-gradient(90deg,#9CA3AF,#D1D5DB,#9CA3AF)'
                              : 'linear-gradient(90deg,#B45309,#D97706,#B45309)'
  const bg         = isFirst  ? 'rgba(234,179,8,0.1)'      : isSecond ? 'rgba(160,160,160,0.07)' : 'rgba(180,90,20,0.08)'
  const borderCol  = isFirst  ? 'rgba(234,179,8,0.45)'     : isSecond ? 'rgba(160,160,160,0.25)' : 'rgba(180,90,20,0.25)'
  const scoreCol   = isFirst  ? '#F59E0B' : isSecond ? '#A1A1AA' : '#D97706'
  const empresaCol = isFirst  ? '#F59E0B' : isSecond ? '#D1D5DB' : '#D97706'

  return (
    <div className="flex flex-col gap-2">
      {group.entries.map((e, idx) => (
        <div key={e.id}
          className="rounded-2xl overflow-hidden flex flex-col items-center text-center"
          style={{
            background: bg,
            border: `1px solid ${borderCol}`,
            opacity: 0,
            animation: `podiumRise 0.8s cubic-bezier(0.22,1,0.36,1) ${idx * 120 + (isFirst ? 0 : 220)}ms both`,
          }}>
          <div className="h-0.5 w-full" style={{ background: topBar }} />
          <div className={`px-3 pb-4 pt-4 ${isFirst ? 'md:px-5 md:pt-5 md:pb-5' : 'md:px-4'}`}>
            <div
              className={`mb-2 ${isFirst ? 'text-5xl md:text-6xl' : 'text-4xl md:text-5xl'}`}
              style={isFirst ? { animation: 'medalGlow 2.5s ease-in-out infinite' } : {}}>
              {medal}
            </div>
            <p className={`font-bold truncate ${isFirst ? 'text-base md:text-lg' : 'text-sm md:text-base'}`}
              style={{ color: empresaCol }}>
              {e.empresa || '—'}
            </p>
            <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{e.tema}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{e.nome}</p>
            <p className={`font-black tabular-nums mt-2 ${isFirst ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}
              style={{ color: scoreCol, ...(isFirst ? { textShadow: '0 0 40px rgba(234,179,8,0.55)' } : {}) }}>
              {e.total_score}
              <span style={{ fontSize: '0.5em', fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>pts</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlacarPage() {
  const [scores, setScores]                 = useState<AttractionScore[]>([])
  const [scoresRevealed, setScoresRevealed] = useState(false)
  const [revealed, setRevealed]             = useState(false)
  const [loading, setLoading]               = useState(true)
  const [animKey, setAnimKey]               = useState(0)
  const [revealStep, setRevealStep]         = useState(0)
  const [countdown, setCountdown]           = useState(0)
  const revealStartedRef                    = useRef(false)

  // Confetti (imperative canvas, survives phase transitions)
  const confettiRef  = useRef<HTMLCanvasElement | null>(null)
  const rafRef       = useRef<number | null>(null)
  const activeRef    = useRef(false)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;'
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    document.body.appendChild(canvas)
    confettiRef.current = canvas
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (document.body.contains(canvas)) document.body.removeChild(canvas)
    }
  }, [])

  const drawConfetti = useCallback(function draw() {
    const canvas = confettiRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 20)
    for (const p of particlesRef.current) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180)
      ctx.fillStyle = p.color
      if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill() }
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    }
    if (particlesRef.current.length > 0 || activeRef.current) rafRef.current = requestAnimationFrame(draw)
    else rafRef.current = null
  }, [])

  const startConfetti = useCallback(() => {
    const canvas = confettiRef.current; if (!canvas) return
    const cw = canvas.width, ch = canvas.height
    activeRef.current = true
    function spawn(n: number) {
      for (let i = 0; i < n; i++) {
        particlesRef.current.push({
          x: Math.random() * cw, y: -10 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
          size: 5 + Math.random() * 8,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 8,
          circle: Math.random() > 0.5,
        })
      }
    }
    spawn(150); setTimeout(() => spawn(120), 600); setTimeout(() => spawn(100), 1200)
    setTimeout(() => { activeRef.current = false }, 5500)
    if (!rafRef.current) drawConfetti()
  }, [drawConfetti])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchScores = useCallback(async () => {
    const res = await fetch('/api/scores')
    setScores(await res.json())
    setAnimKey(k => k + 1)
    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    const data = await fetch('/api/settings').then(r => r.json())
    setRevealed(data.result_revealed === 'true')
    setScoresRevealed(data.scores_revealed === 'true')
  }, [])

  useEffect(() => { fetchScores(); fetchSettings() }, [fetchScores, fetchSettings])
  useEffect(() => {
    const id = setInterval(() => { fetchScores(); fetchSettings() }, 10000)
    return () => clearInterval(id)
  }, [fetchScores, fetchSettings])

  // ── Reveal step machine ───────────────────────────────────────────────────
  // Skip null slots immediately (fewer than 3 distinct score groups)
  useEffect(() => {
    if (revealStep === 0 || revealStep >= 13) return
    const si = revealStep <= 4 ? 0 : revealStep <= 8 ? 1 : 2
    const g = computeRankGroups(scores)
    const slot = si === 0 ? g[2] : si === 1 ? g[1] : g[0]
    if (!slot) setRevealStep(si === 0 ? 5 : si === 1 ? 9 : 13)
  }, [revealStep, scores])

  // Advance steps with timing
  useEffect(() => {
    if (revealStep === 0 || revealStep >= 13) return
    const t = setTimeout(() => setRevealStep(s => s + 1), STEP_DELAYS[revealStep - 1] ?? 4000)
    return () => clearTimeout(t)
  }, [revealStep])

  // Confetti: fire when winner fully revealed + when podium appears
  useEffect(() => {
    if (revealStep === 12 || revealStep === 13) startConfetti()
  }, [revealStep, startConfetti])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, ({ new: n }) => {
        if (n.key === 'result_revealed') {
          const val = n.value === 'true'; setRevealed(val)
          if (!val) { setRevealStep(0); revealStartedRef.current = false; setCountdown(0) }
        }
        if (n.key === 'scores_revealed') { setScoresRevealed(n.value === 'true'); setAnimKey(k => k + 1) }
      }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // 5s countdown then launch
  useEffect(() => {
    if (!revealed || revealStartedRef.current) return
    revealStartedRef.current = true
    let count = 5; setCountdown(count)
    const iv = setInterval(() => {
      count--
      if (count <= 0) { clearInterval(iv); setCountdown(0); setRevealStep(1) }
      else setCountdown(count)
    }, 1000)
    return () => clearInterval(iv)
  }, [revealed])

  // ── Derived state ─────────────────────────────────────────────────────────
  const sortedScores  = [...scores].sort((a, b) => b.total_score - a.total_score)
  const rankGroups    = computeRankGroups(scores)
  const displayScores = (revealed || scoresRevealed) ? sortedScores : [...scores].sort((a, b) => a.ordem - b.ordem)
  const revealSlots: (RankGroup | null)[] = [rankGroups[2] ?? null, rankGroups[1] ?? null, rankGroups[0] ?? null]

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Image src="/logo.jpeg" alt="BZ" width={72} height={72} className="rounded-full animate-pulse"
          style={{ boxShadow: '0 0 40px rgba(0,201,255,0.4)' }} />
        <p className="text-muted-foreground text-sm">A carregar...</p>
      </div>
    </div>
  )

  // ── PHASE 0: waiting ──────────────────────────────────────────────────────
  if (!scoresRevealed && !revealed) return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 40%, rgba(0,201,255,0.12) 0%, ${DARK_BG} 70%)` }}>
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
          style={{ background: 'rgba(0,201,255,0.08)', border: '1px solid rgba(0,201,255,0.22)' }}>
          <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          <span className="text-primary font-semibold">Votação em curso...</span>
        </div>
        <div className="flex justify-center gap-3 text-3xl mt-4 opacity-50">
          <span className="animate-bounce" style={{ animationDelay: '0s' }}>✨</span>
          <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>🎭</span>
          <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>✨</span>
        </div>
      </div>
    </div>
  )

  // ── COUNTDOWN ─────────────────────────────────────────────────────────────
  if (revealed && revealStep === 0 && countdown > 0) return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(234,179,8,0.18) 0%, ${DARK_BG} 65%)` }}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full border border-yellow-500/20 animate-ping" style={{ animationDuration: '1s' }} />
        <div className="absolute w-64 h-64 rounded-full border border-yellow-500/30 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.3s' }} />
      </div>
      <div className="text-center relative z-10">
        <Image src="/logo.jpeg" alt="BZ" width={80} height={80} className="rounded-full mx-auto mb-8"
          style={{ boxShadow: '0 0 40px rgba(234,179,8,0.3)' }} />
        <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-6">Resultado Final</p>
        <div className="text-9xl font-black tabular-nums text-amber-400 leading-none mb-6"
          style={{ textShadow: '0 0 80px rgba(234,179,8,0.7)', transition: 'all 0.25s' }}>
          {countdown}
        </div>
        <p className="text-muted-foreground text-sm">A revelação começa já a seguir...</p>
      </div>
    </div>
  )

  // ── DRAMATIC REVEAL ───────────────────────────────────────────────────────
  if (revealed && revealStep > 0 && revealStep < 13) {
    const slotIndex = revealStep <= 4 ? 0 : revealStep <= 8 ? 1 : 2
    const subStep   = revealStep <= 4 ? revealStep : revealStep <= 8 ? revealStep - 4 : revealStep - 8
    const slot      = revealSlots[slotIndex]

    if (!slot) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: DARK_BG }}>
        <Image src="/logo.jpeg" alt="BZ" width={60} height={60} className="rounded-full opacity-20 animate-pulse" />
      </div>
    )

    const isFirst    = slot.place === 1
    const isTie      = slot.isTie
    const numEntries = slot.entries.length
    const medal      = slot.place <= 3 ? MEDALS[slot.place - 1] : '🏅'
    const containerW = numEntries >= 3 ? 'max-w-4xl' : numEntries === 2 ? 'max-w-2xl' : 'max-w-md'
    const gridCols   = numEntries >= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'

    const bgGlow = isFirst
      ? `radial-gradient(ellipse at 50% 45%, rgba(234,179,8,0.2) 0%, ${DARK_BG} 65%)`
      : slot.place === 2
        ? `radial-gradient(ellipse at 50% 45%, rgba(160,160,160,0.1) 0%, ${DARK_BG} 65%)`
        : `radial-gradient(ellipse at 50% 45%, rgba(0,201,255,0.08) 0%, ${DARK_BG} 65%)`

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: bgGlow }}>

        {isFirst && subStep >= 2 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[28rem] h-[28rem] rounded-full border border-yellow-500/15 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute w-80 h-80 rounded-full border border-yellow-500/25 animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.4s' }} />
            {subStep >= 4 && <div className="absolute w-56 h-56 rounded-full border border-yellow-500/35 animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.8s' }} />}
          </div>
        )}

        <div className={`text-center w-full ${containerW} mx-auto relative z-10`}>

          {/* Sub-step 1: place + medal + EMPATE */}
          <div key={`title-${slotIndex}`} className="mb-8 animate-in fade-in zoom-in-50 duration-1000">
            {isTie ? (
              <div className="flex justify-center gap-3 mb-4 flex-wrap">
                {slot.entries.map((_, i) => (
                  <span key={i} className={`leading-none ${numEntries >= 3 ? 'text-6xl md:text-7xl' : 'text-7xl md:text-8xl'}`}
                    style={{ filter: `drop-shadow(0 0 24px ${isFirst ? 'rgba(234,179,8,0.7)' : 'rgba(200,200,200,0.45)'})` }}>
                    {medal}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-9xl block leading-none mb-5"
                style={{ filter: `drop-shadow(0 0 32px ${isFirst ? 'rgba(234,179,8,0.7)' : slot.place === 2 ? 'rgba(200,200,200,0.45)' : 'rgba(180,90,20,0.45)'})` }}>
                {medal}
              </span>
            )}

            <h2 className={`text-5xl md:text-6xl font-black tracking-tight ${isFirst ? 'text-amber-400' : 'bz-gradient-text'}`}
              style={isFirst ? { textShadow: '0 0 60px rgba(234,179,8,0.4)' } : {}}>
              {placeOrdinal(slot.place)}
            </h2>

            {isTie && (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 font-bold text-lg
                animate-in fade-in zoom-in-90 duration-700
                ${isFirst ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' : 'bg-primary/10 border border-primary/30 text-primary'}`}>
                {isFirst ? '🏆 EMPATE NA LIDERANÇA!' : '🤝 EMPATE'}
              </div>
            )}
          </div>

          {/* Sub-step 2+: cards */}
          {subStep >= 2 && (
            <div key={`cards-${slotIndex}`}
              className={`${isTie ? `grid ${gridCols} gap-4` : ''} animate-in fade-in slide-in-from-bottom-6 duration-700`}>
              {slot.entries.map((subject) => (
                <div key={subject.id} className="rounded-2xl overflow-hidden text-left"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: isFirst ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isFirst ? '0 0 60px rgba(234,179,8,0.12)' : 'none',
                    backdropFilter: 'blur(8px)',
                  }}>

                  {/* Empresa */}
                  <div className="px-6 pt-6 pb-4">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Empresa</p>
                    <p className={`${isTie ? 'text-2xl' : 'text-3xl'} font-bold`}
                      style={{ color: isFirst ? '#F59E0B' : 'oklch(0.78 0.175 200)' }}>
                      {subject?.empresa || '—'}
                    </p>
                  </div>

                  {/* Celebridade */}
                  {subStep >= 3 && (
                    <div key={`tema-${subject.id}`} className="px-6 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Fantasia / Celebridade</p>
                        <p className={`${isTie ? 'text-lg' : 'text-2xl'} font-semibold`} style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {subject?.tema}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Nome + pontuação */}
                  {subStep >= 4 && (
                    <div key={`name-${subject.id}`} className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                      <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Participante</p>
                        <p className={`${isTie ? 'text-xl' : 'text-3xl'} font-bold mb-3`}
                          style={{ color: isFirst ? '#FDE68A' : 'rgba(255,255,255,0.9)' }}>
                          {subject?.nome}
                        </p>
                        <p className={`${isTie ? 'text-5xl' : 'text-7xl'} font-black tabular-nums`}
                          style={{ color: isFirst ? '#F59E0B' : 'oklch(0.78 0.175 200)', ...(isFirst ? { textShadow: '0 0 40px rgba(234,179,8,0.6)' } : {}) }}>
                          {subject?.total_score}
                          <span style={{ fontSize: '0.3em', fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>pts</span>
                        </p>
                        {isFirst && (
                          <div className="flex gap-3 mt-4 justify-center text-2xl animate-in fade-in duration-700">
                            <span style={{ animation: 'pulse 1.5s 0s ease-in-out infinite' }}>✨</span>
                            <span style={{ animation: 'pulse 1.5s 0.3s ease-in-out infinite' }}>🎊</span>
                            <span style={{ animation: 'pulse 1.5s 0.6s ease-in-out infinite' }}>✨</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suspense dots */}
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

  // ── FINAL PODIUM / PRE-REVEAL SCOREBOARD ──────────────────────────────────
  const isDone = revealed && revealStep >= 13

  return (
    <div className="min-h-screen text-foreground p-6 md:p-10"
      style={{
        background: isDone
          ? `radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.12) 0%, ${DARK_BG} 60%)`
          : `radial-gradient(ellipse at 50% 0%, rgba(0,201,255,0.08) 0%, ${DARK_BG} 60%)`,
      }}>
      <div className={`mx-auto ${isDone ? 'max-w-2xl' : 'max-w-3xl'}`}>

        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="flex justify-center mb-5">
            <Image src="/logo.jpeg" alt="BZ" width={80} height={80} className="rounded-full"
              style={{ boxShadow: isDone ? '0 0 40px rgba(234,179,8,0.35)' : '0 0 40px rgba(0,201,255,0.3)' }} />
          </div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2">Festa dos Colaboradores</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bz-gradient-text">🏆 Desfile 2026</h1>
          {isDone && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-amber-400 text-sm font-semibold">🎊 Resultado final revelado!</span>
            </div>
          )}
        </div>

        {isDone ? (
          /* ── PODIUM: 2nd(left) — 1st(centre) — 3rd(right) ── */
          rankGroups.length === 0 ? (
            <p className="text-center text-muted-foreground">Sem pontuações.</p>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3 justify-center">
              {/* mobile: 1st → 2nd → 3rd | desktop: 2nd(left) → 1st(centre) → 3rd(right) */}
              {rankGroups[1] && (
                <div className="order-2 md:order-1 w-full md:flex-1">
                  <PodiumCard group={rankGroups[1]} />
                </div>
              )}
              {rankGroups[0] && (
                <div className="order-1 md:order-2 w-full md:flex-[1.3]">
                  <PodiumCard group={rankGroups[0]} isFirst />
                </div>
              )}
              {rankGroups[2] && (
                <div className="order-3 w-full md:flex-1">
                  <PodiumCard group={rankGroups[2]} />
                </div>
              )}
            </div>
          )
        ) : (
          /* ── PRE-REVEAL LIST ── */
          displayScores.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">
              <p className="text-xl">Aguardando atrações...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayScores.map((s, idx) => {
                const maxSc = Math.max(...displayScores.map(x => x.total_score), 1)
                const barW  = s.total_score > 0 ? Math.round((s.total_score / maxSc) * 100) : 0
                return (
                  <div key={`${s.id}-${animKey}`}
                    className="relative rounded-xl overflow-hidden bg-card border border-border"
                    style={{
                      opacity: 0,
                      animation: 'cardSlideIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
                      animationDelay: `${idx * 120}ms`,
                    }}>
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ width: `${barW}%`, opacity: 0.07, background: 'linear-gradient(90deg,#00C9FF 0%,#0052D4 100%)' }} />
                    <div className="relative flex items-center gap-4 px-5 py-4">
                      <div className="w-10 text-center shrink-0">
                        <span className="text-muted-foreground/30 text-lg">·</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg leading-tight truncate text-foreground">{s.nome}</p>
                        <p className="text-muted-foreground text-sm truncate">{s.tema}</p>
                        {s.empresa && <p className="text-xs truncate font-medium text-primary/70">{s.empresa}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-3xl font-bold tabular-nums text-primary">{s.total_score}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.vote_count} {s.vote_count === 1 ? 'jurado' : 'jurados'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {!isDone && (
          <p className="text-center text-xs mt-8 text-muted-foreground">
            Actualiza automaticamente a cada 10s
          </p>
        )}
      </div>
    </div>
  )
}
