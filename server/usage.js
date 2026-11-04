import { read, write } from './store.js'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function trackCall(source) {
  const usage = read('usage', {})
  const month = currentMonth()
  if (usage.month !== month) {
    usage.month = month
    usage.calls = {}
  }
  usage.calls = usage.calls || {}
  usage.calls[source] = (usage.calls[source] || 0) + 1
  write('usage', usage)
}

export function getUsage() {
  const usage = read('usage', {})
  if (usage.month !== currentMonth()) return { month: currentMonth(), calls: {} }
  return usage
}

// Limites free-tier mensais. serpapi tem sub-orçamento para auto-verificação (~50%).
export const LIMITS = { serpapi: 100, skyscrapper: 100 }
const AUTO_VERIFY_BUDGET = 50

export function remaining(source) {
  const limit = LIMITS[source]
  if (!limit) return Infinity
  return Math.max(0, limit - (getUsage().calls?.[source] || 0))
}

export function canCall(source, cost = 1) {
  return remaining(source) >= cost
}

// A verificação automática só pode gastar até AUTO_VERIFY_BUDGET chamadas/mês,
// preservando o resto da quota para cliques manuais.
export function canAutoVerify() {
  const usage = getUsage()
  const auto = usage.calls?.['serpapi-auto'] || 0
  return auto < AUTO_VERIFY_BUDGET && canCall('serpapi')
}
