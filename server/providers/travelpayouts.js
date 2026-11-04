import { canonicalAirline } from '../../shared/airlines.js'
import { trackCall } from '../usage.js'

const BASE = 'https://api.travelpayouts.com'

export const enabled = () => Boolean(process.env.TRAVELPAYOUTS_TOKEN)

function getToken() {
  const token = process.env.TRAVELPAYOUTS_TOKEN
  if (!token) {
    const err = new Error(
      'Token Travelpayouts ausente. Copie .env.example para .env e preencha TRAVELPAYOUTS_TOKEN (travelpayouts.com → perfil → API token).'
    )
    err.status = 500
    throw err
  }
  return token
}

async function tpGet(path, params, { auth = true } = {}) {
  const url = new URL(path.startsWith('http') ? path : BASE + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v)
  }
  trackCall('travelpayouts')
  const headers = auth ? { 'X-Access-Token': getToken() } : {}
  const res = await fetch(url, { headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.success === false) {
    const err = new Error(`Travelpayouts ${res.status}: ${body.error || res.statusText}`)
    err.status = res.status === 429 ? 429 : 502
    throw err
  }
  return body
}

// Autocomplete público (sem token)
export async function searchLocations(keyword) {
  const url = new URL('https://autocomplete.travelpayouts.com/places2')
  url.searchParams.set('term', keyword)
  url.searchParams.set('locale', 'pt')
  url.searchParams.append('types[]', 'airport')
  url.searchParams.append('types[]', 'city')
  const res = await fetch(url)
  if (!res.ok) {
    const err = new Error(`Autocomplete falhou (${res.status})`)
    err.status = 502
    throw err
  }
  return normalizePlaces(await res.json())
}

export function normalizePlaces(places) {
  return places.slice(0, 8).map((p) => ({
    code: p.code,
    name: p.name,
    cityName: p.city_name || null,
    countryName: p.country_name || null,
    type: p.type,
  }))
}

function buildBuyUrl(link) {
  if (!link) return null
  const marker = process.env.TRAVELPAYOUTS_MARKER
  const url = `https://www.aviasales.com${link}`
  return marker ? `${url}${link.includes('?') ? '&' : '?'}marker=${marker}` : url
}

export function normalizeOffer(t) {
  return {
    source: 'travelpayouts',
    live: false,
    foundAt: t.found_at || null,
    origin: t.origin,
    destination: t.destination,
    price: Number(t.price),
    airline: canonicalAirline(t.airline),
    gate: t.gate || null,
    flightNumber: t.flight_number,
    departureAt: t.departure_at,
    returnAt: t.return_at || null,
    transfers: t.transfers ?? 0,
    returnTransfers: t.return_transfers ?? null,
    durationMinutes: t.duration ?? null,
    buyUrl: buildBuyUrl(t.link),
  }
}

// Preços mais baratos por data (cache Aviasales). departureDate: YYYY-MM-DD ou YYYY-MM.
export async function searchFlights({ origin, destination, departureDate, returnDate, limit }) {
  const query = (departAt) =>
    tpGet('/aviasales/v3/prices_for_dates', {
      origin,
      destination,
      departure_at: departAt,
      return_at: returnDate,
      one_way: returnDate ? 'false' : 'true',
      currency: 'brl',
      sorting: 'price',
      unique: 'false',
      limit: limit || 100,
    })
  let body = await query(departureDate)
  // Dia exato sem cache → tenta o mês e filtra o dia (o cache mensal costuma ter mais dados)
  if (!(body.data || []).length && /^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    body = await query(departureDate.slice(0, 7))
    body.data = (body.data || []).filter((t) => (t.departure_at || '').startsWith(departureDate))
  }
  return (body.data || []).map(normalizeOffer)
}

// Preços vistos por usuários nas últimas 48h (/v2/prices/latest) — mais combinações que o v3
export async function latestPrices({ origin, destination, departureDate, returnDate }) {
  const body = await tpGet('/v2/prices/latest', {
    origin,
    destination,
    beginning_of_period: departureDate,
    period_type: 'day',
    one_way: returnDate ? 'false' : 'true',
    currency: 'brl',
    sorting: 'price',
    limit: 100,
    show_to_affiliates: 'false',
  })
  return normalizeLatest(body.data || [], { departureDate, returnDate })
}

export function normalizeLatest(rows, { departureDate, returnDate }) {
  return rows
    .filter((t) => (t.depart_date || '').startsWith(departureDate))
    .filter((t) => !returnDate || (t.return_date || '').startsWith(returnDate))
    .map((t) =>
      normalizeOffer({
        found_at: t.found_at,
        origin: t.origin,
        destination: t.destination,
        price: t.value,
        airline: null,
        gate: t.gate,
        flight_number: null,
        departure_at: t.depart_date,
        return_at: t.return_date || null,
        transfers: t.number_of_changes ?? 0,
        duration: t.duration || null,
        link: null,
      })
    )
}

// Datas vizinhas (±days) via month-matrix, para quando a busca exata vem vazia
export async function nearbyDates({ origin, destination, departureDate, days = 3 }) {
  const month = departureDate.slice(0, 7)
  const matrix = await monthMatrix({ origin, destination, month })
  return pickNearby(matrix, departureDate, days)
}

export function pickNearby(matrix, departureDate, days = 3) {
  const target = new Date(departureDate + 'T00:00:00')
  return matrix
    .filter((d) => {
      const diff = Math.abs(new Date(d.departureDate + 'T00:00:00') - target) / 86400_000
      return diff > 0 && diff <= days
    })
    .sort((a, b) => a.price - b.price)
}

// Grade do mês inteiro em 1 chamada
export async function monthMatrix({ origin, destination, month }) {
  const body = await tpGet('/v2/prices/month-matrix', {
    origin,
    destination,
    month: `${month}-01`,
    currency: 'brl',
    show_to_affiliates: 'false',
  })
  return normalizeMonthMatrix(body.data || [])
}

export function normalizeMonthMatrix(rows) {
  return rows
    .map((d) => ({
      departureDate: d.depart_date,
      returnDate: d.return_date || null,
      price: Number(d.value),
      transfers: d.number_of_changes ?? null,
    }))
    .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
}
