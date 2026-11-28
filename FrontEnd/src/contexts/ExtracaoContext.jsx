import { createContext, useContext, useState } from 'react'

// Extração em andamento: compartilhada entre Revisão, Resumo e "Revisar depois".
const ExtracaoContext = createContext(null)

export function ExtracaoProvider({ children }) {
  const [questions, setQuestions] = useState([])
  const [file, setFile] = useState(null) // { url, name } (pré-visualização local)
  const [documentId, setDocumentId] = useState(null)

  function load(doc, fileInfo) {
    setQuestions(doc.questoes)
    setDocumentId(doc.id)
    setFile(fileInfo)
  }

  function reset() {
    if (file?.url) URL.revokeObjectURL(file.url)
    setQuestions([])
    setFile(null)
    setDocumentId(null)
  }

  return (
    <ExtracaoContext.Provider value={{ questions, setQuestions, file, documentId, load, reset }}>
      {children}
    </ExtracaoContext.Provider>
  )
}

export const useExtracao = () => useContext(ExtracaoContext)