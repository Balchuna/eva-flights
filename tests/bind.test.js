import { useTempData } from './helpers/setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startTestServer } from './helpers/server.js'

test('servidor só aceita conexão da própria máquina', async (t) => {
  const temp = useTempData()
  const running = await startTestServer()
  // No after, para o servidor fechar mesmo se a asserção falhar: aberto, o node --test não termina
  t.after(async () => {
    await running.close()
    temp.cleanup()
  })
  assert.equal(running.server.address().address, '127.0.0.1')
})

test('proxy do Vite aponta para o mesmo endereço do servidor', async () => {
  const { default: config } = await import('../vite.config.js')
  assert.equal(config.server.proxy['/api'], 'http://127.0.0.1:3001')
})
