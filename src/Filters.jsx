import { HOUR_BANDS, SORTS } from './filtering.js'

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
