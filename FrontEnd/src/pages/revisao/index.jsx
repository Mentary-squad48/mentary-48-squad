import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Check, X, AlertCircle } from 'lucide-react'
import Sidebar from '../../components/sidebar'
import Select from '../../components/select'
import DocViewer from '../../components/docviewer'
import RejectModal from '../../components/rejectmodal'
import avatar from '../../assets/avatar.png'
import { DISCIPLINAS, BNCC, SAEB, DIFICULDADES } from '../../data/mock'
import { useExtracao } from '../../contexts/ExtracaoContext'
import { API_SALVA_EDICOES, approveQuestion, updateQuestion } from '../../services/documents'
import './style.css'
import ThemeToggle from '../../components/themetoggle'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function Revisao() {
  const { state } = useLocation() // { index } opcional: abrir direto numa questão (vindo do Resumo)
  const navigate = useNavigate()
  const { questions, setQuestions, file } = useExtracao()
  const [current, setCurrent] = useState(state?.index ?? 0)
  const [errors, setErrors] = useState([])
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)

  const q = questions[current]
  const reviewed = questions.filter((item) => item.status !== 'pendente').length

  if (!q) return <Navigate to="/extrator" replace /> // sem extração em memória

  function update(patch) {
    setQuestions((prev) => prev.map((item, i) => (i === current ? { ...item, ...patch } : item)))
  }

  function updateAlternativa(index, value) {
    update({ alternativas: q.alternativas.map((a, i) => (i === index ? value : a)) })
  }

  function goTo(index) {
    setCurrent(index)
    setErrors([])
  }

  function next() {
    if (current < questions.length - 1) goTo(current + 1)
    else navigate('/resumo') // fim da revisão
  }

  function validate() {
    const list = []
    if (!q.enunciado.trim()) list.push('Preencha o enunciado.')
    if (q.alternativas.some((a) => !a.trim())) list.push('Preencha todas as alternativas.')
    if (!q.disciplina || !q.bncc) list.push('Selecione a disciplina e a habilidade BNCC.')
    if (!q.dificuldade) list.push('Selecione o nível de dificuldade.')
    if (q.gabarito === null || q.gabarito === undefined) list.push('Marque o gabarito.')
    return list
  }

  async function approve() {
    const list = validate()
    setErrors(list)
    if (list.length) return

    setBusy(true)
    try {
      if (q.serverId) {
        if (API_SALVA_EDICOES) await updateQuestion(q.serverId, q) // grava as edições antes de homologar
        await approveQuestion(q.serverId)
      }
      update({ status: 'aprovada' })
      next()
    } catch (err) {
      setErrors([err.message])
    } finally {
      setBusy(false)
    }
  }

  function later() {
    update({ status: 'depois' })
    next()
  }

  function reject(motivo) {
    update({ status: 'recusada', motivo })
    setRejecting(false)
    next()
  }

  return (
    <div className="layout">
      <Sidebar compact />

      <main className="layout__main">
        <ThemeToggle/>
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title page-title--top">Revisão da extração</h1>

        <nav className="stepper" aria-label="Questões">
          {questions.map((item, i) => (
            <button
              key={item.id}
              className={`step step--${item.status} ${i === current ? 'step--current' : ''}`}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          ))}
          <span className="stepper__info">
            Questão {current + 1} de {questions.length} · {reviewed} revisadas
          </span>
          <button className="btn-outline stepper__summary" onClick={() => navigate('/resumo')}>
            Ver resumo
          </button>
        </nav>

        <div className="revisao__split">
          {/* Esquerda: documento original */}
          <DocViewer url={file?.url} name={file?.name} />

          {/* Direita: formulário */}
          <section className="revisao__form">
            {q.status === 'recusada' && (
              <p className="notice">Recusada. Motivo: {q.motivo}</p>
            )}

            {!API_SALVA_EDICOES && q.status !== 'aprovada' && (
              <p className="notice notice--info">
                Atenção: a API ainda não salva edições. Ao aprovar, a questão é homologada como foi extraída.
              </p>
            )}

            <div className="field">
              <label htmlFor="apoio">Texto de apoio (opcional)</label>
              <textarea
                id="apoio"
                rows={5}
                value={q.apoio}
                onChange={(e) => update({ apoio: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="enunciado">Enunciado</label>
              <textarea
                id="enunciado"
                rows={3}
                value={q.enunciado}
                onChange={(e) => update({ enunciado: e.target.value })}
              />
            </div>

            <fieldset className="field">
              <legend>Alternativas (marque o gabarito)</legend>
              {q.alternativas.map((alt, i) => (
                <div key={i} className="alt">
                  <span className="alt__letter">{LETTERS[i]}</span>
                  <textarea
                    rows={2}
                    value={alt}
                    aria-label={`Alternativa ${LETTERS[i]}`}
                    onChange={(e) => updateAlternativa(i, e.target.value)}
                  />
                  <input
                    type="radio"
                    name="gabarito"
                    checked={q.gabarito === i}
                    onChange={() => update({ gabarito: i })}
                    aria-label={`Gabarito: alternativa ${LETTERS[i]}`}
                  />
                </div>
              ))}
            </fieldset>

            <div className="meta">
              <h2>Metadados curriculares</h2>
              <Select
                label="Disciplina"
                value={q.disciplina}
                onChange={(v) => update({ disciplina: v, bncc: '', saeb: '' })}
                options={DISCIPLINAS}
              />
              <Select
                label="Habilidade BNCC"
                value={q.bncc}
                onChange={(v) => update({ bncc: v })}
                options={BNCC.filter((b) => b.disciplina === q.disciplina)}
                disabled={!q.disciplina}
              />
              <Select
                label="Descritor SAEB"
                value={q.saeb}
                onChange={(v) => update({ saeb: v })}
                options={SAEB.filter((s) => s.disciplina === q.disciplina)}
                disabled={!q.disciplina}
              />
              <Select
                label="Nível de dificuldade"
                value={q.dificuldade}
                onChange={(v) => update({ dificuldade: v })}
                options={DIFICULDADES.map((d) => ({ value: d, label: d }))}
              />
            </div>

            {errors.length > 0 && (
              <ul className="errors" role="alert">
                {errors.map((e) => (
                  <li key={e}><AlertCircle size={16} /> {e}</li>
                ))}
              </ul>
            )}

            <footer className="revisao__actions">
              <button className="action action--later" onClick={later} disabled={busy}>Revisar depois</button>
              <button className="action action--refuse" onClick={() => setRejecting(true)} disabled={busy}>
                Rejeitar <X size={20} />
              </button>
              <button className="action action--approve" onClick={approve} disabled={busy}>
                {busy ? 'Aprovando…' : 'Aprovar'} <Check size={20} />
              </button>
            </footer>
          </section>
        </div>
      </main>

      {rejecting && <RejectModal onCancel={() => setRejecting(false)} onConfirm={reject} />}
    </div>
  )
}

export default Revisao