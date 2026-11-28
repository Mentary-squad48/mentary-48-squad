import { useRef, useState } from 'react'
import { UploadCloud, Upload } from 'lucide-react'

const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'] // formatos aceitos pela API
const MAX_SIZE = 25 * 1024 * 1024 // 25 MB (limite da API)

function Dropzone({ onFile, onError }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handle(fileList) {
    if (!fileList || fileList.length === 0) return

    if (fileList.length > 1) {
      onError('Envie apenas 1 arquivo por vez.')
      return
    }

    const file = fileList[0]
    const ext = file.name.split('.').pop().toLowerCase()

    if (!EXTENSIONS.includes(ext)) {
      onError(`"${file.name}": formato não suportado.`)
      return
    }
    if (file.size > MAX_SIZE) {
      onError(`"${file.name}": acima de 25 MB.`)
      return
    }

    onError('')
    onFile(file)
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handle(e.dataTransfer.files)
      }}
    >
      <UploadCloud size={72} strokeWidth={1.2} className="dropzone__icon" />
      <p className="dropzone__title">Escolha o arquivo ou arraste e solte</p>
      <p className="dropzone__hint">1 arquivo · PDF, PNG ou JPG até 25 MB</p>

      <button className="btn-blue dropzone__btn" onClick={() => inputRef.current.click()}>
        <Upload size={20} />
        Envio de arquivo
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        hidden
        onChange={(e) => {
          handle(e.target.files)
          e.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />
    </div>
  )
}

export default Dropzone