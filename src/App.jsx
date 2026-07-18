import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Artikel from './pages/Artikel'
import ArtikelDetail from './pages/ArtikelDetail'
import Buchen from './pages/Buchen'
import Projekte from './pages/Projekte'
import Inventur from './pages/Inventur'
import InventurDetail from './pages/InventurDetail'
import Lagerorte from './pages/Lagerorte'
import Historie from './pages/Historie'

function NotConfigured() {
  return (
    <div className="login">
      <div className="error">
        <strong>Supabase ist nicht konfiguriert.</strong>
      </div>
      <p className="muted">
        Bitte eine Datei <code>.env</code> mit <code>VITE_SUPABASE_URL</code> und{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> anlegen (Vorlage: <code>.env.example</code>) und
        die App neu starten. Details in der <code>README.md</code>.
      </p>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (!isConfigured) return <NotConfigured />
  if (loading) return <div className="empty">Lädt …</div>
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="artikel" element={<Artikel />} />
        <Route path="artikel/:id" element={<ArtikelDetail />} />
        <Route path="buchen" element={<Buchen />} />
        <Route path="projekte" element={<Projekte />} />
        <Route path="inventur" element={<Inventur />} />
        <Route path="inventur/:id" element={<InventurDetail />} />
        <Route path="lagerorte" element={<Lagerorte />} />
        <Route path="historie" element={<Historie />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
