import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyFilters, EMPTY_FILTERS } from '../src/filtering.js'
import { offer } from './helpers/server.js'

const inBand = (band) => ({ ...EMPTY_FILTERS, band })

test('faixa de partida: separa por hora e a madrugada conta como noite', () => {
  const offers = ['06:15', '13:05', '19:00', '02:30'].map((time) => offer({ departureAt: `2026-12-10T${time}` }))
  const times = (band) => applyFilters(offers, inBand(band)).map((o) => o.departureAt.slice(11))
  assert.deepEqual(times('morning'), ['06:15'])
  assert.deepEqual(times('afternoon'), ['13:05'])
  assert.deepEqual(times('night'), ['19:00', '02:30'])
})

test('faixa de partida: partida sem hora não entra em nenhuma faixa', () => {
  const offers = [offer({ departureAt: '2026-12-10' }), offer({ departureAt: null })]
  for (const band of ['morning', 'afternoon', 'night']) {
    assert.deepEqual(applyFilters(offers, inBand(band)), [], band)
  }
  assert.equal(applyFilters(offers, EMPTY_FILTERS).length, 2)
})

test('ordenar por confiança: idade desconhecida fica depois do cache e antes do antigo', () => {
  const levels = [['stale', 100], ['unknown', 200], ['cache', 300], ['fresh', 400], ['live', 500]]
  const offers = levels.map(([confidence, price]) => offer({ confidence, price }))
  const sorted = applyFilters(offers, { ...EMPTY_FILTERS, sort: 'confidence' })
  assert.deepEqual(sorted.map((o) => o.confidence), ['live', 'fresh', 'cache', 'unknown', 'stale'])
})

test('companhia: mostra só as escolhidas', () => {
  const offers = [offer({ airline: 'G3' }), offer({ airline: 'AD' }), offer({ airline: null })]
  const chosen = applyFilters(offers, { ...EMPTY_FILTERS, airlines: ['AD'] })
  assert.deepEqual(chosen.map((o) => o.airline), ['AD'])
})
