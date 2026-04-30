'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Attraction, Judge, Settings } from '@/lib/types'

type AdminScore = {
  attractions: (Attraction & { event_date: string })[]
  votes: {
    attraction_id: string
    adesao_tema: number
    criatividade: number
    performance: number
    total: number
    judges: { code: string; label: string | null }
  }[]
  judges: Judge[]
}

const EVENTS = [
  { value: '2026-05-05', label: '05/05/2026 — Festa 1' },
  { value: '2026-05-07', label: '07/05/2026 — Festa 2' },
]

const EMPRESAS: Record<string, string[]> = {
  '2026-05-05': ['BOURBON', 'BYBLOS', 'BZ', 'BZ SPORTS', 'CORAIS E CONCHAS', 'ECOBUZIOS', 'NATIVA', 'PRIMITIVO'],
  '2026-05-07': ['ANEXO PRAIA', 'BLUE MARLIN', 'CASABLANCA', 'ECOTEXTIL', 'LA PEDRERA', 'TANGARAS', 'VILLA RAPHAEL'],
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [adminScores, setAdminScores] = useState<AdminScore | null>(null)
  const [newNome, setNewNome] = useState('')
  const [newTema, setNewTema] = useState('')
  const [newEmpresa, setNewEmpresa] = useState(EMPRESAS['2026-05-05'][0])
  const [newEventDate, setNewEventDate] = useState('2026-05-05')
  const [newJudgeLabel, setNewJudgeLabel] = useState('')
  const [newJudgeEvent, setNewJudgeEvent] = useState('2026-05-05')

  const checkAuth = useCallback(async () => {
    const res = await fetch('/api/admin/check')
    const data = await res.json()
    setIsLoggedIn(data.isAdmin)
    setLoading(false)
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  const loadData = useCallback(async () => {
    const [attrRes, judgesRes, settingsRes, scoresRes] = await Promise.all([
      fetch('/api/attractions'),
      fetch('/api/judges'),
      fetch('/api/settings'),
      fetch('/api/admin/scores'),
    ])
    const [attrData, judgesData, settingsData, scoresData] = await Promise.all([
      attrRes.json(),
      judgesRes.json(),
      settingsRes.json(),
      scoresRes.json(),
    ])
    setAttractions(Array.isArray(attrData) ? attrData : [])
    setJudges(Array.isArray(judgesData) ? judgesData : [])
    setSettings(settingsData?.error ? null : settingsData)
    setAdminScores(scoresData?.error ? null : scoresData)
  }, [])

  useEffect(() => {
    if (isLoggedIn) loadData()
  }, [isLoggedIn, loadData])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setIsLoggedIn(true)
    } else {
      toast.error('Senha incorrecta')
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsLoggedIn(false)
  }

  async function addAttraction(e: React.FormEvent) {
    e.preventDefault()
    if (!newNome.trim() || !newTema.trim() || !newEmpresa) return
    const res = await fetch('/api/attractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: newNome.trim(), tema: newTema.trim(), empresa: newEmpresa, event_date: newEventDate, ordem: attractions.length }),
    })
    if (res.ok) {
      setNewNome('')
      setNewTema('')
      toast.success('Atração adicionada')
      loadData()
    } else {
      toast.error('Erro ao adicionar')
    }
  }

  async function deleteAttraction(id: string) {
    const res = await fetch('/api/attractions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('Removida'); loadData() }
  }

  async function addJudge(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/judges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newJudgeLabel.trim() || null, event_date: newJudgeEvent }),
    })
    if (res.ok) {
      setNewJudgeLabel('')
      toast.success('Jurado criado')
      loadData()
    } else {
      toast.error('Erro ao criar jurado')
    }
  }

  async function deleteJudge(id: string) {
    const res = await fetch('/api/judges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success('Removido'); loadData() }
  }

  async function updateSetting(key: string, value: string) {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
    toast.success('Configuração actualizada')
    loadData()
  }

  function copyJudgeLink(code: string) {
    const url = `${window.location.origin}/jurado/${code}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border">
          <CardHeader className="text-center pb-2">
            <div
              className="w-14 h-14 rounded-full bz-gradient mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ boxShadow: '0 0 30px rgba(0,201,255,0.2)' }}
            >
              🏆
            </div>
            <CardTitle className="bz-gradient-text">Painel Admin</CardTitle>
            <p className="text-muted-foreground text-xs">Festa dos Colaboradores 2026</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pass">Senha</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                />
              </div>
              <Button type="submit">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const resultRevealed = settings?.result_revealed === 'true'
  const scoresRevealed = settings?.scores_revealed === 'true'
  const votingOpen = settings?.voting_open === 'true'
  const activeEvent = settings?.active_event ?? '2026-05-05'

  const judgesForEvent = adminScores?.judges.filter(j => j.event_date === activeEvent) ?? []
  const attractionsForEvent = adminScores?.attractions.filter(a => a.event_date === activeEvent) ?? []
  const expectedVotes = judgesForEvent.length * attractionsForEvent.length
  const actualVotes = (adminScores?.votes ?? []).filter(v =>
    attractionsForEvent.some(a => a.id === v.attraction_id)
  ).length
  const allVoted = judgesForEvent.length > 0 && attractionsForEvent.length > 0 && actualVotes >= expectedVotes

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold bz-gradient-text">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Festa dos Colaboradores 2026</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
        </div>

        <Tabs defaultValue="attractions">
          <TabsList className="mb-6">
            <TabsTrigger value="attractions">Atrações</TabsTrigger>
            <TabsTrigger value="judges">Jurados</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          {/* ── ATRAÇÕES ── */}
          <TabsContent value="attractions">
            <div className="grid gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Adicionar Atração</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={addAttraction} className="grid gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>Nome</Label>
                        <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Maria Silva" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Fantasia / Celebridade</Label>
                        <Input value={newTema} onChange={e => setNewTema(e.target.value)} placeholder="Ex: Lady Gaga" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>Evento</Label>
                        <select
                          value={newEventDate}
                          onChange={e => {
                            setNewEventDate(e.target.value)
                            setNewEmpresa(EMPRESAS[e.target.value][0])
                          }}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {EVENTS.map(ev => (
                            <option key={ev.value} value={ev.value}>{ev.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Empresa</Label>
                        <select
                          value={newEmpresa}
                          onChange={e => setNewEmpresa(e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {EMPRESAS[newEventDate].map(emp => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button type="submit" className="w-fit">Adicionar</Button>
                  </form>
                </CardContent>
              </Card>

              {EVENTS.map(ev => {
                const evAttractions = attractions.filter(a => a.event_date === ev.value)
                return (
                  <Card key={ev.value}>
                    <CardHeader><CardTitle className="text-base">{ev.label}</CardTitle></CardHeader>
                    <CardContent>
                      {evAttractions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma atração adicionada.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {evAttractions.map(a => (
                            <li key={a.id} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                              <div>
                                <p className="font-medium text-sm">{a.nome}</p>
                                <p className="text-xs text-muted-foreground">{a.tema}</p>
                                {a.empresa && <p className="text-xs text-muted-foreground font-medium">{a.empresa}</p>}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAttraction(a.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remover
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* ── JURADOS ── */}
          <TabsContent value="judges">
            <div className="grid gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Adicionar Jurado</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={addJudge} className="grid gap-3">
                    <div className="flex gap-3">
                      <Input
                        value={newJudgeLabel}
                        onChange={e => setNewJudgeLabel(e.target.value)}
                        placeholder="Nome do jurado (opcional)"
                        className="flex-1"
                      />
                      <select
                        value={newJudgeEvent}
                        onChange={e => setNewJudgeEvent(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shrink-0"
                      >
                        {EVENTS.map(ev => (
                          <option key={ev.value} value={ev.value}>{ev.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button type="submit" className="w-fit">Criar Jurado</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Jurados criados</CardTitle></CardHeader>
                <CardContent>
                  {judges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum jurado criado.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {judges.map(j => (
                        <li key={j.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="secondary" className="font-mono shrink-0">{j.code}</Badge>
                            {j.label && <span className="text-sm truncate">{j.label}</span>}
                            {j.event_date && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {j.event_date === '2026-05-05' ? 'Dia 5' : 'Dia 7'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => copyJudgeLink(j.code)}>
                              Copiar Link
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteJudge(j.id)}
                            >
                              Remover
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── RESULTADOS ── */}
          <TabsContent value="results">
            <div className="grid gap-6">
              {/* Controls */}
              <Card>
                <CardHeader><CardTitle className="text-base">Controles</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Evento activo</Label>
                    <select
                      value={activeEvent}
                      onChange={e => updateSetting('active_event', e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {EVENTS.map(ev => (
                        <option key={ev.value} value={ev.value}>{ev.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Pontuações (participantes)</Label>
                    <Button
                      variant={scoresRevealed ? 'default' : 'outline'}
                      onClick={() => updateSetting('scores_revealed', scoresRevealed ? 'false' : 'true')}
                    >
                      {scoresRevealed ? '📊 Visíveis — Ocultar' : '🔒 Ocultas — Revelar'}
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Link da plateia</Label>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/placar`)
                        toast.success('Link copiado!')
                      }}
                    >
                      📋 Copiar link /placar
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Vencedor (plateia)</Label>
                    <Button
                      variant={resultRevealed ? 'default' : 'outline'}
                      disabled={!allVoted && !resultRevealed}
                      onClick={() => updateSetting('result_revealed', resultRevealed ? 'false' : 'true')}
                      title={!allVoted ? `Faltam votos: ${actualVotes}/${expectedVotes}` : ''}
                    >
                      {resultRevealed ? '🏆 Revelado — Ocultar' : '🔒 Revelar Vencedor'}
                    </Button>
                    {!allVoted && !resultRevealed && (
                      <p className="text-xs text-muted-foreground">
                        {actualVotes}/{expectedVotes} votos ({judgesForEvent.length} jurados × {attractionsForEvent.length} atrações)
                      </p>
                    )}
                    {allVoted && !resultRevealed && (
                      <p className="text-xs text-green-600 font-medium">✓ Todos votaram</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Score table */}
              {adminScores && adminScores.attractions.filter(a => a.event_date === activeEvent).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">
                    Pontuação — {EVENTS.find(e => e.value === activeEvent)?.label}
                  </CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium">Atração</th>
                          {adminScores.judges.map(j => (
                            <th key={j.id} className="text-center py-2 px-2 font-medium">
                              <span className="font-mono text-xs">{j.code}</span>
                              {j.label && <><br /><span className="font-normal text-muted-foreground">{j.label}</span></>}
                            </th>
                          ))}
                          <th className="text-center py-2 px-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminScores.attractions
                          .filter(a => a.event_date === activeEvent)
                          .map(a => {
                            const rowVotes = adminScores.votes.filter(v => v.attraction_id === a.id)
                            const total = rowVotes.reduce((s, v) => s + (v.total ?? 0), 0)
                            return { ...a, _total: total }
                          })
                          .sort((a, b) => b._total - a._total)
                          .map((a, idx) => {
                            const rowVotes = adminScores.votes.filter(v => v.attraction_id === a.id)
                            const total = a._total
                            return (
                              <tr key={a.id} className="border-b last:border-0">
                                <td className="py-2 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}º</span>
                                    <div>
                                      <p className="font-medium">{a.nome}</p>
                                      <p className="text-xs text-muted-foreground">{a.tema}</p>
                                    </div>
                                  </div>
                                </td>
                                {adminScores.judges.map(j => {
                                  const v = rowVotes.find(v => v.judges?.code === j.code)
                                  return (
                                    <td key={j.id} className="text-center py-2 px-2">
                                      {v ? (
                                        <div className="text-xs space-y-0.5">
                                          <div>T:{v.adesao_tema} C:{v.criatividade} P:{v.performance}</div>
                                          <div className="font-bold">{v.total}</div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="text-center py-2 px-2 font-bold">{total || '—'}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <div className="text-center">
                <Button variant="outline" size="sm" onClick={loadData}>↺ Actualizar</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
