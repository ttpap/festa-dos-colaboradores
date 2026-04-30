'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AttractionScore } from '@/lib/types'

const RANK_COLORS = [
  'from-yellow-500 to-amber-400',
  'from-zinc-400 to-zinc-300',
  'from-amber-700 to-amber-600',
]

const MEDALS = ['🥇', '🥈', '🥉']

export default function PlacarPage() {
  const [scores, setScores] = useState<AttractionScore[]>([])
  const [revealed, setRevealed] = useState(false)
  const [displayScores, setDisplayScores] = useState<AttractionScore[]>([])
  const [loading, setLoading] = useState(true)

  const fetchScores = useCallback(async () => {
    const res = await fetch('/api/scores')
    const data = await res.json()
    setScores(data)
    setLoading(false)
  }, [])

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/settings')
    const data = await res.json()
    setRevealed(data.result_revealed === 'true')
  }, [])

  // Initial load
  useEffect(() => {
    fetchScores()
    fetchSettings()
  }, [fetchScores, fetchSettings])

  // Poll scores every 3s
  useEffect(() => {
    const interval = setInterval(fetchScores, 3000)
    return () => clearInterval(interval)
  }, [fetchScores])

  // Realtime: listen for settings changes (reveal moment)
  useEffect(() => {
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.new.key === 'result_revealed') {
          setRevealed(payload.new.value === 'true')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Compute display order: revealed = sorted by score; hidden = original order
  useEffect(() => {
    if (revealed) {
      setDisplayScores([...scores].sort((a, b) => b.total_score - a.total_score))
    } else {
      setDisplayScores([...scores].sort((a, b) => a.ordem - b.ordem))
    }
  }, [scores, revealed])

  const maxScore = Math.max(...displayScores.map(s => s.total_score), 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-lg animate-pulse">A carregar placar...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-1">Festa dos Colaboradores</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            🏆 Desfile 2026
          </h1>
          {revealed ? (
            <div className="mt-3 inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-400 text-sm font-medium">Resultado revelado!</span>
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-zinc-300 text-sm">Votação em curso</span>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        {displayScores.length === 0 ? (
          <div className="text-center text-zinc-500 py-20">
            <p className="text-6xl mb-4">🎭</p>
            <p className="text-xl">Aguardando atrações...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayScores.map((s, idx) => {
              const rank = revealed ? idx : null
              const barWidth = s.total_score > 0 ? Math.round((s.total_score / maxScore) * 100) : 0

              return (
                <div
                  key={s.id}
                  className={`relative rounded-xl overflow-hidden transition-all duration-700
                    ${revealed && rank === 0 ? 'ring-2 ring-yellow-500/60 scale-[1.02]' : ''}
                    ${revealed && rank === 1 ? 'ring-1 ring-zinc-400/40' : ''}
                    ${revealed && rank === 2 ? 'ring-1 ring-amber-700/40' : ''}
                    bg-zinc-900 border border-zinc-800
                  `}
                >
                  {/* Score bar background */}
                  <div
                    className={`absolute inset-0 opacity-10 transition-all duration-1000 bg-gradient-to-r
                      ${rank !== null && rank < 3 ? RANK_COLORS[rank] : 'from-zinc-600 to-zinc-500'}
                    `}
                    style={{ width: `${barWidth}%` }}
                  />

                  <div className="relative flex items-center gap-4 px-5 py-4">
                    {/* Rank / position */}
                    <div className="w-8 text-center shrink-0">
                      {revealed ? (
                        rank !== null && rank < 3
                          ? <span className="text-2xl">{MEDALS[rank]}</span>
                          : <span className="text-zinc-500 font-bold text-lg">{idx + 1}</span>
                      ) : (
                        <span className="text-zinc-600 text-lg">·</span>
                      )}
                    </div>

                    {/* Name + tema + empresa */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg leading-tight truncate">{s.nome}</p>
                      <p className="text-zinc-400 text-sm truncate">{s.tema}</p>
                      {s.empresa && <p className="text-zinc-500 text-xs truncate">{s.empresa}</p>}
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold tabular-nums
                        ${revealed && rank === 0 ? 'text-yellow-400' : ''}
                        ${revealed && rank === 1 ? 'text-zinc-300' : ''}
                        ${revealed && rank === 2 ? 'text-amber-600' : ''}
                        ${rank === null || rank > 2 ? 'text-white' : ''}
                      `}>
                        {s.total_score}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {s.vote_count} {s.vote_count === 1 ? 'jurado' : 'jurados'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-zinc-700 text-xs mt-8">Actualiza automaticamente</p>
      </div>
    </div>
  )
}
