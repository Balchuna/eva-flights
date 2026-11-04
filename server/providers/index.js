import * as travelpayouts from './travelpayouts.js'
import * as serpapi from './serpapi.js'
import * as skyscrapper from './skyscrapper.js'
import * as fastflights from './fastflights.js'

const real = { travelpayouts, serpapi, skyscrapper, fastflights }

export function getProviders() {
  return real
}

export function activeSources(providers = getProviders()) {
  return {
    travelpayouts: providers.travelpayouts.enabled(),
    serpapi: providers.serpapi.enabled(),
    skyscrapper: providers.skyscrapper.enabled(),
    fastflights: providers.fastflights.enabled(),
  }
}
