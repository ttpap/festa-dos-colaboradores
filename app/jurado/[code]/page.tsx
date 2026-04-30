'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Attraction, Vote } from '@/lib/types'

const CRITERIA = [
  { key: 'adesao_tema', label: 'Adesão ao Tema', desc: 'Fidelidade e coerência com o tema proposto' },
  { key: 'criatividade', label: 'Criatividade', desc: 'Fantasia inovadora e diferenciada' },
  { key: 'performance', label: 'Performance', desc: 'Postura, desenvoltura e engajamento' },
] as const

type ScoreState = {
  adesao_tema: number
  criatividade: number
  performance: number
}

function formatCountdown(ms: number) {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function ScoreInput({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string
  desc: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <span className="text-2xl font-bold w-8 text-center">{value || '–'}</span>
      </div>
      <div className="flex gap-2 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-md border text-sm font-medium transition-colors
              ${value === n
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function JuradoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [valid, setValid] = useState<boolean | null>(null)
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [scores, setScores] = useState<Record<string, ScoreState>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [votingOpen, setVotingOpen] = useState(true)
  const [judgeLabel, setJudgeLabel] = useState<string | null>(null)
  const [judgeEvent, setJudgeEvent] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [expired, setExpired] = useState(false)

  const load = useCallback(async () => {
    const votesRes = await fetch(`/api/votes/${code}`)

    if (!votesRes.ok) {
      setValid(false)
      return
    }

    const judgeData: { votes: Vote[]; event_date: string | null; label: string | null } = await votesRes.json()
    const [attrsData, settingsData]: [Attraction[], Record<string, string>] =
      await Promise.all([
        fetch('/api/attractions').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
      ])

    const ev = judgeData.event_date ?? settingsData.active_event ?? '2026-05-05'

    setValid(true)
    setVotingOpen(settingsData.voting_open === 'true')
    setJudgeLabel(judgeData.label ?? null)
    setJudgeEvent(ev)
    setAttractions(attrsData.filter((a: Attraction) => a.event_date === ev))
    setVotes(judgeData.votes)

    const initialScores: Record<string, ScoreState> = {}
    judgeData.votes.forEach((v) => {
      initialScores[v.attraction_id] = {
        adesao_tema: v.adesao_tema,
        criatividade: v.criatividade,
        performance: v.performance,
      }
    })
    setScores(initialScores)
  }, [code])

  useEffect(() => { load() }, [load])

  // Countdown: expires at 18:00 local time on the judge's event day
  useEffect(() => {
    if (!judgeEvent) return
    const deadline = new Date(`${judgeEvent}T18:00:00`)

    const tick = () => {
      const diff = deadline.getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setTimeLeft(0)
      } else {
        setExpired(false)
        setTimeLeft(diff)
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [judgeEvent])

  async function submitVote(attractionId: string) {
    const s = scores[attractionId]
    if (!s?.adesao_tema || !s?.criatividade || !s?.performance) {
      toast.error('Preenche todas as notas antes de confirmar')
      return
    }

    setSubmitting(attractionId)
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judge_code: code,
        attraction_id: attractionId,
        ...s,
      }),
    })

    if (res.ok) {
      toast.success('Voto registado!')
      const data = await res.json()
      setVotes(prev => {
        const filtered = prev.filter(v => v.attraction_id !== attractionId)
        return [...filtered, data]
      })
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao registar voto')
    }
    setSubmitting(null)
  }

  function updateScore(attractionId: string, key: keyof ScoreState, value: number) {
    setScores(prev => ({
      ...prev,
      [attractionId]: { ...(prev[attractionId] ?? { adesao_tema: 0, criatividade: 0, performance: 0 }), [key]: value },
    }))
  }

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    )
  }

  if (valid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-4xl mb-4">🚫</p>
            <h1 className="text-lg font-bold">Código inválido</h1>
            <p className="text-sm text-muted-foreground mt-1">Este link de jurado não existe.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const locked = !votingOpen || expired

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Painel do Jurado</h1>
          {judgeLabel && <p className="text-base font-semibold mt-0.5">{judgeLabel}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="font-mono">{code}</Badge>
            {expired && <Badge variant="destructive">Votação encerrada</Badge>}
            {!votingOpen && !expired && <Badge variant="destructive">Votação encerrada</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Dá nota de 1 a 5 em cada critério e confirma o voto por cada atração.
          </p>

          {/* Countdown */}
          {judgeEvent && (
            <div className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 border
              ${expired
                ? 'bg-red-500/10 border-red-500/30 text-red-500'
                : timeLeft < 30 * 60 * 1000
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                  : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span className="text-sm">⏱</span>
              {expired ? (
                <span className="text-sm font-medium">
                  Prazo encerrado — {new Date(`${judgeEvent}T18:00:00`).toLocaleDateString('pt-BR')} às 18:00
                </span>
              ) : (
                <span className="text-sm font-medium tabular-nums">
                  Encerra {new Date(`${judgeEvent}T18:00:00`).toLocaleDateString('pt-BR')} às 18:00 — <span className="font-mono">{formatCountdown(timeLeft)}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {attractions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma atração disponível ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {attractions.map((a) => {
              const submitted = votes.find(v => v.attraction_id === a.id)
              const s = scores[a.id] ?? { adesao_tema: 0, criatividade: 0, performance: 0 }
              const total = s.adesao_tema + s.criatividade + s.performance
              const isSubmitting = submitting === a.id

              return (
                <Card key={a.id} className={submitted ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{a.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">{a.tema}</p>
                        {a.empresa && <p className="text-xs font-medium text-muted-foreground">{a.empresa}</p>}
                      </div>
                      {submitted && (
                        <Badge className="bg-green-600 text-white shrink-0">✓ Confirmado</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {CRITERIA.map(c => (
                      <ScoreInput
                        key={c.key}
                        label={c.label}
                        desc={c.desc}
                        value={s[c.key]}
                        onChange={v => updateScore(a.id, c.key, v)}
                        disabled={locked}
                      />
                    ))}

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-3xl font-bold">{total > 0 ? total : '—'}<span className="text-sm text-muted-foreground font-normal">/15</span></p>
                      </div>
                      <Button
                        onClick={() => submitVote(a.id)}
                        disabled={isSubmitting || locked || total === 0}
                        className="min-w-28"
                      >
                        {isSubmitting ? 'A guardar...' : submitted ? 'Actualizar' : 'Confirmar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
