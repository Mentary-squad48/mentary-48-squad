import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, GraduationCap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ThemeToggle from '../../components/themetoggle'
import './style.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), senha)
      navigate(state?.from?.pathname ?? '/extrator', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <ThemeToggle />
      <form className="login__card" onSubmit={submit}>
        <div className="sidebar__logo login__logo"><GraduationCap size={64} /></div>
        <h1 className="page-title page-title--top">Entrar</h1>

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>

        {error && <p className="errors" role="alert"><AlertCircle size={16} /> {error}</p>}

        <button className="btn-blue" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}