import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTable, useStammdaten } from '../hooks/useData'
import Modal from '../components/Modal'
import BarcodeScanner from '../components/BarcodeScanner'

const TYPEN = [
  { value: 'Wareneingang', label: 'Wareneingang (+)', braucht: [] },
  { value: 'Verbrauch', label: 'Verbrauch (−)', braucht: [] },
  { value: 'Projektausgabe', label: 'Projektausgabe', braucht: ['projekt'] },
  { value: 'Projektrueckgabe', label: 'Projektrückgabe', braucht: ['projekt'] },
  { value: 'Umlagerung', label: 'Umlagerung', braucht: ['ziel'] },
]

export default function Buchen() {
  const [params] = useSearchParams()
  const artikel = useTable('artikel_uebersicht', { build: (q) => q.order('name'), realtimeTable: 'artikel' })
  const { lagerorte, projekte } = useStammdaten()

  const [artikelId, setArtikelId] = useState(params.get('artikel') ?? '')
  const [typ, setTyp] = useState('Wareneingang')
  const [menge, setMenge] = useState('')
  const [lagerort, setLagerort] = useState('')
  const [zielLagerort, setZielLagerort] = useState('')
  const [projekt, setProjekt] = useState('')
  const [notiz, setNotiz] = useState('')
  const [scanning, setScanning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  // Default-Lagerort setzen sobald geladen
  useEffect(() => {
    if (!lagerort && lagerorte.length) setLagerort(lagerorte[0].id)
  }, [lagerorte, lagerort])

  const gewaehlterArtikel = artikel.data.find((a) => a.id === artikelId)
  const typDef = TYPEN.find((t) => t.value === typ)
  const brauchtProjekt = typDef?.braucht.includes('projekt')
  const brauchtZiel = typDef?.braucht.includes('ziel')

  const artikelOptionen = useMemo(
    () => artikel.data.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [artikel.data]
  )

  function handleScan(code) {
    setScanning(false)
    const match = artikel.data.find((a) => a.barcode === code || a.sku === code)
    if (match) {
      setArtikelId(match.id)
      setError(null)
    } else {
      setError(`Kein Artikel zu Code "${code}" gefunden.`)
    }
  }

  async function buchen() {
    setError(null)
    setOk(null)
    if (!artikelId) return setError('Bitte Artikel wählen.')
    if (!lagerort) return setError('Bitte Lagerort wählen.')
    if (!menge || Number(menge) <= 0) return setError('Menge muss > 0 sein.')
    if (brauchtProjekt && !projekt) return setError('Bitte Projekt wählen.')
    if (brauchtZiel && !zielLagerort) return setError('Bitte Ziel-Lagerort wählen.')

    setBusy(true)
    const { error } = await supabase.rpc('buche_bewegung', {
      p_artikel_id: artikelId,
      p_lagerort_id: lagerort,
      p_typ: typ,
      p_menge: Number(menge),
      p_projekt_id: brauchtProjekt ? projekt : null,
      p_ziel_lagerort_id: brauchtZiel ? zielLagerort : null,
      p_notiz: notiz.trim() || null,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setOk(`Gebucht: ${typ} · ${menge} ${gewaehlterArtikel?.einheit ?? ''}`)
      setMenge('')
      setNotiz('')
      artikel.reload()
    }
  }

  return (
    <div>
      <div className="section-title">
        <h2>Bewegung buchen</h2>
      </div>

      {error && <div className="error">{error}</div>}
      {ok && (
        <div className="error" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
          ✓ {ok}
        </div>
      )}

      <div className="card">
        <div className="field">
          <label>Artikel *</label>
          <div className="row">
            <select className="grow" value={artikelId} onChange={(e) => setArtikelId(e.target.value)}>
              <option value="">— wählen —</option>
              {artikelOptionen.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.bestand_frei} {a.einheit})
                </option>
              ))}
            </select>
            <button onClick={() => setScanning(true)} title="Scannen">
              📷
            </button>
          </div>
        </div>

        <div className="field">
          <label>Bewegungsart *</label>
          <select value={typ} onChange={(e) => setTyp(e.target.value)}>
            {TYPEN.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Menge *</label>
            <input
              type="number"
              inputMode="decimal"
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              placeholder={gewaehlterArtikel?.typ === 'bulk' ? 'geschätzt' : ''}
            />
          </div>
          <div className="field">
            <label>{brauchtZiel ? 'Von Lagerort *' : 'Lagerort *'}</label>
            <select value={lagerort} onChange={(e) => setLagerort(e.target.value)}>
              {lagerorte.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {brauchtZiel && (
          <div className="field">
            <label>Ziel-Lagerort *</label>
            <select value={zielLagerort} onChange={(e) => setZielLagerort(e.target.value)}>
              <option value="">— wählen —</option>
              {lagerorte
                .filter((l) => l.id !== lagerort)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {brauchtProjekt && (
          <div className="field">
            <label>Projekt *</label>
            <select value={projekt} onChange={(e) => setProjekt(e.target.value)}>
              <option value="">— wählen —</option>
              {projekte
                .filter((p) => p.status === 'aktiv')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Notiz (optional)</label>
          <input value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        </div>

        <button className="primary" style={{ width: '100%' }} disabled={busy} onClick={buchen}>
          {busy ? '…' : 'Buchen'}
        </button>
      </div>

      {scanning && (
        <Modal title="Barcode scannen" onClose={() => setScanning(false)}>
          <BarcodeScanner onDetect={handleScan} onClose={() => setScanning(false)} />
        </Modal>
      )}
    </div>
  )
}
