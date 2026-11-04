import { useTempData } from './helpers/setup.js'
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { checkAllAlerts, listAlerts, saveAlerts } from '../server/alerts.js'

let temp

const alert = (overrides = {}) => ({
  id: 'a',
  active: true,
  notified: false,
  history: [],
  origin: 'GRU',
  destination: 'GIG',
  departureDate: '2026-12-10',
  targetPrice: 300,
  ...overrides,
})

// Simula o que a API faz enquanto a checagem espera a resposta da rede
const during = (change, price = 100) => async () => {
  change()
  return price
}

function collectToasts() {
  const toasts = []
  return { toasts, notify: (toast) => toasts.push(toast) }
}

beforeEach(() => {
  temp = useTempData()
})

afterEach(() => {
  temp.cleanup()
})

test('preço no alvo grava o histórico e notifica uma vez só', async () => {
  saveAlerts([alert()])
  const { toasts, notify } = collectToasts()
  await checkAllAlerts({ notify, check: async () => 250 })
  const [saved] = await checkAllAlerts({ notify, check: async () => 240 })
  assert.equal(saved.lastPrice, 240)
  assert.deepEqual(saved.history.map((h) => h.price), [250, 240])
  assert.equal(saved.notified, true)
  assert.equal(toasts.length, 1)
})

test('alerta inativo não é checado', async () => {
  saveAlerts([alert({ active: false })])
  let calls = 0
  await checkAllAlerts({
    check: async () => {
      calls++
      return 100
    },
  })
  assert.equal(calls, 0)
})

test('erro em um alerta não impede a checagem dos outros', async (t) => {
  t.mock.method(console, 'error', () => {})
  saveAlerts([alert({ id: 'quebra' }), alert({ id: 'ok', targetPrice: 50 })])
  const saved = await checkAllAlerts({
    check: async ({ id }) => {
      if (id === 'quebra') throw new Error('falhou')
      return 100
    },
  })
  assert.equal(saved.find((a) => a.id === 'ok').lastPrice, 100)
  assert.equal(saved.find((a) => a.id === 'quebra').lastPrice, undefined)
})

test('alerta excluído durante a checagem não volta e não notifica', async () => {
  saveAlerts([alert()])
  const { toasts, notify } = collectToasts()
  await checkAllAlerts({ notify, check: during(() => saveAlerts([])) })
  assert.deepEqual(listAlerts(), [])
  assert.deepEqual(toasts, [])
})

test('alerta criado durante a checagem não se perde', async () => {
  saveAlerts([alert()])
  const created = alert({ id: 'novo', active: false })
  await checkAllAlerts({ notify: () => {}, check: during(() => saveAlerts([...listAlerts(), created])) })
  assert.deepEqual(listAlerts().map((a) => a.id), ['a', 'novo'])
  assert.equal(listAlerts()[0].lastPrice, 100)
})

test('alvo editado durante a checagem vale para a notificação', async () => {
  saveAlerts([alert({ targetPrice: 300 })])
  const { toasts, notify } = collectToasts()
  await checkAllAlerts({ notify, check: during(() => saveAlerts([alert({ targetPrice: 50 })])) })
  const [saved] = listAlerts()
  assert.equal(saved.targetPrice, 50)
  assert.equal(saved.lastPrice, 100)
  assert.deepEqual(toasts, [])
})

test('alerta pausado durante a checagem não recebe preço nem notifica', async () => {
  saveAlerts([alert()])
  const { toasts, notify } = collectToasts()
  await checkAllAlerts({ notify, check: during(() => saveAlerts([alert({ active: false })])) })
  const [saved] = listAlerts()
  assert.equal(saved.lastPrice, undefined)
  assert.deepEqual(toasts, [])
})
