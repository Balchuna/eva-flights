// Modo demo: troca as chamadas de rede por fixtures sintéticas, mantendo normalizadores e quota
// das fontes reais. Assim a demonstração passa pelo mesmo caminho de uma busca de verdade.
import { trackCall } from '../usage.js'
import * as fixtures from '../demo/fixtures.js'
import {
  normalizeLatest,
  normalizeMonthMatrix,
  normalizeOffer,
  normalizePlaces,
  pickNearby,
} from './travelpayouts.js'
import { normalizeVerification } from './serpapi.js'
import { normalizeItineraries } from './skyscrapper.js'
import { normalizeFlights } from './fastflights.js'

const enabled = () => true

async function monthMatrix(search) {
  trackCall('travelpayouts')
  return normalizeMonthMatrix(fixtures.monthMatrixRows(search))
}

export const demoProviders = {
  travelpayouts: {
    enabled,
    searchLocations: async (term) => normalizePlaces(fixtures.placesRows(term)),
    searchFlights: async (search) => {
      trackCall('travelpayouts')
      return fixtures.travelpayoutsV3Rows(search).map(normalizeOffer)
    },
    latestPrices: async (search) => {
      trackCall('travelpayouts')
      return normalizeLatest(fixtures.travelpayoutsLatestRows(search), search)
    },
    nearbyDates: async ({ origin, destination, departureDate, days = 3 }) => {
      const month = departureDate.slice(0, 7)
      return pickNearby(await monthMatrix({ origin, destination, month }), departureDate, days)
    },
    monthMatrix,
  },
  serpapi: {
    enabled,
    verifyPrice: async (search) => {
      trackCall('serpapi')
      return normalizeVerification(fixtures.serpapiBody(search), search)
    },
  },
  skyscrapper: {
    enabled,
    searchFlights: async (search) => {
      // A fonte real gasta 3 chamadas por busca: 2 aeroportos e os voos
      for (let i = 0; i < 3; i++) trackCall('skyscrapper')
      return normalizeItineraries(fixtures.skyItineraries(search), search)
    },
  },
  fastflights: {
    enabled,
    searchFlights: async (search) => normalizeFlights(fixtures.fastFlightsResults(search), search),
  },
}
