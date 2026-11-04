// Preço vivo do Google Flights via fast-flights-ts (scraper não-oficial, sem key).
// Best-effort: pode quebrar quando o Google mudar o protocolo — nunca fonte única.
import { getFlights, createQuery, Passengers } from 'fast-flights-ts'
import { canonicalAirline } from '../../shared/airlines.js'

// Desligado por padrão: quem clona o projeto não chama o Google sem decidir isso
export const enabled = () => process.env.FASTFLIGHTS_DISABLED === 'false'

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

export function normalizeFlights(results, { origin, destination, returnDate }, now = new Date()) {
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
        foundAt: now.toISOString(),
        origin,
        destination,
        price: it.price,
        airline: canonicalAirline(it.airlines?.[0] || it.type),
        flightNumber: null,
        departureAt: isoOf(first?.departure),
        returnAt: returnDate || null,
        transfers: Math.max(0, legs.length - 1),
        returnTransfers: null,
        durationMinutes: legs.reduce((s, l) => s + (l.duration || 0), 0) || null,
        buyUrl: null,
      }
    })
}

export async function searchFlights(
  { origin, destination, departureDate, returnDate },
  { search = getFlights, timeoutMs = TIMEOUT_MS } = {}
) {
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
  let timer
  const results = await Promise.race([
    search(q),
    new Promise((_, rej) => {
      timer = setTimeout(() => rej(new Error('timeout')), timeoutMs)
    }),
  ]).finally(() => clearTimeout(timer))
  return normalizeFlights(results, { origin, destination, returnDate })
}
