function DocViewer({ url, name }) {
  const ext = name ? name.split('.').pop().toLowerCase() : ''

  let content
  if (!url) {
    content = <p>Nenhum documento selecionado. Envie um arquivo pelo Extrator.</p>
  } else if (ext === 'pdf') {
    content = <iframe className="docviewer__frame" src={url} title={name} />
  } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
    content = <img className="docviewer__image" src={url} alt={name} />
  } else {
    content = <p>Pré-visualização indisponível para planilhas ({name}).</p>
  }

  return <div className="docviewer">{content}</div>
}

export default DocViewer