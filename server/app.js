import express from 'express'
import { getProviders, activeSources, isDemo } from './providers/index.js'
import { getUsage, canCall, canAutoVerify, remaining, trackCall, LIMITS } from './usage.js'
import { read, write } from './store.js'
import { listAlerts, saveAlerts, checkAllAlerts } from './alerts.js'
import { mergeOffers, withConfidence, buildVerification } from './offers.js'

const CACHE_TTL = 3 * 3600_000

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  }
}

export function createApp({ providers = getProviders() } = {}) {
  const { travelpayouts, serpapi, skyscrapper, fastflights } = providers
  const app = express()
  app.use(express.json())

  const cache = new Map()

  function cached(key, fn) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.value)
    return fn().then((value) => {
      cache.set(key, { at: Date.now(), value })
      return value
    })
  }

  app.get(
    '/api/sources',
    handle(() => ({
      demo: isDemo(),
      sources: activeSources(providers),
      usage: getUsage(),
      limits: LIMITS,
      remaining: { serpapi: remaining('serpapi'), skyscrapper: remaining('skyscrapper') },
    }))
  )

  app.get(
    '/api/locations',
    handle((req) => {
      const q = String(req.query.q || '').trim()
      if (q.length < 2) return { data: [] }
      return cached(`loc:${q.toLowerCase()}`, async () => ({
        data: await travelpayouts.searchLocations(q),
      }))
    })
  )

  app.get(
    '/api/flights',
    handle(async (req) => {
      const { origin, destination, departureDate, returnDate, useSkyscrapper } = req.query
      if (!origin || !destination || !departureDate) {
        const err = new Error('origin, destination e departureDate são obrigatórios')
        err.status = 400
        throw err
      }
      const wantSky = useSkyscrapper === 'true' && skyscrapper.enabled()
      const key = `fl:${origin}:${destination}:${departureDate}:${returnDate || ''}:${wantSky}`
      const result = await cached(key, async () => {
        const jobs = [
          travelpayouts
            .searchFlights({ origin, destination, departureDate, returnDate })
            .catch((e) => ({ error: `Travelpayouts: ${e.message}` })),
          travelpayouts
            .latestPrices({ origin, destination, departureDate, returnDate })
            .catch((e) => ({ error: `Travelpayouts latest: ${e.message}` })),
        ]
        if (fastflights.enabled()) {
          jobs.push(
            fastflights
              .searchFlights({ origin, destination, departureDate, returnDate })
              .catch((e) => ({ error: `Google (vivo): ${e.message}` }))
          )
        }
        if (wantSky) {
          if (!canCall('skyscrapper', 3)) {
            jobs.push(Promise.resolve({ error: `Sky-Scrapper: quota mensal esgotada (${LIMITS.skyscrapper})` }))
          } else {
            jobs.push(
              skyscrapper
                .searchFlights({ origin, destination, departureDate, returnDate })
                .catch((e) => ({ error: `Sky-Scrapper: ${e.message}` }))
            )
          }
        }
        const settled = await Promise.all(jobs)
        const errors = settled.filter((s) => s.error).map((s) => s.error)
        const merged = mergeOffers(settled.filter((s) => Array.isArray(s)).flat())
        // Só é falha da busca quando nenhuma fonte respondeu; lista vazia com aviso é resposta válida
        if (errors.length === settled.length) {
          const err = new Error(errors.join(' | '))
          err.status = 502
          throw err
        }
        let nearby = []
        if (!merged.length) {
          nearby = await travelpayouts
            .nearbyDates({ origin, destination, departureDate })
            .catch(() => [])
        }
        return { offers: merged, nearby, warnings: errors }
      })

      // Verificação automática seletiva: 1 chamada SerpAPI por rota+data a cada 24h,
      // dentro do orçamento de auto-verificação (metade da quota mensal)
      let verified = null
      const vKey = `${origin}:${destination}:${departureDate}:${returnDate || ''}`
      const verifications = read('verifications', {})
      const existing = verifications[vKey]
      if (existing && Date.now() - new Date(existing.at) < 24 * 3600_000) {
        verified = existing
      } else if (result.offers.length && serpapi.enabled() && canAutoVerify()) {
        try {
          const check = await serpapi.verifyPrice({ origin, destination, departureDate, returnDate })
          trackCall('serpapi-auto')
          verified = buildVerification(result.offers, check)
          if (verified) {
            verifications[vKey] = verified
            write('verifications', verifications)
          }
        } catch {
          // auto-verificação é best-effort; falha não afeta a busca
        }
      }
      const history = read('history', [])
      history.unshift({
        at: new Date().toISOString(),
        origin,
        destination,
        departureDate,
        returnDate: returnDate || null,
        cheapest: result.offers.length ? result.offers[0].price : null,
      })
      write('history', history.slice(0, 100))
      return {
        data: result.offers.map((offer) => withConfidence(offer)),
        nearby: result.nearby || [],
        warnings: result.warnings,
        verified,
      }
    })
  )

  // Verificação de preço real no Google Flights (SerpAPI, ~100/mês — só sob demanda)
  app.post(
    '/api/verify',
    handle((req) => {
      if (!canCall('serpapi')) {
        const err = new Error(`Quota SerpAPI do mês esgotada (${LIMITS.serpapi} buscas). Renova na virada do mês.`)
        err.status = 429
        throw err
      }
      const { origin, destination, departureDate, returnDate } = req.body
      return serpapi.verifyPrice({ origin, destination, departureDate, returnDate })
    })
  )

  app.get(
    '/api/flex',
    handle((req) => {
      const { origin, destination, month } = req.query
      if (!origin || !destination || !/^\d{4}-\d{2}$/.test(month || '')) {
        const err = new Error('origin, destination e month (YYYY-MM) são obrigatórios')
        err.status = 400
        throw err
      }
      return cached(`flex:${origin}:${destination}:${month}`, async () => ({
        data: await travelpayouts.monthMatrix({ origin, destination, month }),
      }))
    })
  )

  app.get('/api/history', handle(() => read('history', [])))
  app.delete(
    '/api/history',
    handle(() => {
      write('history', [])
      return { ok: true }
    })
  )

  app.get('/api/favorites', handle(() => read('favorites', [])))
  app.post(
    '/api/favorites',
    handle((req) => {
      const favs = read('favorites', [])
      favs.push({ id: crypto.randomUUID(), ...req.body })
      write('favorites', favs)
      return favs
    })
  )
  app.delete(
    '/api/favorites/:id',
    handle((req) => {
      const favs = read('favorites', []).filter((f) => f.id !== req.params.id)
      write('favorites', favs)
      return favs
    })
  )

  app.get('/api/alerts', handle(() => listAlerts()))
  app.post(
    '/api/alerts',
    handle((req) => {
      const alerts = listAlerts()
      alerts.push({
        id: crypto.randomUUID(),
        active: true,
        notified: false,
        history: [],
        createdAt: new Date().toISOString(),
        ...req.body,
        targetPrice: Number(req.body.targetPrice),
      })
      saveAlerts(alerts)
      return alerts
    })
  )
  app.patch(
    '/api/alerts/:id',
    handle((req) => {
      const alerts = listAlerts()
      const alert = alerts.find((a) => a.id === req.params.id)
      if (alert) Object.assign(alert, req.body)
      saveAlerts(alerts)
      return alerts
    })
  )
  app.delete(
    '/api/alerts/:id',
    handle((req) => {
      const alerts = listAlerts().filter((a) => a.id !== req.params.id)
      saveAlerts(alerts)
      return alerts
    })
  )
  app.post('/api/alerts/check', handle(() => checkAllAlerts()))

  return app
}

// Só a própria máquina: a API não tem login e gasta as quotas das chaves do .env
export function startServer(app, port, onListening) {
  return app.listen(port, '127.0.0.1', onListening)
}
