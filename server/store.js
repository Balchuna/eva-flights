import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Resolvido a cada acesso: testes usam pasta temporária e o demo não toca nos dados reais
function dataDir() {
  if (process.env.EVA_DATA_DIR) return process.env.EVA_DATA_DIR
  return process.env.DEMO_MODE === 'true' ? path.join(ROOT, 'data', 'demo') : path.join(ROOT, 'data')
}

function fileFor(name) {
  return path.join(dataDir(), `${name}.json`)
}

export function read(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(name), 'utf8'))
  } catch {
    return fallback
  }
}

export function write(name, value) {
  fs.mkdirSync(dataDir(), { recursive: true })
  fs.writeFileSync(fileFor(name), JSON.stringify(value, null, 2))
}
