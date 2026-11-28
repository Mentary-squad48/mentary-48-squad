import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/sidebar'
import ThemeToggle from '../../components/themetoggle'
import avatar from '../../assets/avatar.png'
import { useExtracao } from '../../contexts/ExtracaoContext'
import './style.css'

export default function RevisarDepois() {
  const navigate = useNavigate()
  const { questions } = useExtracao()

  // guarda o índice original para abrir a questão certa na Revisão
  const pending = questions
    .map((q, index) => ({ q, index }))
    .filter(({ q }) => q.status === 'depois')

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">
        <ThemeToggle />
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title">Revisar depois</h1>

        {pending.length === 0 ? (
          <div className="depois__empty">
            <p>Nenhuma questão aguardando revisão.</p>
            <button className="btn-blue" onClick={() => navigate('/extrator')}>Extrair questões</button>
          </div>
        ) : (
          <ul className="depois__list">
            {pending.map(({ q, index }) => (
              <li key={q.id} className="depois__item">
                <span className="resumo__num">{index + 1}</span>
                <div className="depois__body">
                  <p className="resumo__text">{q.enunciado}</p>
                  {q.disciplina && <small>{q.disciplina}</small>}
                </div>
                <button className="btn-blue"
                  onClick={() => navigate('/revisao', { state: { index } })}>
                  Revisar
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}