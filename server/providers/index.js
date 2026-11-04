import * as travelpayouts from './travelpayouts.js'
import * as serpapi from './serpapi.js'
import * as skyscrapper from './skyscrapper.js'
import * as fastflights from './fastflights.js'

export { travelpayouts, serpapi, skyscrapper, fastflights }

export function activeSources() {
  return {
    travelpayouts: travelpayouts.enabled(),
    serpapi: serpapi.enabled(),
    skyscrapper: skyscrapper.enabled(),
    fastflights: fastflights.enabled(),
  }
}
