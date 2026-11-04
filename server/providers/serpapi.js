import { canonicalAirline } from '../../shared/airlines.js'
import { trackCall } from '../usage.js'

export const enabled = () => Boolean(process.env.SERPAPI_KEY)

// A API devolve horário como "AAAA-MM-DD HH:MM", com espaço; o resto do app usa T
function isoOf(time) {
  return time ? time.replace(' ', 'T') : null
}

export function normalizeVerification(body, { origin, destination, returnDate }, now = new Date()) {
  const flights = [...(body.best_flights || []), ...(body.other_flights || [])]
  const offers = flights.slice(0, 8).map((f) => ({
    source: 'google',
    live: true,
    foundAt: now.toISOString(),
    origin,
    destination,
    price: f.price,
    airline: canonicalAirline(f.flights?.[0]?.airline),
    gate: null,
    flightNumber: f.flights?.[0]?.flight_number?.split(' ').pop() || null,
    departureAt: isoOf(f.flights?.[0]?.departure_airport?.time),
    returnAt: returnDate || null,
    transfers: (f.flights?.length || 1) - 1,
    returnTransfers: null,
    durationMinutes: f.total_duration || null,
    buyUrl: null,
  }))
  return {
    offers,
    cheapest: offers.length ? Math.min(...offers.map((o) => o.price)) : null,
    priceInsights: body.price_insights
      ? {
          lowestPrice: body.price_insights.lowest_price,
          priceLevel: body.price_insights.price_level,
          typicalRange: body.price_insights.typical_price_range,
        }
      : null,
    googleUrl: body.search_metadata?.google_flights_url || null,
  }
}

// Preço real do Google Flights via SerpAPI (quota ~100 buscas/mês — usar só sob demanda)
export async function verifyPrice({ origin, destination, departureDate, returnDate }) {
  if (!enabled()) {
    const err = new Error('SERPAPI_KEY não configurada no .env (serpapi.com, plano free).')
    err.status = 400
    throw err
  }
  const url = new URL('https://serpapi.com/search')
  url.searchParams.set('engine', 'google_flights')
  url.searchParams.set('departure_id', origin)
  url.searchParams.set('arrival_id', destination)
  url.searchParams.set('outbound_date', departureDate)
  if (returnDate) {
    url.searchParams.set('return_date', returnDate)
    url.searchParams.set('type', '1')
  } else {
    url.searchParams.set('type', '2')
  }
  url.searchParams.set('currency', 'BRL')
  url.searchParams.set('hl', 'pt-br')
  url.searchParams.set('api_key', process.env.SERPAPI_KEY)

  trackCall('serpapi')
  const res = await fetch(url)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    const err = new Error(`SerpAPI: ${body.error || res.statusText}`)
    err.status = 502
    throw err
  }
  return normalizeVerification(body, { origin, destination, returnDate })
}
