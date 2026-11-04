import { airlineSite } from './buyLinks.js'

export const CONFIDENCE = {
  live: { label: 'Vivo', title: 'Resultado de busca real, feita há menos de 10 minutos' },
  fresh: { label: 'Recente', title: 'Visto há menos de 24h' },
  cache: { label: 'Cache', title: 'Preço de cache — pode ter mudado' },
  unknown: { label: 'Idade desconhecida', title: 'A fonte não informou quando viu este preço — confirme antes de confiar' },
  stale: { label: 'Antigo', title: 'Visto há mais de 72h — confirme antes de confiar' },
}

export function carrierName(carrier) {
  return airlineSite(carrier)?.name || carrier
}

function fmtDuration(min) {
  if (min == null) return null
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}min`
}

export function stopsLabel(n) {
  if (n == null) return null
  return n === 0 ? 'direto' : `${n} escala${n > 1 ? 's' : ''}`
}

function sellerLabel({ airline, gate }) {
  if (airline) return carrierName(airline)
  return gate ? `via ${gate}` : null
}

// Só o código forma o número do voo (G39101); um nome por extenso já aparece ao lado
function flightLabel({ airline, flightNumber }) {
  if (!flightNumber) return null
  return `voo ${airlineSite(airline) ? airline : ''}${flightNumber}`
}

export function offerMeta(offer) {
  return [sellerLabel(offer), flightLabel(offer), stopsLabel(offer.transfers), fmtDuration(offer.durationMinutes)]
    .filter(Boolean)
    .join(' · ')
}
