import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTable, useStammdaten } from '../hooks/useData'
import FilterBar from '../components/FilterBar'
import Modal from '../components/Modal'
import BarcodeScanner from '../components/BarcodeScanner'

const leererArtikel = {
  name: '',
  sku: '',
  barcode: '',
  kategorie: '',
  einheit: 'Stk',
  typ: 'exakt',
  mindestbestand: '',
  bulk_toleranz: '',
}

export default function Artikel() {
  const artikel = useTable('artikel_uebersicht', {
    build: (q) => q.order('name'),
    realtimeTable: 'artikel',
  })
  const { lagerorte, projekte, kategorien } = useStammdaten()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ lagerort: '', projekt: '', kategorie: '' })
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState(null) // null | leererArtikel | bestehender

  const gefiltert = useMemo(() => {
    const s = search.trim().toLowerCase()
    return artikel.data.filter((a) => {
      if (filter.kategorie && a.kategorie !== filter.kategorie) return false
      if (!s) return true
      return (
        a.name?.toLowerCase().includes(s) ||
        a.sku?.toLowerCase().includes(s) ||
        a.barcode?.toLowerCase().includes(s)
      )
    })
  }, [artikel.data, search, filter])

  return (
    <div>
      <div className="section-title">
        <h2>Artikel</h2>
        <button className="primary" onClick={() => setForm({ ...leererArtikel })}>
          + Neu
        </button>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        lagerorte={lagerorte}
        projekte={projekte}
        kategorien={kategorien}
        filter={filter}
        onFilter={setFilter}
        onScan={() => setScanning(true)}
      />

      {artikel.loading ? (
        <div className="empty">Lädt …</div>
      ) : gefiltert.length === 0 ? (
        <div className="empty">Keine Artikel gefunden.</div>
      ) : (
        gefiltert.map((a) => (
          <Link key={a.id} to={`/artikel/${a.id}`} className="list-item" style={{ color: 'inherit' }}>
            <div>
              <div>
                {a.name}{' '}
                {a.unter_mindestbestand && <span className="badge warn">niedrig</span>}
              </div>
              <div className="meta">
                {a.kategorie || 'ohne Kategorie'} · {a.sku || 'keine SKU'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>
                {a.bestand_frei} {a.einheit}
              </div>
              <span className={`badge ${a.typ}`}>{a.typ === 'exakt' ? 'exakt' : 'geschätzt'}</span>
            </div>
          </Link>
        ))
      )}

      {scanning && (
        <Modal title="Barcode scannen" onClose={() => setScanning(false)}>
          <BarcodeScanner
            onDetect={(code) => {
              setSearch(code)
              setScanning(false)
            }}
            onClose={() => setScanning(false)}
          />
        </Modal>
      )}

      {form && (
        <ArtikelForm
          initial={form}
          kategorien={kategorien}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            artikel.reload()
          }}
        />
      )}
    </div>
  )
}

function ArtikelForm({ initial, kategorien, onClose, onSaved }) {
  const [f, setF] = useState(initial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const isEdit = Boolean(initial.id)

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }))

  function generateBarcode() {
    // Eigener Code: Präfix + Zeitstempel-Basis36 (kompakt, druckbar)
    set('barcode', 'CHI' + Date.now().toString(36).toUpperCase())
  }

  async function save() {
    setBusy(true)
    setError(null)
    const payload = {
      name: f.name.trim(),
      sku: f.sku?.trim() || null,
      barcode: f.barcode?.trim() || null,
      kategorie: f.kategorie?.trim() || null,
      einheit: f.einheit?.trim() || 'Stk',
      typ: f.typ,
      mindestbestand: f.typ === 'exakt' && f.mindestbestand !== '' ? Number(f.mindestbestand) : null,
      bulk_toleranz: f.typ === 'bulk' && f.bulk_toleranz !== '' ? Number(f.bulk_toleranz) : null,
    }
    const res = isEdit
      ? await supabase.from('artikel').update(payload).eq('id', initial.id)
      : await supabase.from('artikel').insert(payload)
    setBusy(false)
    if (res.error) setError(res.error.message)
    else onSaved()
  }

  return (
    <Modal title={isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel'} onClose={onClose}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Name *</label>
        <input value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus />
      </div>
      <div className="grid-2">
        <div className="field">
          <label>SKU</label>
          <input value={f.sku} onChange={(e) => set('sku', e.target.value)} />
        </div>
        <div className="field">
          <label>Einheit</label>
          <input value={f.einheit} onChange={(e) => set('einheit', e.target.value)} placeholder="Stk, l, Pkg …" />
        </div>
      </div>
      <div className="field">
        <label>Barcode</label>
        <div className="row">
          <input className="grow" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
          <button onClick={() => setScanning(true)} title="Scannen">📷</button>
          <button onClick={generateBarcode} title="Eigenen Code erzeugen">✨</button>
        </div>
      </div>
      <div className="field">
        <label>Kategorie</label>
        <input
          list="kategorien"
          value={f.kategorie}
          onChange={(e) => set('kategorie', e.target.value)}
        />
        <datalist id="kategorien">
          {kategorien.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label>Typ</label>
        <select value={f.typ} onChange={(e) => set('typ', e.target.value)}>
          <option value="exakt">Exakt (stückgenau, z.B. Kanister)</option>
          <option value="bulk">Bulk / geschätzt (z.B. Putztücher)</option>
        </select>
      </div>
      {f.typ === 'exakt' ? (
        <div className="field">
          <label>Mindestbestand (löst Warnung aus)</label>
          <input
            type="number"
            value={f.mindestbestand}
            onChange={(e) => set('mindestbestand', e.target.value)}
          />
        </div>
      ) : (
        <div className="field">
          <label>Inventur-Toleranz in % (Bulk)</label>
          <input
            type="number"
            value={f.bulk_toleranz}
            onChange={(e) => set('bulk_toleranz', e.target.value)}
            placeholder="z.B. 10"
          />
        </div>
      )}

      <button className="primary" style={{ width: '100%' }} disabled={busy || !f.name.trim()} onClick={save}>
        {busy ? '…' : 'Speichern'}
      </button>

      {scanning && (
        <Modal title="Barcode scannen" onClose={() => setScanning(false)}>
          <BarcodeScanner
            onDetect={(code) => {
              set('barcode', code)
              setScanning(false)
            }}
            onClose={() => setScanning(false)}
          />
        </Modal>
      )}
    </Modal>
  )
}
