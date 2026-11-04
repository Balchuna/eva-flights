const HOUR_BANDS = [
  { id: 'morning', label: 'Manhã (5–12h)', from: 5, to: 12 },
  { id: 'afternoon', label: 'Tarde (12–18h)', from: 12, to: 18 },
  { id: 'night', label: 'Noite (18–5h)', from: 18, to: 29 },
]

export const SORTS = {
  price: { label: 'Preço', fn: (a, b) => a.price - b.price },
  duration: {
    label: 'Duração',
    fn: (a, b) => (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity),
  },
  departure: {
    label: 'Partida',
    fn: (a, b) => (a.departureAt || '').localeCompare(b.departureAt || ''),
  },
  confidence: {
    label: 'Confiança',
    fn: (a, b) => {
      const rank = { live: 0, fresh: 1, cache: 2, stale: 3 }
      return (rank[a.confidence] ?? 3) - (rank[b.confidence] ?? 3) || a.price - b.price
    },
  },
}

export const EMPTY_FILTERS = { stops: 'all', airlines: [], band: 'all', sort: 'price' }

export function applyFilters(offers, f) {
  let out = offers.filter((o) => {
    if (f.stops === '0' && o.transfers !== 0) return false
    if (f.stops === '1' && o.transfers !== 1) return false
    if (f.stops === '2+' && (o.transfers ?? 0) < 2) return false
    if (f.airlines.length && !f.airlines.includes(o.airline)) return false
    if (f.band !== 'all') {
      const band = HOUR_BANDS.find((b) => b.id === f.band)
      const h = o.departureAt ? Number(o.departureAt.slice(11, 13)) : null
      if (h == null) return false
      const hh = h < 5 && band.id === 'night' ? h + 24 : h
      if (hh < band.from || hh >= band.to) return false
    }
    return true
  })
  return out.sort(SORTS[f.sort]?.fn || SORTS.price.fn)
}

export default function Filters({ offers, filters, onChange }) {
  const airlines = [...new Set(offers.map((o) => o.airline).filter(Boolean))].sort()

  function toggleAirline(a) {
    const list = filters.airlines.includes(a)
      ? filters.airlines.filter((x) => x !== a)
      : [...filters.airlines, a]
    onChange({ ...filters, airlines: list })
  }

  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">Escalas</span>
        {[
          ['all', 'Todas'],
          ['0', 'Direto'],
          ['1', '1 escala'],
          ['2+', '2+'],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filters.stops === v ? 'chip on' : 'chip'}
            onClick={() => onChange({ ...filters, stops: v })}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="filter-group">
        <span className="filter-label">Partida</span>
        <button
          className={filters.band === 'all' ? 'chip on' : 'chip'}
          onClick={() => onChange({ ...filters, band: 'all' })}
        >
          Qualquer
        </button>
        {HOUR_BANDS.map((b) => (
          <button
            key={b.id}
            className={filters.band === b.id ? 'chip on' : 'chip'}
            onClick={() => onChange({ ...filters, band: b.id })}
          >
            {b.label}
          </button>
        ))}
      </div>
      {airlines.length > 1 && (
        <div className="filter-group">
          <span className="filter-label">Companhia</span>
          {airlines.map((a) => (
            <button
              key={a}
              className={filters.airlines.includes(a) ? 'chip on' : 'chip'}
              onClick={() => toggleAirline(a)}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <div className="filter-group">
        <span className="filter-label">Ordenar</span>
        {Object.entries(SORTS).map(([id, s]) => (
          <button
            key={id}
            className={filters.sort === id ? 'chip on' : 'chip'}
            onClick={() => onChange({ ...filters, sort: id })}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
