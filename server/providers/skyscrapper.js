import 'dotenv/config'
import { trackCall } from '../usage.js'

const HOST = 'sky-scrapper.p.rapidapi.com'

export const enabled = () => Boolean(process.env.RAPIDAPI_KEY)

async function rapidGet(path, params) {
  const url = new URL(`https://${HOST}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  }
  trackCall('skyscrapper')
  const res = await fetch(url, {
    headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': HOST },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.status === false) {
    const err = new Error(`Sky-Scrapper ${res.status}: ${body.message || res.statusText}`)
    err.status = res.status === 429 ? 429 : 502
    throw err
  }
  return body
}

// IATA → entityId/skyId exigidos pelo searchFlights (cacheado no chamador)
async function resolveAirport(iata) {
  const body = await rapidGet('/api/v1/flights/searchAirport', { query: iata, locale: 'pt-BR' })
  const hit = (body.data || []).find(
    (p) => p.skyId === iata || p.navigation?.relevantFlightParams?.skyId === iata
  ) || (body.data || [])[0]
  if (!hit) return null
  const params = hit.navigation?.relevantFlightParams || hit
  return { skyId: params.skyId, entityId: params.entityId }
}

export async function searchFlights({ origin, destination, departureDate, returnDate }) {
  const [from, to] = await Promise.all([resolveAirport(origin), resolveAirport(destination)])
  if (!from || !to) return []
  const body = await rapidGet('/api/v2/flights/searchFlights', {
    originSkyId: from.skyId,
    originEntityId: from.entityId,
    destinationSkyId: to.skyId,
    destinationEntityId: to.entityId,
    date: departureDate,
    returnDate,
    currency: 'BRL',
    market: 'pt-BR',
    countryCode: 'BR',
    adults: 1,
    sortBy: 'price_high',
  })
  const itineraries = body.data?.itineraries || []
  return itineraries.slice(0, 15).map((it) => {
    const leg = it.legs?.[0]
    return {
      source: 'skyscrapper',
      confidence: 'live',
      ageHours: 0,
      origin,
      destination,
      price: it.price?.raw ?? null,
      airline: leg?.carriers?.marketing?.[0]?.name || null,
      flightNumber: null,
      departureAt: leg?.departure || null,
      returnAt: it.legs?.[1]?.departure || null,
      transfers: leg?.stopCount ?? null,
      returnTransfers: it.legs?.[1]?.stopCount ?? null,
      durationMinutes: leg?.durationInMinutes ?? null,
      buyUrl: null,
      foundAt: null,
    }
  }).filter((o) => o.price != null)
}
