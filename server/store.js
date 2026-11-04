import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')

function fileFor(name) {
  return path.join(DATA_DIR, `${name}.json`)
}

export function read(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(fileFor(name), 'utf8'))
  } catch {
    return fallback
  }
}

export function write(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(fileFor(name), JSON.stringify(value, null, 2))
}
