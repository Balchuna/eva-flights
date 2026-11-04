import { useTempData, blockedRequests } from './helpers/setup.js'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { searchFlights as realFastFlights } from '../server/providers/fastflights.js'
import { write } from '../server/store.js'
import { LIMITS } from '../server/usage.js'
import { fakeProviders, startTestServer, offer, SEARCH_QS } from './helpers/server.js'

let temp
let running

const useCalls = (calls) => write('usage', { month: new Date().toISOString().slice(0, 7), calls })

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

const failing = (message) => async () => {
  throw new Error(message)
}

test('fast-flights com erro e cache vazio responde 200 com aviso e datas vizinhas', async () => {
  const nearby = [{ departureDate: '2026-12-11', returnDate: null, price: 300, transfers: 0 }]
  const { status, body } = await get(
    fakeProviders({
      travelpayouts: { nearbyDates: async () => nearby },
      fastflights: { enabled: () => true, searchFlights: failing('quebrou') },
    }),
    `/api/flights?${SEARCH_QS}`
  )
  assert.equal(status, 200)
  assert.deepEqual(body.data, [])
  assert.deepEqual(body.warnings, ['Google (vivo): quebrou'])
  assert.deepEqual(body.nearby, nearby)
})

test('todas as fontes com erro respondem 502 com as mensagens', async () => {
  const { status, body } = await get(
    fakeProviders({
      travelpayouts: { searchFlights: failing('sem token'), latestPrices: failing('sem token') },
      fastflights: { enabled: () => true, searchFlights: failing('quebrou') },
    }),
    `/api/flights?${SEARCH_QS}`
  )
  assert.equal(status, 502)
  assert.equal(body.error, 'Travelpayouts: sem token | Travelpayouts latest: sem token | Google (vivo): quebrou')
})

test('resposta traz a confiança de cada oferta', async () => {
  const { body } = await get(fakeProviders(withCacheOffer), `/api/flights?${SEARCH_QS}`)
  assert.equal(body.data[0].confidence, 'fresh')
})

test('sem oferta de cache a verificação automática não gasta SerpAPI', async () => {
  let calls = 0
  const { body } = await get(
    fakeProviders({
      fastflights: {
        enabled: () => true,
        searchFlights: async () => [offer({ source: 'google-live', live: true })],
      },
      serpapi: {
        enabled: () => true,
        verifyPrice: async () => {
          calls++
          return { cheapest: 500 }
        },
      },
    }),
    `/api/flights?${SEARCH_QS}`
  )
  assert.equal(calls, 0)
  assert.equal(body.verified, null)
  assert.equal(body.data.length, 1)
})

function skyCounting(calls) {
  return {
    enabled: () => true,
    searchFlights: async () => {
      calls.count++
      return []
    },
  }
}

test('Sky-Scrapper: sem quota para as 3 chamadas da busca vira aviso e a fonte não é chamada', async () => {
  useCalls({ skyscrapper: LIMITS.skyscrapper - 2 })
  const calls = { count: 0 }
  const { status, body } = await get(
    fakeProviders({ ...withCacheOffer, skyscrapper: skyCounting(calls) }),
    `/api/flights?${SEARCH_QS}&useSkyscrapper=true`
  )
  assert.equal(status, 200)
  assert.equal(calls.count, 0)
  assert.deepEqual(body.warnings, [`Sky-Scrapper: quota mensal esgotada (${LIMITS.skyscrapper})`])
})

test('Sky-Scrapper: com quota para as 3 chamadas a busca acontece', async () => {
  useCalls({ skyscrapper: LIMITS.skyscrapper - 3 })
  const calls = { count: 0 }
  const { body } = await get(
    fakeProviders({ ...withCacheOffer, skyscrapper: skyCounting(calls) }),
    `/api/flights?${SEARCH_QS}&useSkyscrapper=true`
  )
  assert.equal(calls.count, 1)
  assert.deepEqual(body.warnings, [])
})

test('/api/verify no limite responde 429 e a fonte não é chamada', async () => {
  useCalls({ serpapi: LIMITS.serpapi })
  let calls = 0
  running = await startTestServer(
    fakeProviders({
      serpapi: {
        enabled: () => true,
        verifyPrice: async () => {
          calls++
          return { cheapest: 500 }
        },
      },
    })
  )
  const res = await fetch(`${running.url}/api/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10' }),
  })
  assert.equal(res.status, 429)
  assert.equal(calls, 0)
})

const VALID_VERIFY = { origin: 'GRU', destination: 'GIG', departureDate: '2026-12-10' }

async function postVerify(body) {
  const calls = { count: 0 }
  running = await startTestServer(
    fakeProviders({
      serpapi: {
        enabled: () => true,
        verifyPrice: async () => {
          calls.count++
          return { cheapest: 500 }
        },
      },
    })
  )
  const res = await fetch(`${running.url}/api/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, calls }
}

for (const [label, body] of [
  ['sem parâmetros', {}],
  ['sem destino', { origin: 'GRU', departureDate: '2026-12-10' }],
  ['com origem inválida', { ...VALID_VERIFY, origin: 'xx' }],
  ['com ida inválida', { ...VALID_VERIFY, departureDate: '10/12/2026' }],
  ['com volta inválida', { ...VALID_VERIFY, returnDate: 'amanhã' }],
]) {
  test(`/api/verify ${label} responde 400 e a fonte não é chamada`, async () => {
    const { status, calls } = await postVerify(body)
    assert.equal(status, 400)
    assert.equal(calls.count, 0)
  })
}

test('/api/verify inválido responde 400 mesmo com a quota esgotada', async () => {
  useCalls({ serpapi: LIMITS.serpapi })
  const { status } = await postVerify({})
  assert.equal(status, 400)
})

test('/api/verify aceita só ida e ida e volta', async () => {
  for (const returnDate of [undefined, null, '2026-12-20']) {
    const { status, calls } = await postVerify({ ...VALID_VERIFY, returnDate })
    assert.equal(status, 200)
    assert.equal(calls.count, 1)
    await running.close()
  }
  running = null
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
