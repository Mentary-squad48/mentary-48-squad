import { Navigate, useNavigate } from 'react-router-dom'
import { FileText, Pencil, Plus } from 'lucide-react'
import Sidebar from '../../components/sidebar'
import ThemeToggle from '../../components/themetoggle'
import avatar from '../../assets/avatar.png'
import { useExtracao } from '../../contexts/ExtracaoContext'
import './style.css'

const STATUS = {
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  depois: 'Revisar depois',
  pendente: 'Pendente',
}

export default function Resumo() {
  const navigate = useNavigate()
  const { questions, file, reset } = useExtracao()

  if (!questions.length) return <Navigate to="/extrator" replace />

  const count = (s) => questions.filter((q) => q.status === s).length
  const firstOpen = questions.findIndex((q) => q.status === 'pendente' || q.status === 'depois')

  function newExtraction() {
    reset()
    navigate('/extrator')
  }

  return (
    <div className="layout">
      <Sidebar compact />
      <main className="layout__main">
        <ThemeToggle />
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title page-title--top">Resumo da extração</h1>

        <section className="resumo__doc">
          <FileText size={32} className="filecard__icon" />
          <div>
            <strong>{file?.name ?? 'Documento enviado'}</strong>
            <p className="resumo__counts">
              {questions.length} questões · {count('aprovada')} aprovadas · {count('depois')} para revisar depois · {count('recusada')} recusadas
            </p>
          </div>
        </section>

        <ul className="resumo__list">
          {questions.map((q, i) => (
            <li key={q.id} className="resumo__item">
              <span className="resumo__num">{i + 1}</span>
              <p className="resumo__text">{q.enunciado}</p>
              <span className={`badge badge--${q.status}`}>{STATUS[q.status] ?? q.status}</span>
              <button className="resumo__edit" aria-label={`Editar questão ${i + 1}`}
                onClick={() => navigate('/revisao', { state: { index: i } })}>
                <Pencil size={18} />
              </button>
            </li>
          ))}
        </ul>

        {/* A aprovação já é enviada à API na hora (PATCH /questions/:id/approve). */}
        <footer className="resumo__actions">
          {firstOpen >= 0 && (
            <button className="action action--later"
              onClick={() => navigate('/revisao', { state: { index: firstOpen } })}>
              Continuar revisão
            </button>
          )}
          <button className="btn-blue" onClick={newExtraction}>
            <Plus size={18} /> Nova extração
          </button>
        </footer>
      </main>
    </div>
  )
}