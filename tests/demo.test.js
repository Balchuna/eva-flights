import { useTempData, blockedRequests } from './helpers/setup.js'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer, OFFER_KEYS } from './helpers/server.js'
import { getProviders, isDemo } from '../server/providers/index.js'
import { demoProviders } from '../server/providers/demo.js'
import { alertTitle, checkAllAlerts, saveAlerts } from '../server/alerts.js'

const SEARCH = { origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10', returnDate: '2026-12-20' }
const QS = new URLSearchParams(SEARCH).toString()

let temp
let running

async function api(path, init) {
  const res = await fetch(running.url + path, init)
  return { status: res.status, body: await res.json() }
}

beforeEach(async () => {
  temp = useTempData()
  process.env.DEMO_MODE = 'true'
  blockedRequests.length = 0
  running = await startTestServer(getProviders())
})

afterEach(async () => {
  await running.close()
  delete process.env.DEMO_MODE
  temp.cleanup()
})

test('DEMO_MODE=true troca todos os provedores pelo demo', () => {
  assert.equal(isDemo(), true)
  assert.equal(getProviders(), demoProviders)
})

test('sem DEMO_MODE=true os provedores são os reais', async () => {
  delete process.env.DEMO_MODE
  assert.equal(isDemo(), false)
  assert.notEqual(getProviders(), demoProviders)
  process.env.DEMO_MODE = 'false'
  assert.equal(isDemo(), false)
  const { body } = await api('/api/sources')
  assert.equal(body.demo, false)
})

test('demo avisa a interface e liga todas as fontes sem chave', async () => {
  const { body } = await api('/api/sources')
  assert.equal(body.demo, true)
  assert.deepEqual(body.sources, { travelpayouts: true, serpapi: true, skyscrapper: true, fastflights: true })
})

test('demo: busca traz ofertas de todas as fontes sem sair para a rede', async () => {
  const { status, body } = await api(`/api/flights?${QS}&useSkyscrapper=true`)
  assert.equal(status, 200)
  assert.deepEqual(body.warnings, [])
  assert.deepEqual([...new Set(body.data.map((o) => o.source))].sort(), ['google-live', 'skyscrapper', 'travelpayouts'])
  assert.ok(body.verified.livePrice > 0)
  assert.deepEqual(blockedRequests, [])
})

test('demo: toda oferta sai no formato único, com voo da faixa 9000', async () => {
  const travelpayouts = await demoProviders.travelpayouts.searchFlights(SEARCH)
  const offers = [
    ...travelpayouts,
    ...(await demoProviders.travelpayouts.latestPrices(SEARCH)),
    ...(await demoProviders.fastflights.searchFlights(SEARCH)),
    ...(await demoProviders.skyscrapper.searchFlights(SEARCH)),
    ...(await demoProviders.serpapi.verifyPrice(SEARCH)).offers,
  ]
  for (const offer of offers) {
    assert.deepEqual(Object.keys(offer).sort(), [...OFFER_KEYS].sort())
    assert.ok(offer.price > 0)
    if (offer.flightNumber) assert.ok(Number(offer.flightNumber) >= 9000, String(offer.flightNumber))
  }
  assert.ok(travelpayouts.some((o) => o.flightNumber))
})

test('demo: mostra ofertas de idades diferentes', async () => {
  const { body } = await api(`/api/flights?${QS}&useSkyscrapper=true`)
  const levels = new Set(body.data.map((o) => o.confidence))
  for (const level of ['live', 'fresh', 'cache', 'stale']) assert.ok(levels.has(level), level)
})

test('demo: a mesma busca dá os mesmos preços; outra rota dá outros', async () => {
  const prices = async (search) => (await demoProviders.travelpayouts.searchFlights(search)).map((o) => o.price)
  assert.deepEqual(await prices(SEARCH), await prices(SEARCH))
  assert.notDeepEqual(await prices(SEARCH), await prices({ ...SEARCH, destination: 'SSA' }))
})

test('demo: nenhuma oferta leva a um site de compra', async () => {
  const { body } = await api(`/api/flights?${QS}&useSkyscrapper=true`)
  assert.ok(body.data.length > 0)
  assert.ok(body.data.every((o) => o.buyUrl === null))
})

test('demo: consome a quota igual às fontes reais', async () => {
  await api('/api/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SEARCH),
  })
  await demoProviders.skyscrapper.searchFlights(SEARCH)
  const { body } = await api('/api/sources')
  assert.equal(body.usage.calls.serpapi, 1)
  assert.equal(body.usage.calls.skyscrapper, 3)
})

test('demo: verificação, autocomplete e datas flexíveis respondem', async () => {
  const verify = await api('/api/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SEARCH),
  })
  assert.equal(verify.status, 200)
  assert.ok(verify.body.cheapest > 0)

  const places = await api('/api/locations?q=guarulhos')
  assert.equal(places.body.data[0].code, 'GRU')
  const accents = await api('/api/locations?q=brasilia')
  assert.equal(accents.body.data[0].code, 'BSB')

  const flex = await api('/api/flex?origin=GRU&destination=GIG&month=2026-12')
  assert.equal(flex.body.data.length, 31)
  assert.deepEqual(blockedRequests, [])
})

test('demo: alerta usa o provedor demo e o aviso leva [DEMO]', async () => {
  const toasts = []
  saveAlerts([
    { id: 'a1', active: true, notified: false, origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10', targetPrice: 100000 },
  ])
  const [alert] = await checkAllAlerts({ notify: (toast) => toasts.push(toast) })
  assert.ok(alert.lastPrice > 0)
  assert.equal(toasts.length, 1)
  assert.match(toasts[0].title, /^\[DEMO\]/)
  assert.deepEqual(blockedRequests, [])
})

test('fora do demo o aviso de alerta não leva [DEMO]', () => {
  delete process.env.DEMO_MODE
  assert.equal(alertTitle(), 'Eva Flights — preço atingido!')
})
