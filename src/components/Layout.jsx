import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/', label: 'Übersicht', ico: '🏠', end: true },
  { to: '/artikel', label: 'Artikel', ico: '📦' },
  { to: '/buchen', label: 'Buchen', ico: '↔️' },
  { to: '/projekte', label: 'Projekte', ico: '🏗️' },
  { to: '/inventur', label: 'Inventur', ico: '📋' },
]

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="app">
      <header className="topbar">
        <h1>CH-Inventur</h1>
        <div className="user">
          <span>
            {profile?.name || '…'}
            {profile?.rolle === 'Admin' && ' · Admin'}
          </span>
          <button onClick={signOut} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
            Abmelden
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottomnav">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico">{n.ico}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
