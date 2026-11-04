// Amadeus Self-Service não fornece deep-link de compra.
// Geramos links pra páginas confiáveis: Google Flights e site oficial da companhia.
import { AIRLINES, canonicalAirline } from '../shared/airlines.js'

export function googleFlightsUrl({ origin, destination, departureDate, returnDate }) {
  const q = returnDate
    ? `Flights from ${origin} to ${destination} on ${departureDate} through ${returnDate}`
    : `Flights from ${origin} to ${destination} on ${departureDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function airlineSite(carrier) {
  return AIRLINES[canonicalAirline(carrier)] || null
}
