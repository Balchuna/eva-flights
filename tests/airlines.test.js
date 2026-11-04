import './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalAirline } from '../shared/airlines.js'
import { airlineSite } from '../src/buyLinks.js'

test('código e nomes da mesma companhia viram um código só', () => {
  const groups = {
    G3: ['G3', 'g3', 'Gol', 'GOL', 'Gol Linhas Aéreas', 'GOL Linhas Aereas Inteligentes'],
    AD: ['AD', 'Azul', 'Azul Linhas Aéreas Brasileiras'],
    LA: ['LA', 'JJ', 'LATAM', 'LATAM Airlines', 'LATAM Airlines Brasil', 'TAM'],
    TP: ['TP', 'TAP', 'TAP Air Portugal'],
  }
  for (const [code, names] of Object.entries(groups)) {
    for (const name of names) assert.equal(canonicalAirline(name), code, name)
  }
})

test('companhia fora da tabela fica como veio e vazio vira null', () => {
  assert.equal(canonicalAirline('Companhia Fictícia'), 'Companhia Fictícia')
  assert.equal(canonicalAirline(null), null)
  assert.equal(canonicalAirline(''), null)
})

test('link da companhia vale para código e para nome', () => {
  assert.equal(airlineSite('G3').name, 'GOL')
  assert.equal(airlineSite('Gol Linhas Aéreas').name, 'GOL')
  assert.equal(airlineSite('JJ').name, 'LATAM')
  assert.equal(airlineSite('Companhia Fictícia'), null)
  assert.equal(airlineSite(null), null)
})
