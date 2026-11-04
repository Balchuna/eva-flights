import './helpers/setup.js'
import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { enabled as fastFlightsEnabled } from '../server/providers/fastflights.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const example = dotenv.parse(readFileSync(path.join(ROOT, '.env.example')))

function serverSources() {
  return readdirSync(path.join(ROOT, 'server'), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => ({
      name: path.relative(ROOT, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'),
      text: readFileSync(path.join(entry.parentPath, entry.name), 'utf8'),
    }))
}

afterEach(() => {
  delete process.env.FASTFLIGHTS_DISABLED
})

test('.env.example lista toda variável lida pelo servidor', () => {
  const used = new Set(serverSources().flatMap(({ text }) => [...text.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1])))
  const missing = [...used].filter((name) => !(name in example))
  assert.deepEqual(missing, [])
})

test('.env.example não traz nenhum valor de chave', () => {
  for (const name of ['TRAVELPAYOUTS_TOKEN', 'TRAVELPAYOUTS_MARKER', 'SERPAPI_KEY', 'RAPIDAPI_KEY']) {
    assert.equal(example[name], '', name)
  }
})

test('.env.example deixa fast-flights desligado e demo desligado', () => {
  assert.equal(example.FASTFLIGHTS_DISABLED, 'true')
  assert.equal(example.DEMO_MODE, 'false')
})

test('só server/index.js carrega o .env', () => {
  const loaders = serverSources()
    .filter(({ text }) => text.includes('dotenv'))
    .map(({ name }) => name)
  assert.deepEqual(loaders, ['server/index.js'])
})

test('fast-flights fica desligado sem configuração', () => {
  assert.equal(fastFlightsEnabled(), false)
})

test('fast-flights fica desligado com FASTFLIGHTS_DISABLED=true', () => {
  process.env.FASTFLIGHTS_DISABLED = 'true'
  assert.equal(fastFlightsEnabled(), false)
})

test('fast-flights só liga com FASTFLIGHTS_DISABLED=false', () => {
  process.env.FASTFLIGHTS_DISABLED = 'false'
  assert.equal(fastFlightsEnabled(), true)
})
