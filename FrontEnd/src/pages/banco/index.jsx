import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Atom, Bookmark, BookOpen, Calculator, Dna, Plus, Search } from 'lucide-react'
import Sidebar from '../../components/sidebar'
import Select from '../../components/select'
import ThemeToggle from '../../components/themetoggle'
import avatar from '../../assets/avatar.png'
import './style.css'

const ICONS = { livro: BookOpen, calculadora: Calculator, dna: Dna, atomo: Atom }

// MOCK: troque por api('/questoes/categorias?...') quando o back-end estiver pronto.
const CATEGORIAS = [
  { id: 1, titulo: 'Sintaxe', icone: 'livro', disciplina: 'Língua Portuguesa', bncc: 'EF09LP04', ano: '7º ano', dificuldade: 'Fácil', total: 20, origem: 'criada' },
  { id: 2, titulo: 'Aritmética e Conjuntos Numéricos', icone: 'calculadora', disciplina: 'Matemática', bncc: 'EF07MA01', ano: '7º ano', dificuldade: 'Médio', total: 12, origem: 'criada' },
  { id: 3, titulo: 'Citologia', icone: 'dna', disciplina: 'Ciências', bncc: 'EF07CI01', ano: '7º ano', dificuldade: 'Médio', total: 8, origem: 'extraida' },
  { id: 4, titulo: 'Termodinâmica', icone: 'atomo', disciplina: 'Ciências', bncc: 'EF09CI01', ano: '9º ano', dificuldade: 'Difícil', total: 13, origem: 'extraida' },
]

const EMPTY = { disciplina: '', bncc: '', ano: '', dificuldade: '' }
const opts = (key) => [...new Set(CATEGORIAS.map((c) => c[key]))].map((v) => ({ value: v, label: v }))

export default function Banco() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(EMPTY)
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('todas') // todas | criadas | salvas
  const [salvas, setSalvas] = useState(new Set())

  const lista = useMemo(() => CATEGORIAS.filter((c) => {
    if (aba === 'criadas' && c.origem !== 'criada') return false
    if (aba === 'salvas' && !salvas.has(c.id)) return false
    if (busca && !c.titulo.toLowerCase().includes(busca.toLowerCase())) return false
    return Object.entries(filters).every(([k, v]) => !v || c[k] === v)
  }), [filters, busca, aba, salvas])

  const setFilter = (key) => (v) => setFilters((f) => ({ ...f, [key]: v }))

  function toggleSalva(id) {
    setSalvas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">
        <ThemeToggle />
        <img src={avatar} alt="Perfil" className="avatar" />
        <h1 className="page-title">Banco de Questões</h1>

        <div className="banco">
          <aside className="banco__side">
            <div className="banco__panel">
              <Select label="Disciplina" value={filters.disciplina} onChange={setFilter('disciplina')} options={opts('disciplina')} />
              <Select label="Código BNCC" value={filters.bncc} onChange={setFilter('bncc')} options={opts('bncc')} />
              <Select label="Ano escolar" value={filters.ano} onChange={setFilter('ano')} options={opts('ano')} />
              <Select label="Dificuldade" value={filters.dificuldade} onChange={setFilter('dificuldade')} options={opts('dificuldade')} />
              <button className="btn-blue" onClick={() => setFilters(EMPTY)}>Limpar</button>
            </div>
            <div className="banco__panel">
              <button className={`btn-outline ${aba === 'criadas' ? 'is-active' : ''}`}
                onClick={() => setAba(aba === 'criadas' ? 'todas' : 'criadas')}>Questões criadas</button>
              <button className={`btn-outline ${aba === 'salvas' ? 'is-active' : ''}`}
                onClick={() => setAba(aba === 'salvas' ? 'todas' : 'salvas')}>
                Questões salvas <Bookmark size={18} />
              </button>
            </div>
          </aside>

          <section className="banco__content">
            <div className="banco__bar">
              <p className="banco__count">{lista.length} resultados encontrados</p>
              <label className="banco__search">
                <Search size={18} />
                <input placeholder="ex: Revolução Francesa" value={busca} onChange={(e) => setBusca(e.target.value)} />
              </label>
              <button className="btn-blue" onClick={() => navigate('/extrator')}>
                <Plus size={18} /> Adicionar questões
              </button>
            </div>

            {lista.length === 0 ? (
              <p className="banco__empty">Nenhuma categoria com esses filtros. Limpe os filtros ou adicione questões.</p>
            ) : (
              <ul className="banco__grid">
                {lista.map((c) => {
                  const Icon = ICONS[c.icone] ?? BookOpen
                  return (
                    <li key={c.id} className="card">
                      <Icon size={44} className="card__icon" />
                      <h2 className="card__title">{c.titulo}</h2>
                      <div className="card__meta">
                        <span>{c.total} questões</span>
                        <strong>{c.dificuldade}</strong>
                        <button className="card__save" aria-pressed={salvas.has(c.id)}
                          aria-label={`Salvar ${c.titulo}`} onClick={() => toggleSalva(c.id)}>
                          <Bookmark size={18} fill={salvas.has(c.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}