export type Attraction = {
  id: string
  nome: string
  tema: string
  event_date: string
  ordem: number
  created_at: string
}

export type Judge = {
  id: string
  code: string
  label: string | null
  event_date: string | null
  created_at: string
}

export type Vote = {
  id: string
  attraction_id: string
  judge_id: string
  adesao_tema: number
  criatividade: number
  performance: number
  total: number
  submitted_at: string
}

export type AttractionScore = {
  id: string
  nome: string
  tema: string
  ordem: number
  total_score: number
  vote_count: number
}

export type Settings = {
  result_revealed: string
  active_event: string
  voting_open: string
}
