import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useData'

export default function Dashboard() {
  const artikel = useTable('artikel_uebersicht', { realtimeTable: 'bestand' })
  const projekte = useTable('projekt')
  const bewegungen = useTable('bewegung', {
    build: (q) => q.order('zeitstempel', { ascending: false }).limit(8),
  })

  const unterMin = artikel.data.filter((a) => a.unter_mindestbestand)
  const aktiveProjekte = projekte.data.filter((p) => p.status === 'aktiv')

  return (
    <div>
      <div className="stats">
        <div className="stat">
          <div className="num">{artikel.data.length}</div>
          <div className="lbl">Artikel</div>
        </div>
        <div className="stat">
          <div className="num">{aktiveProjekte.length}</div>
          <div className="lbl">Aktive Projekte</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: unterMin.length ? 'var(--warn)' : undefined }}>
            {unterMin.length}
          </div>
          <div className="lbl">Unter Mindestbestand</div>
        </div>
      </div>

      {unterMin.length > 0 && (
        <>
          <div className="section-title">
            <h2>⚠️ Mindestbestand unterschritten</h2>
          </div>
          {unterMin.map((a) => (
            <Link key={a.id} to={`/artikel/${a.id}`} className="list-item" style={{ color: 'inherit' }}>
              <div>
                <div>{a.name}</div>
                <div className="meta">
                  {a.bestand_frei} {a.einheit} · Min {a.mindestbestand}
                </div>
              </div>
              <span className="badge warn">niedrig</span>
            </Link>
          ))}
        </>
      )}

      <div className="section-title">
        <h2>Letzte Bewegungen</h2>
        <Link to="/historie">Alle →</Link>
      </div>
      {bewegungen.data.length === 0 ? (
        <div className="empty">Noch keine Bewegungen erfasst.</div>
      ) : (
        bewegungen.data.map((b) => <BewegungRow key={b.id} b={b} artikel={artikel.data} />)
      )}

      <div className="section-title">
        <h2>Verwaltung</h2>
      </div>
      <div className="row">
        <Link to="/lagerorte" className="card grow" style={{ textAlign: 'center', color: 'inherit' }}>
          📍 Lagerorte
        </Link>
        <Link to="/historie" className="card grow" style={{ textAlign: 'center', color: 'inherit' }}>
          🕑 Historie
        </Link>
      </div>
    </div>
  )
}

function BewegungRow({ b, artikel }) {
  const name = artikel.find((a) => a.id === b.artikel_id)?.name ?? 'Artikel'
  const date = new Date(b.zeitstempel).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="list-item">
      <div>
        <div>{name}</div>
        <div className="meta">
          {b.typ} · {date}
        </div>
      </div>
      <span className="badge">{b.menge}</span>
    </div>
  )
}
