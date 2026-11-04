import { useTempData } from './helpers/setup.js'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { write, read } from '../server/store.js'
import { canCall, canAutoVerify, remaining, trackCall, getUsage, LIMITS } from '../server/usage.js'

let temp
const month = () => new Date().toISOString().slice(0, 7)
const setCalls = (calls) => write('usage', { month: month(), calls })

beforeEach(() => {
  temp = useTempData()
})

afterEach(() => {
  temp.cleanup()
})

test('canCall libera abaixo do limite', () => {
  setCalls({ serpapi: LIMITS.serpapi - 1 })
  assert.equal(canCall('serpapi'), true)
})

test('canCall bloqueia no limite', () => {
  setCalls({ serpapi: LIMITS.serpapi })
  assert.equal(canCall('serpapi'), false)
  assert.equal(remaining('serpapi'), 0)
})

test('canCall considera o custo da chamada', () => {
  setCalls({ skyscrapper: LIMITS.skyscrapper - 2 })
  assert.equal(canCall('skyscrapper', 3), false)
  setCalls({ skyscrapper: LIMITS.skyscrapper - 3 })
  assert.equal(canCall('skyscrapper', 3), true)
})

test('fonte sem limite nunca bloqueia', () => {
  setCalls({ travelpayouts: 100000 })
  assert.equal(canCall('travelpayouts'), true)
})

test('auto-verificação para no sub-orçamento mesmo com quota sobrando', () => {
  setCalls({ serpapi: 50, 'serpapi-auto': 50 })
  assert.equal(canCall('serpapi'), true)
  assert.equal(canAutoVerify(), false)
})

test('trackCall soma no mês atual', () => {
  trackCall('serpapi')
  trackCall('serpapi')
  assert.equal(getUsage().calls.serpapi, 2)
})

test('uso de mês anterior não conta', () => {
  write('usage', { month: '2000-01', calls: { serpapi: LIMITS.serpapi } })
  assert.equal(canCall('serpapi'), true)
  trackCall('serpapi')
  assert.deepEqual(read('usage', {}).calls, { serpapi: 1 })
})
