import { airlineSite } from './buyLinks.js'

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
