import { FileText, Trash2, Loader2, CheckCircle2, Clock } from 'lucide-react'

const STATUS = {
  fila: { label: 'Na fila', icon: <Clock size={16} /> },
  processando: { label: 'Processando (IA/OCR)', icon: <Loader2 size={16} className="spin" /> },
  pronto: { label: 'Pronto para revisão', icon: <CheckCircle2 size={16} /> },
}

function formatSize(bytes) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileCard({ file, onRemove }) {
  if (!file) {
    return (
      <div className="filecard filecard--empty">
        <FileText size={40} strokeWidth={1.2} />
        <p>Nenhum arquivo enviado ainda.</p>
      </div>
    )
  }

  return (
    <div className="filecard">
      <FileText size={40} strokeWidth={1.2} className="filecard__icon" />

      <div className="filecard__info">
        <p className="filecard__name" title={file.name}>{file.name}</p>
        <small>{formatSize(file.size)}</small>

        {file.status === 'enviando' ? (
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={file.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress__bar" style={{ width: `${file.progress}%` }} />
          </div>
        ) : (
          <span className={`status status--${file.status}`}>
            {STATUS[file.status].icon}
            {STATUS[file.status].label}
          </span>
        )}
      </div>

      <button className="filecard__remove" aria-label="Remover arquivo" onClick={onRemove}>
        <Trash2 size={20} />
      </button>
    </div>
  )
}

export default FileCard