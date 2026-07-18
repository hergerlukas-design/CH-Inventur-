import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable, useStammdaten } from '../hooks/useData'

const TYPEN = [
  'Wareneingang',
  'Verbrauch',
  'Projektausgabe',
  'Projektrueckgabe',
  'Umlagerung',
  'Inventurkorrektur',
]

export default function Historie() {
  const bewegungen = useTable('bewegung', {
    build: (q) => q.order('zeitstempel', { ascending: false }).limit(200),
  })
  const artikel = useTable('artikel')
  const { projekte } = useStammdaten()
  const [typFilter, setTypFilter] = useState('')

  const artikelName = (aid) => artikel.data.find((a) => a.id === aid)?.name ?? 'Artikel'
  const projektName = (pid) => projekte.find((p) => p.id === pid)?.name

  const gefiltert = useMemo(
    () => bewegungen.data.filter((b) => !typFilter || b.typ === typFilter),
    [bewegungen.data, typFilter]
  )

  return (
    <div>
      <Link to="/" className="muted">
        ← Übersicht
      </Link>
      <div className="section-title">
        <h2>Historie</h2>
      </div>

      <div className="card" style={{ padding: '0.7rem' }}>
        <select value={typFilter} onChange={(e) => setTypFilter(e.target.value)}>
          <option value="">Alle Bewegungsarten</option>
          {TYPEN.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {gefiltert.length === 0 ? (
        <div className="empty">Keine Bewegungen.</div>
      ) : (
        gefiltert.map((b) => (
          <div key={b.id} className="list-item">
            <div>
              <div>{artikelName(b.artikel_id)}</div>
              <div className="meta">
                {b.typ}
                {b.projekt_id && projektName(b.projekt_id) && ` · ${projektName(b.projekt_id)}`}
                {' · '}
                {new Date(b.zeitstempel).toLocaleString('de-CH')}
              </div>
            </div>
            <span className="badge">{b.menge}</span>
          </div>
        ))
      )}
    </div>
  )
}
