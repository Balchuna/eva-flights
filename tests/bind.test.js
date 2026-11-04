import { useTempData } from './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer } from './helpers/server.js'

test('servidor só aceita conexão da própria máquina', async () => {
  const temp = useTempData()
  const running = await startTestServer()
  assert.equal(running.server.address().address, '127.0.0.1')
  await running.close()
  temp.cleanup()
})

test('proxy do Vite aponta para o mesmo endereço do servidor', async () => {
  const { default: config } = await import('../vite.config.js')
  assert.equal(config.server.proxy['/api'], 'http://127.0.0.1:3001')
})
