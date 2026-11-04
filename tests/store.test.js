import { useTempData } from './helpers/setup.js'
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { read, write } from '../server/store.js'

let temp

afterEach(() => {
  temp?.cleanup()
  delete process.env.DEMO_MODE
})

test('grava e lê na pasta de EVA_DATA_DIR', () => {
  temp = useTempData()
  write('exemplo', { ok: true })
  assert.ok(existsSync(path.join(temp.dir, 'exemplo.json')))
  assert.deepEqual(read('exemplo', null), { ok: true })
})

test('lê o valor padrão quando o arquivo não existe', () => {
  temp = useTempData()
  assert.deepEqual(read('nada', []), [])
})
