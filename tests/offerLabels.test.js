import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carrierName, offerMeta } from '../src/offerLabels.js'
import { offer } from './helpers/server.js'

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

test('nome da companhia: código vira nome; desconhecida fica como veio', () => {
  assert.equal(carrierName('G3'), 'GOL')
  assert.equal(carrierName('Companhia Fictícia'), 'Companhia Fictícia')
})
