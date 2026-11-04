// Importar este arquivo primeiro em todo teste: bloqueia rede externa, remove chaves
// do ambiente e oferece uma pasta de dados temporária.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const realFetch = globalThis.fetch

export const blockedRequests = []

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.hostname === '127.0.0.1') return realFetch(input, init)
  blockedRequests.push(url.origin + url.pathname)
  throw new Error(`Rede bloqueada no teste: ${url.origin}`)
}

for (const name of [
  'TRAVELPAYOUTS_TOKEN',
  'TRAVELPAYOUTS_MARKER',
  'SERPAPI_KEY',
  'RAPIDAPI_KEY',
  'FASTFLIGHTS_DISABLED',
  'DEMO_MODE',
]) {
  delete process.env[name]
}

export function useTempData() {
  const dir = mkdtempSync(path.join(tmpdir(), 'eva-flights-'))
  process.env.EVA_DATA_DIR = dir
  return {
    dir,
    cleanup() {
      delete process.env.EVA_DATA_DIR
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
