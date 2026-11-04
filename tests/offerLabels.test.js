import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONFIDENCE, carrierName, nearbyNote, offerMeta } from '../src/offerLabels.js'
import { offer } from './helpers/server.js'

test('todo nível de confiança tem rótulo e explicação', () => {
  for (const level of ['live', 'fresh', 'cache', 'unknown', 'stale']) {
    assert.ok(CONFIDENCE[level]?.label, level)
    assert.ok(CONFIDENCE[level]?.title, level)
  }
})

test('resumo: companhia pelo nome, voo, escalas e duração', () => {
  assert.equal(offerMeta(offer({ durationMinutes: 65 })), 'GOL · voo G39101 · direto · 1h 5min')
})

test('resumo: agência aparece como agência, não como companhia', () => {
  const viaAgency = offer({ airline: null, gate: 'Agência Fictícia', flightNumber: null, transfers: 1, durationMinutes: null })
  assert.equal(offerMeta(viaAgency), 'via Agência Fictícia · 1 escala')
})

test('resumo: companhia fora da tabela não cola o nome no número do voo', () => {
  const unknown = offer({ airline: 'Companhia Fictícia', transfers: 2, durationMinutes: null })
  assert.equal(offerMeta(unknown), 'Companhia Fictícia · voo 9101 · 2 escalas')
})

test('resumo: sem companhia nem agência mostra só o que existe', () => {
  const bare = offer({ airline: null, flightNumber: null, transfers: null, durationMinutes: null })
  assert.equal(offerMeta(bare), '')
})

const SEM_VOLTA = [{ departureDate: '2026-12-07', returnDate: null, price: 300, transfers: 0 }]
const COM_VOLTA = [{ departureDate: '2026-12-07', returnDate: '2026-12-20', price: 300, transfers: 0 }]

test('datas vizinhas: em ida e volta avisa quando o preço é só de ida', () => {
  assert.match(nearbyNote(SEM_VOLTA, '2026-12-20'), /só de ida/)
})

test('datas vizinhas: não avisa em busca só de ida nem quando o preço inclui a volta', () => {
  assert.doesNotMatch(nearbyNote(SEM_VOLTA, ''), /só de ida/)
  assert.doesNotMatch(nearbyNote(COM_VOLTA, '2026-12-20'), /só de ida/)
})

test('nome da companhia: código vira nome; desconhecida fica como veio', () => {
  assert.equal(carrierName('G3'), 'GOL')
  assert.equal(carrierName('Companhia Fictícia'), 'Companhia Fictícia')
})
