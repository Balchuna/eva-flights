import { createApp, startServer } from '../../server/app.js'

export function fakeProviders(overrides = {}) {
  return {
    travelpayouts: {
      enabled: () => true,
      searchLocations: async () => [],
      searchFlights: async () => [],
      latestPrices: async () => [],
      nearbyDates: async () => [],
      monthMatrix: async () => [],
      ...overrides.travelpayouts,
    },
    serpapi: {
      enabled: () => false,
      verifyPrice: async () => {
        throw new Error('verifyPrice não esperado neste teste')
      },
      ...overrides.serpapi,
    },
    skyscrapper: {
      enabled: () => false,
      searchFlights: async () => [],
      ...overrides.skyscrapper,
    },
    fastflights: {
      enabled: () => false,
      searchFlights: async () => [],
      ...overrides.fastflights,
    },
  }
}

export async function startTestServer(providers = fakeProviders()) {
  const server = startServer(createApp({ providers }), 0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  return {
    server,
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

export function offer(overrides = {}) {
  return {
    source: 'travelpayouts',
    live: false,
    foundAt: new Date().toISOString(),
    origin: 'GRU',
    destination: 'GIG',
    price: 400,
    airline: 'G3',
    flightNumber: '9101',
    departureAt: '2026-12-10T08:30:00',
    returnAt: null,
    transfers: 0,
    returnTransfers: null,
    durationMinutes: 65,
    buyUrl: null,
    ...overrides,
  }
}

export const SEARCH_QS = 'origin=GRU&destination=GIG&departureDate=2026-12-10'

export const OFFER_KEYS = [
  'airline',
  'buyUrl',
  'departureAt',
  'destination',
  'durationMinutes',
  'flightNumber',
  'foundAt',
  'live',
  'origin',
  'price',
  'returnAt',
  'returnTransfers',
  'source',
  'transfers',
]
