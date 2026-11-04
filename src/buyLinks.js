// Links para páginas confiáveis quando a oferta não traz link de compra próprio:
// Google Flights e site oficial da companhia.
import { AIRLINES, canonicalAirline } from '../shared/airlines.js'

// /v2/prices/latest só responde por cidade (SAO, RIO): conferir o preço e abrir o Google
// valem para a rota que o usuário pediu, igual à verificação automática do servidor
export function offerSearch(offer, route) {
  return {
    origin: route?.origin || offer.origin,
    destination: route?.destination || offer.destination,
    departureDate: offer.departureAt?.slice(0, 10),
    returnDate: offer.returnAt?.slice(0, 10) || undefined,
  }
}

export function googleFlightsUrl({ origin, destination, departureDate, returnDate }) {
  const q = returnDate
    ? `Flights from ${origin} to ${destination} on ${departureDate} through ${returnDate}`
    : `Flights from ${origin} to ${destination} on ${departureDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function airlineSite(carrier) {
  return AIRLINES[canonicalAirline(carrier)] || null
}
