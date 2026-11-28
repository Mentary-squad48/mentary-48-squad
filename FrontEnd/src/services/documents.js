import { api, apiUpload } from './api'

// Quando o back-end ganhar a rota de edição (PATCH /questions/:id), troque para true.
export const API_SALVA_EDICOES = false

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/* ---------- Adaptadores: único lugar que conhece o formato da API ----------
   AJUSTE os nomes dos campos aqui se o JSON real for diferente. */

function toAlternativas(raw) {
  if (!raw) return ['', '', '', '']
  if (Array.isArray(raw)) {
    return raw.map((a) => (typeof a === 'string' ? a : (a?.texto ?? a?.text ?? a?.descricao ?? '')))
  }
  if (typeof raw === 'object') return Object.keys(raw).sort().map((k) => raw[k]) // { A: '...', B: '...' }
  return ['', '', '', '']
}

function toGabarito(raw) {
  if (raw === null || raw === undefined || raw === '') return null // extração sem gabarito: revisão humana
  if (typeof raw === 'number') return raw
  const i = LETTERS.indexOf(String(raw).trim().toUpperCase())
  return i >= 0 ? i : null
}

export function normalizeQuestion(q) {
  return {
    id: q.id,
    serverId: q.id,
    status: q.ehHomologada ? 'aprovada' : 'pendente',
    motivo: '',
    apoio: q.textoApoio ?? q.apoio ?? '',
    enunciado: q.enunciado ?? '',
    alternativas: toAlternativas(q.alternativas),
    gabarito: toGabarito(q.gabarito),
    disciplina: q.disciplina ?? '',
    bncc: q.codigoBncc ?? q.bncc ?? '',
    saeb: q.descritorSaeb ?? q.saeb ?? '',
    dificuldade: q.dificuldade ?? '',
  }
}

export function normalizeDocument(raw) {
  const d = raw?.data ?? raw
  return {
    id: d.id,
    status: String(d.status ?? d.estado ?? '').toUpperCase(), // PENDENTE | PROCESSADO | ERRO
    nome: d.nomeArquivo ?? d.nome ?? '',
    questoes: (d.questoes ?? d.questions ?? []).map(normalizeQuestion),
  }
}

/* ---------- Rotas (guia do back-end) ---------- */

export const uploadDocument = async (file, onProgress) =>
  normalizeDocument(await apiUpload('/documents', file, onProgress))

export const listDocuments = async () => {
  const data = await api('/documents')
  return (data?.data ?? data ?? []).map(normalizeDocument)
}

export const getDocument = async (id) => normalizeDocument(await api(`/documents/${id}`))

export const retryDocument = (id) => api(`/documents/${id}/retry`, { method: 'POST' })

export const approveQuestion = (id) => api(`/questions/${id}/approve`, { method: 'PATCH' })

// Ainda NÃO existe no back-end. Rota e corpo abaixo são uma proposta.
export const updateQuestion = (id, q) =>
  api(`/questions/${id}`, {
    method: 'PATCH',
    body: {
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      gabarito: LETTERS[q.gabarito],
      descritorSaeb: q.saeb || null,
    },
  })