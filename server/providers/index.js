import * as travelpayouts from './travelpayouts.js'
import * as serpapi from './serpapi.js'
import * as skyscrapper from './skyscrapper.js'
import * as fastflights from './fastflights.js'
import { demoProviders } from './demo.js'

const real = { travelpayouts, serpapi, skyscrapper, fastflights }

export const isDemo = () => process.env.DEMO_MODE === 'true'

export function getProviders() {
  return isDemo() ? demoProviders : real
}

export function activeSources(providers = getProviders()) {
  return {
    travelpayouts: providers.travelpayouts.enabled(),
    serpapi: providers.serpapi.enabled(),
    skyscrapper: providers.skyscrapper.enabled(),
    fastflights: providers.fastflights.enabled(),
  }
}
