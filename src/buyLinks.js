// Amadeus Self-Service não fornece deep-link de compra.
// Geramos links pra páginas confiáveis: Google Flights e site oficial da companhia.

const AIRLINE_SITES = {
  G3: { name: 'GOL', url: 'https://www.voegol.com.br' },
  AD: { name: 'Azul', url: 'https://www.voeazul.com.br' },
  LA: { name: 'LATAM', url: 'https://www.latamairlines.com/br/pt' },
  JJ: { name: 'LATAM', url: 'https://www.latamairlines.com/br/pt' },
  TP: { name: 'TAP', url: 'https://www.flytap.com/pt-br' },
  AF: { name: 'Air France', url: 'https://www.airfrance.com.br' },
  KL: { name: 'KLM', url: 'https://www.klm.com.br' },
  LH: { name: 'Lufthansa', url: 'https://www.lufthansa.com/br/pt' },
  BA: { name: 'British Airways', url: 'https://www.britishairways.com' },
  IB: { name: 'Iberia', url: 'https://www.iberia.com/br' },
  UX: { name: 'Air Europa', url: 'https://www.aireuropa.com' },
  AA: { name: 'American Airlines', url: 'https://www.aa.com' },
  DL: { name: 'Delta', url: 'https://www.delta.com' },
  UA: { name: 'United', url: 'https://www.united.com' },
  CM: { name: 'Copa', url: 'https://www.copaair.com' },
  AV: { name: 'Avianca', url: 'https://www.avianca.com' },
  AR: { name: 'Aerolíneas Argentinas', url: 'https://www.aerolineas.com.ar' },
  EK: { name: 'Emirates', url: 'https://www.emirates.com/br' },
  QR: { name: 'Qatar Airways', url: 'https://www.qatarairways.com' },
  TK: { name: 'Turkish Airlines', url: 'https://www.turkishairlines.com' },
}

export function googleFlightsUrl({ origin, destination, departureDate, returnDate }) {
  const q = returnDate
    ? `Flights from ${origin} to ${destination} on ${departureDate} through ${returnDate}`
    : `Flights from ${origin} to ${destination} on ${departureDate}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}

export function airlineSite(carrierCode) {
  return AIRLINE_SITES[carrierCode] || null
}
