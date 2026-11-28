import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/sidebar'
import Dropzone from '../../components/dropzone'
import FileCard from '../../components/filecard'
import ThemeToggle from '../../components/themetoggle'
import { useExtracao } from '../../contexts/ExtracaoContext'
import { getDocument, retryDocument, uploadDocument } from '../../services/documents'
import avatar from '../../assets/avatar.png'
import './style.css'

const POLL_MS = 3000

// Ciclo do arquivo: enviando -> processando (PENDENTE na API) -> pronto (PROCESSADO) | erro (ERRO)
function Extrator() {
  const navigate = useNavigate()
  const { load } = useExtracao()
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const attempt = useRef(0) // ignora respostas de envios que já foram substituídos/removidos

  // Consulta a API até o documento sair de PENDENTE.
  useEffect(() => {
    if (file?.status !== 'processando' || !file.documentId) return
    let alive = true

    async function check() {
      try {
        const doc = await getDocument(file.documentId)
        if (!alive) return
        setError('')
        if (doc.status === 'PROCESSADO') setFile((f) => ({ ...f, status: 'pronto', doc }))
        else if (doc.status === 'ERRO')
          setFile((f) => ({ ...f, status: 'erro', error: 'A IA não conseguiu processar este documento.' }))
      } catch (err) {
        if (alive) setError(err.message) // falha de rede pontual: continua tentando
      }
    }

    check()
    const timer = setInterval(check, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [file?.status, file?.documentId])

  async function selectFile(selected) {
    if (file?.url) URL.revokeObjectURL(file.url)
    const id = ++attempt.current
    const url = URL.createObjectURL(selected)

    setError('')
    setFile({ name: selected.name, size: selected.size, url, status: 'enviando', progress: 0 })

    try {
      const doc = await uploadDocument(selected, (progress) => {
        if (id === attempt.current) setFile((f) => f && { ...f, progress })
      })
      if (id !== attempt.current) return
      setFile((f) => ({ ...f, documentId: doc.id, status: 'processando' }))
    } catch (err) {
      if (id !== attempt.current) return
      URL.revokeObjectURL(url)
      setFile(null)
      setError(err.message)
    }
  }

  function removeFile() {
    attempt.current++
    if (file?.url) URL.revokeObjectURL(file.url)
    setFile(null)
    setError('')
  }

  async function retry() {
    setFile((f) => ({ ...f, status: 'processando', error: '' }))
    try {
      await retryDocument(file.documentId)
    } catch (err) {
      setFile((f) => ({ ...f, status: 'erro', error: err.message }))
    }
  }

  function review() {
    load(file.doc, { url: file.url, name: file.name }) // Revisão e Resumo leem do contexto
    navigate('/revisao')
  }

  const total = file?.doc?.questoes.length ?? 0
  const ready = file?.status === 'pronto' && total > 0

  return (
    <div className="layout">
      <Sidebar />

      <main className="layout__main">
        <ThemeToggle />
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title">Extrator de Questões</h1>

        <div className="extrator__body">
          <div className="extrator__left">
            <FileCard file={file} onRemove={removeFile} onRetry={retry} />
            {file?.status === 'pronto' && total === 0 && (
              <p className="extrator__error">Nenhuma questão foi encontrada neste documento.</p>
            )}
            <button className="btn-blue extrator__review" disabled={!ready} onClick={review}>
              {ready ? `Revisar ${total} ${total === 1 ? 'questão' : 'questões'}` : 'Revisar questões'}
            </button>
          </div>

          <div className="extrator__right">
            <Dropzone onFile={selectFile} onError={setError} />
            {error && <p className="extrator__error" role="alert">{error}</p>}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Extrator