import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTable } from '../hooks/useData'
import Modal from '../components/Modal'

export default function Projekte() {
  const { isAdmin } = useAuth()
  const projekte = useTable('projekt', { build: (q) => q.order('created_at', { ascending: false }) })
  const bestand = useTable('bestand', { build: (q) => q.not('projekt_id', 'is', null) })
  const artikel = useTable('artikel')
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)

  const einsatz = (projektId) => bestand.data.filter((b) => b.projekt_id === projektId && b.menge > 0)
  const artikelName = (aid) => artikel.data.find((a) => a.id === aid)?.name ?? 'Artikel'

  async function save() {
    setError(null)
    const payload = { name: form.name.trim(), status: form.status }
    const res = form.id
      ? await supabase.from('projekt').update(payload).eq('id', form.id)
      : await supabase.from('projekt').insert(payload)
    if (res.error) setError(res.error.message)
    else setForm(null)
  }

  async function loeschen(p) {
    if (!confirm(`Projekt "${p.name}" löschen?`)) return
    const { error } = await supabase.from('projekt').delete().eq('id', p.id)
    if (error) alert(error.message)
  }

  return (
    <div>
      <div className="section-title">
        <h2>Projekte</h2>
        <button className="primary" onClick={() => setForm({ name: '', status: 'aktiv' })}>
          + Neu
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {projekte.data.length === 0 ? (
        <div className="empty">Noch keine Projekte.</div>
      ) : (
        projekte.data.map((p) => {
          const items = einsatz(p.id)
          return (
            <div key={p.id} className="card">
              <div className="row spread">
                <div>
                  <strong>{p.name}</strong>{' '}
                  <span className={`badge ${p.status === 'aktiv' ? 'aktiv' : ''}`}>{p.status}</span>
                </div>
                <div className="row">
                  <button onClick={() => setForm(p)} style={{ padding: '0.3rem 0.6rem' }}>
                    ✏️
                  </button>
                  {isAdmin && (
                    <button className="danger" onClick={() => loeschen(p)} style={{ padding: '0.3rem 0.6rem' }}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div className="meta">Im Einsatz:</div>
                  {items.map((b) => (
                    <div key={b.id} className="row spread" style={{ fontSize: '0.85rem', padding: '0.2rem 0' }}>
                      <span>{artikelName(b.artikel_id)}</span>
                      <span className="badge">{b.menge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {form && (
        <Modal title={form.id ? 'Projekt bearbeiten' : 'Neues Projekt'} onClose={() => setForm(null)}>
          <div className="field">
            <label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="aktiv">aktiv</option>
              <option value="abgeschlossen">abgeschlossen</option>
            </select>
          </div>
          <button className="primary" style={{ width: '100%' }} disabled={!form.name.trim()} onClick={save}>
            Speichern
          </button>
        </Modal>
      )}
    </div>
  )
}
