import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const MOTIVOS = ['Texto ilegível', 'Questão incompleta', 'Duplicada', 'Fora do currículo']

function RejectModal({ onCancel, onConfirm }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  function submit() {
    if (!motivo.trim()) {
      setError('Informe o motivo do descarte.')
      return
    }
    onConfirm(motivo.trim())
  }

  return (
    <div className="modal__overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="modal-title">Rejeitar questão</h2>
          <button onClick={onCancel} aria-label="Fechar"><X size={22} /></button>
        </header>

        <p>Qual o motivo do descarte?</p>

        <div className="modal__chips">
          {MOTIVOS.map((m) => (
            <button key={m} className="chip" onClick={() => { setMotivo(m); setError('') }}>
              {m}
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          value={motivo}
          placeholder="Descreva o motivo..."
          onChange={(e) => { setMotivo(e.target.value); setError('') }}
          autoFocus
        />
        {error && <p className="field__error">{error}</p>}

        <footer className="modal__footer">
          <button className="btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn-blue" onClick={submit}>Confirmar rejeição</button>
        </footer>
      </div>
    </div>
  )
}

export default RejectModal