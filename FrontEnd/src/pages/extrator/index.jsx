import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/sidebar'
import Dropzone from '../../components/dropzone'
import FileCard from '../../components/filecard'
import ThemeToggle from '../../components/themetoggle'
import avatar from '../../assets/avatar.png'
import './style.css'

// SIMULAÇÃO da fila de IA/OCR: enviando -> fila -> processando -> pronto.
// Com back-end, troque por polling ou WebSocket.
function advance(file) {
  if (!file) return file
  if (file.status === 'enviando') {
    const progress = Math.min(file.progress + 20, 100)
    return { ...file, progress, status: progress === 100 ? 'fila' : 'enviando' }
  }
  if (file.status === 'fila') return { ...file, status: 'processando' }
  if (file.status === 'processando') return { ...file, status: 'pronto' }
  return file
}

function Extrator() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setFile(advance), 700)
    return () => clearInterval(timer)
  }, [])

  function selectFile(selected) {
    if (file) URL.revokeObjectURL(file.url) // enviar outro arquivo substitui o atual
    setFile({
      name: selected.name,
      size: selected.size,
      url: URL.createObjectURL(selected),
      status: 'enviando',
      progress: 0,
    })
  }

  function removeFile() {
    if (file) URL.revokeObjectURL(file.url)
    setFile(null)
  }

  function review() {
    navigate('/revisao', { state: { fileUrl: file.url, fileName: file.name } })
  }

  const ready = file?.status === 'pronto'

  return (
    <div className="layout">
      <Sidebar />

      <main className="layout__main">
        <ThemeToggle />
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title">Extrator de Questões</h1>

        <div className="extrator__body">
          <div className="extrator__left">
            <FileCard file={file} onRemove={removeFile} />
            <button className="btn-blue extrator__review" disabled={!ready} onClick={review}>
              Revisar questões
            </button>
          </div>

          <div className="extrator__right">
            <Dropzone onFile={selectFile} onError={setError} />
            {error && <p className="extrator__error">{error}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Extrator