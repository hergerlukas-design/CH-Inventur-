import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTable } from '../hooks/useData'
import Modal from '../components/Modal'

export default function Lagerorte() {
  const { isAdmin } = useAuth()
  const lagerorte = useTable('lagerort', { build: (q) => q.order('name') })
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)

  async function save() {
    setError(null)
    const payload = { name: form.name.trim() }
    const res = form.id
      ? await supabase.from('lagerort').update(payload).eq('id', form.id)
      : await supabase.from('lagerort').insert(payload)
    if (res.error) setError(res.error.message)
    else setForm(null)
  }

  async function loeschen(l) {
    if (!confirm(`Lagerort "${l.name}" löschen?`)) return
    const { error } = await supabase.from('lagerort').delete().eq('id', l.id)
    if (error) alert('Löschen nicht möglich (evtl. noch Bestand vorhanden): ' + error.message)
  }

  return (
    <div>
      <Link to="/" className="muted">
        ← Übersicht
      </Link>
      <div className="section-title">
        <h2>Lagerorte</h2>
        <button className="primary" onClick={() => setForm({ name: '' })}>
          + Neu
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {lagerorte.data.length === 0 ? (
        <div className="empty">Noch keine Lagerorte.</div>
      ) : (
        lagerorte.data.map((l) => (
          <div key={l.id} className="list-item">
            <div>📍 {l.name}</div>
            <div className="row">
              <button onClick={() => setForm(l)} style={{ padding: '0.3rem 0.6rem' }}>
                ✏️
              </button>
              {isAdmin && (
                <button className="danger" onClick={() => loeschen(l)} style={{ padding: '0.3rem 0.6rem' }}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {form && (
        <Modal title={form.id ? 'Lagerort bearbeiten' : 'Neuer Lagerort'} onClose={() => setForm(null)}>
          <div className="field">
            <label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <button className="primary" style={{ width: '100%' }} disabled={!form.name.trim()} onClick={save}>
            Speichern
          </button>
        </Modal>
      )}
    </div>
  )
}
