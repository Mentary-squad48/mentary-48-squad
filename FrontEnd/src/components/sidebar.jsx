import { NavLink } from 'react-router-dom'
import { User, FileText, Menu } from 'lucide-react'

function Sidebar({ compact = false }) {
  if (compact) {
    return (
      <aside className="sidebar sidebar--compact">
        <button className="sidebar__menu" aria-label="Abrir menu">
          <Menu size={30} />
        </button>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <User size={80} strokeWidth={1.5} />
      </div>

      <h2 className="sidebar__school">Escola municipal de Santana</h2>

      <nav className="sidebar__nav">
        <NavLink to="/extrator" className="sidebar__link">
          <FileText size={26} />
          Extrator de questões
        </NavLink>
      </nav>
    </aside>
  )
}

export default Sidebar