import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTable } from '../hooks/useData'

export default function Inventur() {
  const navigate = useNavigate()
  const inventuren = useTable('inventur', { build: (q) => q.order('created_at', { ascending: false }) })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function starten() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('starte_inventur', { p_notiz: null })
    setBusy(false)
    if (error) setError(error.message)
    else navigate(`/inventur/${data}`)
  }

  return (
    <div>
      <div className="section-title">
        <h2>Inventur</h2>
        <button className="primary" disabled={busy} onClick={starten}>
          {busy ? '…' : '+ Neue Inventur'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <p className="muted" style={{ fontSize: '0.85rem' }}>
        Eine neue Inventur erzeugt einen Snapshot aller aktuellen (freien) Bestände als
        Soll-Werte. Danach jede Position zählen und den Ist-Wert erfassen. Beim Abschluss
        werden Differenzen automatisch als Inventurkorrektur gebucht. Für Bulk-Artikel gilt
        die hinterlegte Toleranz.
      </p>

      {inventuren.data.length === 0 ? (
        <div className="empty">Noch keine Inventuren.</div>
      ) : (
        inventuren.data.map((i) => (
          <div
            key={i.id}
            className="list-item"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/inventur/${i.id}`)}
          >
            <div>
              <div>Inventur {new Date(i.datum).toLocaleDateString('de-CH')}</div>
              {i.notiz && <div className="meta">{i.notiz}</div>}
            </div>
            <span className={`badge ${i.status === 'offen' ? 'warn' : 'aktiv'}`}>{i.status}</span>
          </div>
        ))
      )}
    </div>
  )
}
