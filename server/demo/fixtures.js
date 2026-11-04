// Dados inventados do modo demo, no formato cru de cada provedor: passam pelos mesmos
// normalizadores das respostas reais. Nada aqui veio de uma resposta de API. Voos na faixa
// 9000, agências fictícias e preços derivados da rota e da data, para a mesma busca dar
// sempre o mesmo resultado.

const AIRPORTS = [
  ['GRU', 'Guarulhos', 'São Paulo', 'Brasil'],
  ['CGH', 'Congonhas', 'São Paulo', 'Brasil'],
  ['VCP', 'Viracopos', 'Campinas', 'Brasil'],
  ['GIG', 'Galeão', 'Rio de Janeiro', 'Brasil'],
  ['SDU', 'Santos Dumont', 'Rio de Janeiro', 'Brasil'],
  ['BSB', 'Juscelino Kubitschek', 'Brasília', 'Brasil'],
  ['CNF', 'Confins', 'Belo Horizonte', 'Brasil'],
  ['SSA', 'Deputado Luís Eduardo Magalhães', 'Salvador', 'Brasil'],
  ['REC', 'Guararapes', 'Recife', 'Brasil'],
  ['FOR', 'Pinto Martins', 'Fortaleza', 'Brasil'],
  ['NAT', 'São Gonçalo do Amarante', 'Natal', 'Brasil'],
  ['POA', 'Salgado Filho', 'Porto Alegre', 'Brasil'],
  ['CWB', 'Afonso Pena', 'Curitiba', 'Brasil'],
  ['FLN', 'Hercílio Luz', 'Florianópolis', 'Brasil'],
  ['MAO', 'Eduardo Gomes', 'Manaus', 'Brasil'],
  ['BEL', 'Val de Cans', 'Belém', 'Brasil'],
  ['EZE', 'Ezeiza', 'Buenos Aires', 'Argentina'],
  ['SCL', 'Arturo Merino Benítez', 'Santiago', 'Chile'],
  ['LIS', 'Humberto Delgado', 'Lisboa', 'Portugal'],
  ['MAD', 'Barajas', 'Madri', 'Espanha'],
  ['CDG', 'Charles de Gaulle', 'Paris', 'França'],
  ['MIA', 'Miami', 'Miami', 'Estados Unidos'],
  ['JFK', 'John F. Kennedy', 'Nova York', 'Estados Unidos'],
]

const AGENCY_A = 'Agência Fictícia Alfa'
const AGENCY_B = 'Agência Fictícia Beta'

function hash(text) {
  let h = 7
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 1_000_003
  return h
}

function basePrice({ origin, destination, departureDate, returnDate }) {
  const oneWay = 240 + (hash(`${origin}${destination}`) % 500) + (hash(departureDate) % 120)
  return returnDate ? Math.round(oneWay * 1.8) : oneWay
}

function routeMinutes({ origin, destination }) {
  return 60 + (hash(`${origin}${destination}`) % 240)
}

function hoursAgo(now, hours) {
  return new Date(now.getTime() - hours * 3600_000).toISOString()
}

function plain(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// /places2 do autocomplete Travelpayouts
export function placesRows(term) {
  const query = plain(term)
  return AIRPORTS.filter((airport) => plain(airport.join(' ')).includes(query)).map(
    ([code, name, city_name, country_name]) => ({ code, name, city_name, country_name, type: 'airport' })
  )
}

// /aviasales/v3/prices_for_dates. O v3 real não traz found_at; aqui ele existe só para o demo
// mostrar todos os níveis de confiança do card.
export function travelpayoutsV3Rows(search, now = new Date()) {
  const { origin, destination, departureDate, returnDate } = search
  const base = basePrice(search)
  const minutes = routeMinutes(search)
  return [
    { airline: 'G3', flight: 9101, time: '06:15', extra: 0, transfers: 0, ageHours: 2 },
    { airline: 'LA', flight: 9202, time: '09:40', extra: 45, transfers: 0, ageHours: 30 },
    { airline: 'AD', flight: 9303, time: '13:05', extra: 80, transfers: 1, ageHours: 100 },
    { airline: 'G3', flight: 9104, time: '18:30', extra: 120, transfers: 0, ageHours: null },
  ].map((slot) => ({
    origin,
    destination,
    price: base + slot.extra,
    airline: slot.airline,
    flight_number: slot.flight,
    departure_at: `${departureDate}T${slot.time}:00-03:00`,
    return_at: returnDate ? `${returnDate}T18:10:00-03:00` : null,
    transfers: slot.transfers,
    return_transfers: returnDate ? 0 : null,
    duration: minutes + slot.transfers * 90,
    link: null,
    found_at: slot.ageHours == null ? null : hoursAgo(now, slot.ageHours),
  }))
}

// /v2/prices/latest: traz a agência em gate e a data sem horário
export function travelpayoutsLatestRows(search, now = new Date()) {
  const { origin, destination, departureDate, returnDate } = search
  const base = basePrice(search)
  const minutes = routeMinutes(search)
  return [
    { gate: AGENCY_A, extra: -30, changes: 1, ageHours: 5 },
    { gate: AGENCY_B, extra: 15, changes: 0, ageHours: 40 },
  ].map((slot) => ({
    origin,
    destination,
    value: base + slot.extra,
    gate: slot.gate,
    depart_date: departureDate,
    return_date: returnDate || '',
    number_of_changes: slot.changes,
    duration: minutes + slot.changes * 90,
    found_at: hoursAgo(now, slot.ageHours),
  }))
}

// /v2/prices/month-matrix: uma linha por dia do mês
export function monthMatrixRows({ origin, destination, month }, now = new Date()) {
  const [year, monthNumber] = month.split('-').map(Number)
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return Array.from({ length: days }, (_, i) => {
    const departureDate = `${month}-${String(i + 1).padStart(2, '0')}`
    return {
      origin,
      destination,
      depart_date: departureDate,
      return_date: '',
      gate: AGENCY_A,
      value: basePrice({ origin, destination, departureDate }),
      number_of_changes: i % 3 === 0 ? 1 : 0,
      found_at: hoursAgo(now, 6 + i),
    }
  })
}

// getFlights do fast-flights-ts. O voo das 06:15 repete um do cache, para a deduplicação agir.
export function fastFlightsResults(search) {
  const base = basePrice(search)
  const minutes = routeMinutes(search)
  const date = search.departureDate.split('-').map(Number)
  return [
    { type: 'G3', name: 'Gol', time: [6, 15], extra: 25 },
    { type: 'AD', name: 'Azul', time: [11, 20], extra: 60 },
  ].map((slot) => ({
    type: slot.type,
    price: base + slot.extra,
    airlines: [slot.name],
    flights: [{ departure: { date, time: slot.time }, duration: minutes }],
  }))
}

// /api/v2/flights/searchFlights do Sky-Scrapper. O voo das 09:40 repete um do cache.
export function skyItineraries(search) {
  const base = basePrice(search)
  const minutes = routeMinutes(search)
  return [
    { name: 'LATAM Airlines', time: '09:40', extra: 60, stops: 0 },
    { name: 'Gol Linhas Aéreas', time: '20:05', extra: 95, stops: 1 },
  ].map((slot) => ({
    price: { raw: base + slot.extra },
    legs: [
      {
        departure: `${search.departureDate}T${slot.time}:00`,
        stopCount: slot.stops,
        durationInMinutes: minutes + slot.stops * 90,
        carriers: { marketing: [{ name: slot.name }] },
      },
      ...(search.returnDate ? [{ departure: `${search.returnDate}T18:10:00`, stopCount: 0 }] : []),
    ],
  }))
}

// engine=google_flights da SerpAPI: horário com espaço e número do voo com o código da companhia
export function serpapiBody(search) {
  const { origin, destination, departureDate } = search
  const base = basePrice(search)
  const minutes = routeMinutes(search)
  const leg = (airline, number, from, to, time) => ({
    airline,
    flight_number: number,
    departure_airport: { id: from, time: `${departureDate} ${time}` },
    arrival_airport: { id: to },
  })
  return {
    best_flights: [
      {
        price: base + 10,
        total_duration: minutes,
        flights: [leg('Gol', 'G3 9101', origin, destination, '06:15')],
      },
    ],
    other_flights: [
      {
        price: base + 70,
        total_duration: minutes + 90,
        flights: [
          leg('Azul', 'AD 9303', origin, 'VCP', '13:05'),
          leg('Azul', 'AD 9304', 'VCP', destination, '15:00'),
        ],
      },
    ],
    price_insights: {
      lowest_price: base + 10,
      price_level: 'typical',
      typical_price_range: [base - 40, base + 200],
    },
    search_metadata: { google_flights_url: null },
  }
}
