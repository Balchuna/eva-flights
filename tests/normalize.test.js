import './helpers/setup.js'
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeOffer,
  normalizeLatest,
  normalizeMonthMatrix,
  normalizePlaces,
} from '../server/providers/travelpayouts.js'
import { normalizeFlights } from '../server/providers/fastflights.js'
import { normalizeItineraries } from '../server/providers/skyscrapper.js'
import { normalizeVerification } from '../server/providers/serpapi.js'
import { OFFER_KEYS } from './helpers/server.js'
import {
  travelpayoutsV3Row,
  travelpayoutsLatestRow,
  monthMatrixRow,
  placesRow,
  fastFlightsResult,
  skyItinerary,
  serpapiBody,
} from './fixtures/providers.js'

const NOW = new Date('2026-12-05T12:00:00Z')
const SEARCH = { origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10', returnDate: '2026-12-20' }

afterEach(() => {
  delete process.env.TRAVELPAYOUTS_MARKER
})

test('todo provedor devolve o mesmo formato de oferta', () => {
  const offers = {
    travelpayouts: normalizeOffer(travelpayoutsV3Row),
    latest: normalizeLatest([travelpayoutsLatestRow], SEARCH)[0],
    fastflights: normalizeFlights([fastFlightsResult], SEARCH, NOW)[0],
    skyscrapper: normalizeItineraries([skyItinerary], SEARCH, NOW)[0],
    serpapi: normalizeVerification(serpapiBody, SEARCH, NOW).offers[0],
  }
  for (const [name, offer] of Object.entries(offers)) {
    assert.deepEqual(Object.keys(offer).sort(), [...OFFER_KEYS].sort(), name)
  }
})

test('Travelpayouts v3: normaliza a oferta', () => {
  const offer = normalizeOffer(travelpayoutsV3Row)
  assert.equal(offer.source, 'travelpayouts')
  assert.equal(offer.live, false)
  assert.equal(offer.price, 412)
  assert.equal(offer.airline, 'G3')
  assert.equal(offer.flightNumber, 9101)
  assert.equal(offer.departureAt, '2026-12-10T08:30:00-03:00')
  assert.equal(offer.returnAt, '2026-12-20T18:10:00-03:00')
  assert.equal(offer.transfers, 0)
  assert.equal(offer.returnTransfers, 1)
  assert.equal(offer.durationMinutes, 130)
  assert.equal(offer.foundAt, '2026-12-01T10:00:00Z')
  assert.equal(offer.buyUrl, 'https://www.aviasales.com/search/GRU1012GIG20121')
})

test('Travelpayouts v3: inclui o marker no link quando configurado', () => {
  process.env.TRAVELPAYOUTS_MARKER = 'marcador-ficticio'
  const offer = normalizeOffer(travelpayoutsV3Row)
  assert.equal(offer.buyUrl, 'https://www.aviasales.com/search/GRU1012GIG20121?marker=marcador-ficticio')
})

test('Travelpayouts latest: usa value como preço e descarta outra data de ida', () => {
  const offers = normalizeLatest(
    [travelpayoutsLatestRow, { ...travelpayoutsLatestRow, depart_date: '2026-12-11' }],
    SEARCH
  )
  assert.equal(offers.length, 1)
  assert.equal(offers[0].price, 380)
  assert.equal(offers[0].departureAt, '2026-12-10')
  assert.equal(offers[0].transfers, 1)
  assert.equal(offers[0].buyUrl, null)
})

test('Travelpayouts latest: em ida e volta descarta outra data de volta', () => {
  const offers = normalizeLatest(
    [
      travelpayoutsLatestRow,
      { ...travelpayoutsLatestRow, return_date: '2026-12-25' },
      { ...travelpayoutsLatestRow, return_date: '' },
    ],
    SEARCH
  )
  assert.equal(offers.length, 1)
  assert.equal(offers[0].returnAt, '2026-12-20')
})

test('Travelpayouts latest: só ida não filtra a volta', () => {
  const rows = [{ ...travelpayoutsLatestRow, return_date: '' }]
  assert.equal(normalizeLatest(rows, { departureDate: '2026-12-10' }).length, 1)
})

test('Travelpayouts month-matrix: volta vazia vira null e ordena por data', () => {
  const rows = normalizeMonthMatrix([monthMatrixRow, { ...monthMatrixRow, depart_date: '2026-12-03', value: 900 }])
  assert.deepEqual(rows.map((r) => r.departureDate), ['2026-12-03', '2026-12-12'])
  assert.deepEqual(rows[1], { departureDate: '2026-12-12', returnDate: null, price: 310, transfers: 0 })
})

test('Autocomplete: mantém só os campos usados', () => {
  assert.deepEqual(normalizePlaces([placesRow]), [
    { code: 'GRU', name: 'Aeroporto Fictício', cityName: 'São Paulo', countryName: 'Brasil', type: 'airport' },
  ])
})

test('fast-flights: monta partida ISO, escalas e duração somada', () => {
  const [offer] = normalizeFlights([fastFlightsResult], SEARCH, NOW)
  assert.equal(offer.source, 'google-live')
  assert.equal(offer.live, true)
  assert.equal(offer.foundAt, NOW.toISOString())
  assert.equal(offer.origin, 'GRU')
  assert.equal(offer.price, 500)
  assert.equal(offer.departureAt, '2026-12-10T08:30')
  assert.equal(offer.transfers, 1)
  assert.equal(offer.durationMinutes, 125)
})

test('fast-flights: ida e volta leva a data da volta; só ida fica sem', () => {
  assert.equal(normalizeFlights([fastFlightsResult], SEARCH, NOW)[0].returnAt, '2026-12-20')
  const oneWay = { origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10' }
  assert.equal(normalizeFlights([fastFlightsResult], oneWay, NOW)[0].returnAt, null)
})

test('fast-flights: descarta preço inválido e entrada que não é lista', () => {
  assert.deepEqual(normalizeFlights([{ ...fastFlightsResult, price: 0 }], SEARCH, NOW), [])
  assert.deepEqual(normalizeFlights(null, SEARCH, NOW), [])
})

test('Sky-Scrapper: normaliza ida e volta', () => {
  const [offer] = normalizeItineraries([skyItinerary], SEARCH, NOW)
  assert.equal(offer.source, 'skyscrapper')
  assert.equal(offer.live, true)
  assert.equal(offer.price, 610)
  assert.equal(offer.departureAt, '2026-12-10T08:30:00')
  assert.equal(offer.returnAt, '2026-12-20T18:10:00')
  assert.equal(offer.transfers, 0)
  assert.equal(offer.returnTransfers, 1)
  assert.equal(offer.durationMinutes, 65)
})

test('Sky-Scrapper: descarta itinerário sem preço', () => {
  assert.deepEqual(normalizeItineraries([{ ...skyItinerary, price: {} }], SEARCH, NOW), [])
})

test('SerpAPI: junta best e other, calcula o menor e normaliza a oferta', () => {
  const result = normalizeVerification(serpapiBody, SEARCH, NOW)
  assert.equal(result.cheapest, 650)
  assert.equal(result.googleUrl, 'https://www.google.com/travel/flights?q=ficticio')
  assert.deepEqual(result.priceInsights, { lowestPrice: 650, priceLevel: 'typical', typicalRange: [500, 800] })
  const [first, second] = result.offers
  assert.equal(first.source, 'google')
  assert.equal(first.origin, 'GRU')
  assert.equal(first.departureAt, '2026-12-10T08:30')
  assert.equal(first.flightNumber, '9101')
  assert.equal(first.returnAt, '2026-12-20')
  assert.equal(first.transfers, 0)
  assert.equal(second.transfers, 1)
  assert.equal(second.durationMinutes, 200)
})

test('SerpAPI: sem voos, cheapest é null', () => {
  const result = normalizeVerification({}, SEARCH, NOW)
  assert.deepEqual(result.offers, [])
  assert.equal(result.cheapest, null)
  assert.equal(result.priceInsights, null)
})
