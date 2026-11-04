import { useTempData, blockedRequests } from './helpers/setup.js'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { searchFlights as realFastFlights } from '../server/providers/fastflights.js'
import { fakeProviders, startTestServer, offer, SEARCH_QS } from './helpers/server.js'

let temp
let running

async function get(providers, path) {
  running = await startTestServer(providers)
  const res = await fetch(running.url + path)
  return { status: res.status, body: await res.json() }
}

beforeEach(() => {
  temp = useTempData()
})

afterEach(async () => {
  await running?.close()
  running = null
  temp.cleanup()
})

const withCacheOffer = {
  travelpayouts: { searchFlights: async () => [offer()] },
}

test('fast-flights com erro vira aviso e não derruba a busca', async () => {
  const { status, body } = await get(
    fakeProviders({
      ...withCacheOffer,
      fastflights: {
        enabled: () => true,
        searchFlights: async () => {
          throw new Error('quebrou')
        },
      },
    }),
    `/api/flights?${SEARCH_QS}`
  )
  assert.equal(status, 200)
  assert.equal(body.data.length, 1)
  assert.deepEqual(body.warnings, ['Google (vivo): quebrou'])
})

test('fast-flights lento vira aviso de timeout e não derruba a busca', async () => {
  const neverEnds = () => new Promise(() => {})
  const started = Date.now()
  const { status, body } = await get(
    fakeProviders({
      ...withCacheOffer,
      fastflights: {
        enabled: () => true,
        searchFlights: (params) => realFastFlights(params, { search: neverEnds, timeoutMs: 20 }),
      },
    }),
    `/api/flights?${SEARCH_QS}`
  )
  assert.equal(status, 200)
  assert.equal(body.data.length, 1)
  assert.deepEqual(body.warnings, ['Google (vivo): timeout'])
  assert.ok(Date.now() - started < 2000)
})

test('fast-flights: resposta rápida não deixa timer pendente', async () => {
  const timers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length
  const before = timers()
  await realFastFlights(
    { origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10' },
    { search: async () => [], timeoutMs: 60_000 }
  )
  assert.equal(timers(), before)
})

test('resposta traz a confiança de cada oferta', async () => {
  const { body } = await get(fakeProviders(withCacheOffer), `/api/flights?${SEARCH_QS}`)
  assert.equal(body.data[0].confidence, 'fresh')
})

test('busca sem parâmetro obrigatório responde 400', async () => {
  const { status } = await get(fakeProviders(), '/api/flights?origin=GRU')
  assert.equal(status, 400)
})

test('/api/sources mostra as fontes ativas', async () => {
  const { body } = await get(fakeProviders(), '/api/sources')
  assert.deepEqual(body.sources, { travelpayouts: true, serpapi: false, skyscrapper: false, fastflights: false })
})

test('nenhum teste de rota tenta sair para a rede', () => {
  assert.deepEqual(blockedRequests, [])
})
