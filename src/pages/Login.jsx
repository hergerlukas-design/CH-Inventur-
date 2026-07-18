import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
        setInfo('Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte Postfach prüfen.')
      }
    } catch (err) {
      setError(err.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="brand">
        <img src="/icon.svg" width="56" height="56" alt="" />
        <h1>CH-Inventur</h1>
        <p className="muted">Lager- &amp; Warenwirtschaft</p>
      </div>

      {error && <div className="error">{error}</div>}
      {info && (
        <div className="error" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
          {info}
        </div>
      )}

      <form onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label>E-Mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button className="primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </button>
      </form>

      <p className="muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
        {mode === 'login' ? 'Noch kein Konto?' : 'Schon registriert?'}{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
          }}
        >
          {mode === 'login' ? 'Registrieren' : 'Anmelden'}
        </a>
      </p>
    </div>
  )
}
