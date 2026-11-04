import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeOffers, withConfidence, buildVerification } from '../server/offers.js'
import { offer } from './helpers/server.js'

const NOW = new Date('2026-12-05T12:00:00Z')
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600_000).toISOString()

test('dedupe: mesma companhia, voo e partida fica com o menor preço', () => {
  const merged = mergeOffers([offer({ price: 500 }), offer({ price: 300, source: 'skyscrapper' })])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].price, 300)
  assert.equal(merged[0].source, 'skyscrapper')
})

test('dedupe: voo diferente na mesma partida continua separado', () => {
  const merged = mergeOffers([offer({ flightNumber: '9101' }), offer({ flightNumber: '9102' })])
  assert.equal(merged.length, 2)
})

test('dedupe: partida em outro minuto continua separada', () => {
  const merged = mergeOffers([
    offer({ departureAt: '2026-12-10T08:30:00' }),
    offer({ departureAt: '2026-12-10T08:31:00' }),
  ])
  assert.equal(merged.length, 2)
})

test('dedupe: resultado sai ordenado por preço', () => {
  const merged = mergeOffers([
    offer({ flightNumber: '1', price: 900 }),
    offer({ flightNumber: '2', price: 100 }),
    offer({ flightNumber: '3', price: 500 }),
  ])
  assert.deepEqual(merged.map((o) => o.price), [100, 500, 900])
})

test('confiança: oferta viva aparece como viva', () => {
  const result = withConfidence(offer({ live: true, foundAt: hoursAgo(0) }), NOW)
  assert.equal(result.confidence, 'live')
  assert.equal(result.ageHours, 0)
})

test('confiança: cache por idade', () => {
  assert.equal(withConfidence(offer({ foundAt: hoursAgo(2) }), NOW).confidence, 'fresh')
  assert.equal(withConfidence(offer({ foundAt: hoursAgo(30) }), NOW).confidence, 'cache')
  assert.equal(withConfidence(offer({ foundAt: hoursAgo(100) }), NOW).confidence, 'stale')
  assert.equal(withConfidence(offer({ foundAt: hoursAgo(100) }), NOW).ageHours, 100)
})

test('verificação: calcula delta contra o menor preço', () => {
  const verification = buildVerification([offer({ price: 400 })], { cheapest: 500, googleUrl: 'https://g.test' }, NOW)
  assert.deepEqual(verification, {
    at: NOW.toISOString(),
    cachePrice: 400,
    livePrice: 500,
    delta: 25,
    googleUrl: 'https://g.test',
  })
})

test('verificação: sem preço no Google não gera resultado', () => {
  assert.equal(buildVerification([offer()], { cheapest: null }, NOW), null)
})

test('verificação: compara com a oferta de cache, mesmo com viva mais barata', () => {
  const offers = [offer({ price: 300, source: 'google-live', live: true }), offer({ price: 400 })]
  const verification = buildVerification(offers, { cheapest: 500 }, NOW)
  assert.equal(verification.cachePrice, 400)
  assert.equal(verification.delta, 25)
})

test('verificação: sem oferta de cache com preço não gera resultado', () => {
  assert.equal(buildVerification([offer({ source: 'google-live' })], { cheapest: 500 }, NOW), null)
  assert.equal(buildVerification([offer({ price: 0 })], { cheapest: 500 }, NOW), null)
})
