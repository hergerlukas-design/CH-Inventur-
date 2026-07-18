import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTable } from '../hooks/useData'
import BarcodeLabel, { printBarcode } from '../components/BarcodeLabel'
import Modal from '../components/Modal'

export default function ArtikelDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [artikel, setArtikel] = useState(null)
  const [error, setError] = useState(null)
  const [showLabel, setShowLabel] = useState(false)

  const bestand = useTable('bestand', {
    build: (q) => q.eq('artikel_id', id),
    realtimeTable: 'bestand',
    deps: [id],
  })
  const lagerorte = useTable('lagerort')
  const projekte = useTable('projekt')
  const bewegungen = useTable('bewegung', {
    build: (q) => q.eq('artikel_id', id).order('zeitstempel', { ascending: false }).limit(20),
    deps: [id],
  })

  useEffect(() => {
    supabase
      .from('artikel_uebersicht')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setArtikel(data)
      })
  }, [id, bestand.data])

  const lagerName = (lid) => lagerorte.data.find((l) => l.id === lid)?.name ?? '—'
  const projektName = (pid) => projekte.data.find((p) => p.id === pid)?.name ?? '—'

  async function loeschen() {
    if (!confirm(`Artikel "${artikel.name}" wirklich löschen?`)) return
    const { error } = await supabase.from('artikel').delete().eq('id', id)
    if (error) setError(error.message)
    else navigate('/artikel')
  }

  if (error) return <div className="error">{error}</div>
  if (!artikel) return <div className="empty">Lädt …</div>

  const freieBestaende = bestand.data.filter((b) => !b.projekt_id)
  const projektBestaende = bestand.data.filter((b) => b.projekt_id)

  return (
    <div>
      <Link to="/artikel" className="muted">
        ← Artikel
      </Link>

      <div className="card" style={{ marginTop: '0.6rem' }}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>{artikel.name}</h2>
          <span className={`badge ${artikel.typ}`}>
            {artikel.typ === 'exakt' ? 'exakt' : 'geschätzt'}
          </span>
        </div>
        <div className="meta" style={{ marginTop: '0.4rem' }}>
          {artikel.kategorie || 'ohne Kategorie'} · Einheit: {artikel.einheit}
          {artikel.sku && ` · SKU: ${artikel.sku}`}
        </div>
        {artikel.unter_mindestbestand && (
          <div className="badge warn" style={{ marginTop: '0.6rem' }}>
            ⚠️ unter Mindestbestand ({artikel.mindestbestand})
          </div>
        )}

        <div className="row" style={{ marginTop: '0.9rem' }}>
          <Link to={`/buchen?artikel=${id}`} className="grow">
            <button className="primary" style={{ width: '100%' }}>
              ↔️ Buchen
            </button>
          </Link>
          {artikel.barcode && (
            <button onClick={() => setShowLabel(true)}>🏷️ Etikett</button>
          )}
        </div>
      </div>

      <div className="section-title">
        <h2>Bestand</h2>
        <div className="row">
          <span className="badge">frei: {artikel.bestand_frei}</span>
          {artikel.bestand_projekt > 0 && (
            <span className="badge">im Einsatz: {artikel.bestand_projekt}</span>
          )}
        </div>
      </div>
      {bestand.data.length === 0 ? (
        <div className="empty">Kein Bestand erfasst.</div>
      ) : (
        <>
          {freieBestaende.map((b) => (
            <div key={b.id} className="list-item">
              <div>📍 {lagerName(b.lagerort_id)}</div>
              <span className="badge">
                {b.menge} {artikel.einheit}
              </span>
            </div>
          ))}
          {projektBestaende.map((b) => (
            <div key={b.id} className="list-item">
              <div>
                🏗️ {projektName(b.projekt_id)}
                <div className="meta">von {lagerName(b.lagerort_id)}</div>
              </div>
              <span className="badge aktiv">
                {b.menge} {artikel.einheit}
              </span>
            </div>
          ))}
        </>
      )}

      <div className="section-title">
        <h2>Bewegungen</h2>
      </div>
      {bewegungen.data.length === 0 ? (
        <div className="empty">Keine Bewegungen.</div>
      ) : (
        bewegungen.data.map((b) => (
          <div key={b.id} className="list-item">
            <div>
              <div>{b.typ}</div>
              <div className="meta">
                {new Date(b.zeitstempel).toLocaleString('de-CH')}
                {b.projekt_id && ` · ${projektName(b.projekt_id)}`}
              </div>
            </div>
            <span className="badge">{b.menge}</span>
          </div>
        ))
      )}

      <div className="section-title">
        <h2>Verwaltung</h2>
      </div>
      {isAdmin ? (
        <button className="danger" onClick={loeschen}>
          Artikel löschen
        </button>
      ) : (
        <p className="muted">Löschen ist nur Admins vorbehalten.</p>
      )}

      {showLabel && (
        <Modal title="Etikett" onClose={() => setShowLabel(false)}>
          <BarcodeLabel value={artikel.barcode} text={artikel.name} />
          <button
            className="primary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => printBarcode(artikel.barcode, artikel.name)}
          >
            🖨️ Drucken
          </button>
        </Modal>
      )}
    </div>
  )
}
