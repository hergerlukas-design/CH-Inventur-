import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTable } from '../hooks/useData'

export default function InventurDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inventur, setInventur] = useState(null)
  const [positionen, setPositionen] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const artikel = useTable('artikel')
  const lagerorte = useTable('lagerort')

  async function laden() {
    const { data: inv } = await supabase.from('inventur').select('*').eq('id', id).single()
    setInventur(inv)
    const { data: pos } = await supabase
      .from('inventurposition')
      .select('*')
      .eq('inventur_id', id)
    setPositionen(pos ?? [])
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const artikelInfo = (aid) => artikel.data.find((a) => a.id === aid)
  const lagerName = (lid) => lagerorte.data.find((l) => l.id === lid)?.name ?? '—'

  const offen = inventur?.status === 'offen'

  async function setIst(pos, wert) {
    setPositionen((prev) =>
      prev.map((p) => (p.id === pos.id ? { ...p, ist: wert === '' ? null : Number(wert) } : p))
    )
    await supabase
      .from('inventurposition')
      .update({ ist: wert === '' ? null : Number(wert) })
      .eq('id', pos.id)
  }

  async function abschliessen() {
    if (!confirm('Inventur abschliessen? Differenzen werden als Korrektur gebucht.')) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('schliesse_inventur', { p_inventur_id: id })
    setBusy(false)
    if (error) setError(error.message)
    else laden()
  }

  const sortiert = useMemo(
    () =>
      positionen
        .slice()
        .sort((a, b) => (artikelInfo(a.artikel_id)?.name ?? '').localeCompare(artikelInfo(b.artikel_id)?.name ?? '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionen, artikel.data]
  )

  if (!inventur) return <div className="empty">Lädt …</div>

  const erfasst = positionen.filter((p) => p.ist !== null && p.ist !== undefined).length

  return (
    <div>
      <Link to="/inventur" className="muted">
        ← Inventuren
      </Link>
      <div className="section-title">
        <h2>Inventur {new Date(inventur.datum).toLocaleDateString('de-CH')}</h2>
        <span className={`badge ${offen ? 'warn' : 'aktiv'}`}>{inventur.status}</span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: '0.7rem' }}>
        <div className="row spread">
          <span className="muted">
            {erfasst} / {positionen.length} Positionen erfasst
          </span>
        </div>
      </div>

      {sortiert.length === 0 ? (
        <div className="empty">Keine Positionen (kein Bestand vorhanden).</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Artikel</th>
                <th>Lagerort</th>
                <th>Soll</th>
                <th>Ist</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {sortiert.map((p) => {
                const info = artikelInfo(p.artikel_id)
                const diff = p.ist == null ? null : p.ist - p.soll
                const tolAbs =
                  info?.typ === 'bulk' && info?.bulk_toleranz
                    ? (Number(info.bulk_toleranz) / 100) * p.soll
                    : 0
                const imRahmen = diff == null || Math.abs(diff) <= tolAbs
                return (
                  <tr key={p.id}>
                    <td>
                      {info?.name ?? '—'}{' '}
                      {info?.typ === 'bulk' && <span className="badge bulk">~</span>}
                    </td>
                    <td>{lagerName(p.lagerort_id)}</td>
                    <td>{p.soll}</td>
                    <td style={{ minWidth: 80 }}>
                      {offen ? (
                        <input
                          type="number"
                          inputMode="decimal"
                          value={p.ist ?? ''}
                          onChange={(e) => setIst(p, e.target.value)}
                          style={{ padding: '0.3rem' }}
                        />
                      ) : (
                        (p.ist ?? '—')
                      )}
                    </td>
                    <td style={{ color: diff == null ? undefined : imRahmen ? 'var(--success)' : 'var(--warn)' }}>
                      {diff == null ? '—' : (diff > 0 ? '+' : '') + diff}
                      {diff != null && !imRahmen && tolAbs > 0 && ' ⚠️'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {offen && (
        <button
          className="primary"
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={busy}
          onClick={abschliessen}
        >
          {busy ? '…' : 'Inventur abschliessen'}
        </button>
      )}
    </div>
  )
}
