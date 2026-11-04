import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { offerSearch } from '../src/buyLinks.js'
import { offer } from './helpers/server.js'

const byCity = offer({ origin: 'SAO', destination: 'RIO', departureAt: '2026-12-07', returnAt: null })

test('conferir o preço usa a rota pedida, mesmo com a oferta vinda por cidade', () => {
  const search = offerSearch(byCity, { origin: 'GRU', destination: 'GIG' })
  assert.equal(search.origin, 'GRU')
  assert.equal(search.destination, 'GIG')
})

test('conferir o preço usa as datas da oferta', () => {
  const roundTrip = offer({ departureAt: '2026-12-10T08:30:00-03:00', returnAt: '2026-12-20T18:10:00-03:00' })
  const search = offerSearch(roundTrip, { origin: 'GRU', destination: 'GIG' })
  assert.equal(search.departureDate, '2026-12-10')
  assert.equal(search.returnDate, '2026-12-20')
  assert.equal(offerSearch(byCity).returnDate, undefined)
})

test('sem rota pedida, conferir o preço usa a rota da oferta', () => {
  const search = offerSearch(byCity)
  assert.equal(search.origin, 'SAO')
  assert.equal(search.destination, 'RIO')
})
