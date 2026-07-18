/**
 * Kombinierte Filterleiste: Lagerort + Projekt + Kategorie gleichzeitig,
 * gleichwertig wichtig (siehe Bauplan). Plus Freitextsuche.
 */
export default function FilterBar({
  search,
  onSearch,
  lagerorte = [],
  projekte = [],
  kategorien = [],
  filter,
  onFilter,
  onScan,
}) {
  const set = (key, val) => onFilter({ ...filter, [key]: val })

  return (
    <div className="card" style={{ padding: '0.8rem' }}>
      <div className="row" style={{ marginBottom: '0.6rem' }}>
        <input
          className="grow"
          placeholder="Suche: Name, SKU, Barcode …"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {onScan && (
          <button onClick={onScan} title="Barcode scannen">
            📷
          </button>
        )}
      </div>
      <div className="grid-2" style={{ gap: '0.5rem' }}>
        <select value={filter.lagerort ?? ''} onChange={(e) => set('lagerort', e.target.value)}>
          <option value="">Alle Lagerorte</option>
          {lagerorte.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select value={filter.projekt ?? ''} onChange={(e) => set('projekt', e.target.value)}>
          <option value="">Alle Projekte</option>
          <option value="__frei">Nur freies Lager</option>
          {projekte.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filter.kategorie ?? ''}
          onChange={(e) => set('kategorie', e.target.value)}
          style={{ gridColumn: '1 / -1' }}
        >
          <option value="">Alle Kategorien</option>
          {kategorien.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
