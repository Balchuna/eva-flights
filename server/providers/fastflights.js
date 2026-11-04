// Preço vivo do Google Flights via fast-flights-ts (scraper não-oficial, sem key).
// Best-effort: pode quebrar quando o Google mudar o protocolo — nunca fonte única.
import { getFlights, createQuery, Passengers } from 'fast-flights-ts'

export const enabled = () => process.env.FASTFLIGHTS_DISABLED !== 'true'

const TIMEOUT_MS = 12_000

function pad(n) {
  return String(n).padStart(2, '0')
}

function isoOf(dt) {
  if (!dt?.date) return null
  const [y, m, d] = dt.date
  const [hh, mm] = dt.time || [0, 0]
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}`
}

export async function searchFlights({ origin, destination, departureDate, returnDate }) {
  const flights = [{ date: departureDate, from_airport: origin, to_airport: destination }]
  if (returnDate) flights.push({ date: returnDate, from_airport: destination, to_airport: origin })
  const q = createQuery({
    flights,
    trip: returnDate ? 'round-trip' : 'one-way',
    seat: 'economy',
    passengers: new Passengers({ adults: 1 }),
    currency: 'BRL',
    language: 'pt',
  })
  const results = await Promise.race([
    getFlights(q),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
  ])
  if (!Array.isArray(results)) return []
  return results
    .filter((it) => typeof it.price === 'number' && it.price > 0)
    .slice(0, 30)
    .map((it) => {
      const legs = it.flights || []
      const first = legs[0]
      return {
        source: 'google-live',
        live: true,
        confidence: 'live',
        ageHours: 0,
        foundAt: new Date().toISOString(),
        origin,
        destination,
        price: it.price,
        airline: it.airlines?.[0] || it.type || null,
        flightNumber: null,
        departureAt: isoOf(first?.departure),
        returnAt: null,
        transfers: Math.max(0, legs.length - 1),
        returnTransfers: null,
        durationMinutes: legs.reduce((s, l) => s + (l.duration || 0), 0) || null,
        buyUrl: null,
      }
    })
}
