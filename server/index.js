import 'dotenv/config'
import express from 'express'
import { travelpayouts, serpapi, skyscrapper, fastflights, activeSources } from './providers/index.js'
import { getUsage, canCall, canAutoVerify, remaining, trackCall, LIMITS } from './usage.js'
import { read, write } from './store.js'
import { listAlerts, saveAlerts, checkAllAlerts, startAlertLoop } from './alerts.js'

const app = express()
app.use(express.json())

const cache = new Map()
const CACHE_TTL = 3 * 3600_000

function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.value)
  return fn().then((value) => {
    cache.set(key, { at: Date.now(), value })
    return value
  })
}

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message })
    }
  }
}

app.get(
  '/api/sources',
  handle(() => ({
    sources: activeSources(),
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
      const seen = new Map()
      for (const offer of settled.filter((s) => Array.isArray(s)).flat()) {
        const dupKey = `${offer.airline || '?'}:${offer.flightNumber || '?'}:${(offer.departureAt || '').slice(0, 16)}`
        const prev = seen.get(dupKey)
        if (!prev || offer.price < prev.price) seen.set(dupKey, offer)
      }
      const merged = [...seen.values()].sort((a, b) => a.price - b.price)
      if (!merged.length && errors.length) {
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
        if (check.cheapest != null) {
          const cachePrice = result.offers[0].price
          verified = {
            at: new Date().toISOString(),
            cachePrice,
            livePrice: check.cheapest,
            delta: Math.round(((check.cheapest - cachePrice) / cachePrice) * 100),
            googleUrl: check.googleUrl,
          }
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
    return { data: result.offers, nearby: result.nearby || [], warnings: result.warnings, verified }
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

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  const active = Object.entries(activeSources())
    .filter(([, on]) => on)
    .map(([k]) => k)
  console.log(`Eva Flights server em http://localhost:${port} (fontes ativas: ${active.join(', ') || 'nenhuma — configure o .env'})`)
  startAlertLoop()
})
