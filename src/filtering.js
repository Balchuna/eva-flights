export const HOUR_BANDS = [
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
      const rank = { live: 0, fresh: 1, cache: 2, unknown: 3, stale: 4 }
      return (rank[a.confidence] ?? 4) - (rank[b.confidence] ?? 4) || a.price - b.price
    },
  },
}

export const EMPTY_FILTERS = { stops: 'all', airlines: [], band: 'all', sort: 'price' }

// Fontes de cache podem dar só a data: sem hora a oferta não é de nenhuma faixa
function departureHour(departureAt) {
  const match = /^\d{4}-\d{2}-\d{2}[T ](\d{2})/.exec(departureAt || '')
  return match ? Number(match[1]) : null
}

export function applyFilters(offers, f) {
  let out = offers.filter((o) => {
    if (f.stops === '0' && o.transfers !== 0) return false
    if (f.stops === '1' && o.transfers !== 1) return false
    if (f.stops === '2+' && (o.transfers ?? 0) < 2) return false
    if (f.airlines.length && !f.airlines.includes(o.airline)) return false
    if (f.band !== 'all') {
      const band = HOUR_BANDS.find((b) => b.id === f.band)
      const h = departureHour(o.departureAt)
      if (h == null) return false
      const hh = h < 5 && band.id === 'night' ? h + 24 : h
      if (hh < band.from || hh >= band.to) return false
    }
    return true
  })
  return out.sort(SORTS[f.sort]?.fn || SORTS.price.fn)
}
