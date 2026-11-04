function departureMinute(offer) {
  return (offer.departureAt || '').slice(0, 16)
}

function returnDay(offer) {
  return (offer.returnAt || '').slice(0, 10)
}

function seller(offer) {
  return offer.airline || (offer.gate ? `agência:${offer.gate}` : null)
}

// Companhia e partida iguais, e o número do voo quando as duas fontes dão. Sem número
// (fast-flights e Sky-Scrapper não dão), a data da volta separa viagens diferentes.
function sameFlight(a, b) {
  if (!seller(a) || seller(a) !== seller(b)) return false
  if (!departureMinute(a) || departureMinute(a) !== departureMinute(b)) return false
  if (a.flightNumber && b.flightNumber) return String(a.flightNumber) === String(b.flightNumber)
  return returnDay(a) === returnDay(b)
}

export function mergeOffers(offers) {
  const kept = []
  for (const offer of [...offers].sort((a, b) => a.price - b.price)) {
    if (!kept.some((other) => sameFlight(offer, other))) kept.push(offer)
  }
  return kept
}

const LIVE_HOURS = 10 / 60

// Calculada na resposta, não na busca: a oferta pode ficar até 3h no cache em memória,
// então "viva" só vale nos primeiros minutos
export function withConfidence(offer, now = new Date()) {
  if (!offer.foundAt) return { ...offer, ageHours: null, confidence: 'stale' }
  const ageHours = Math.max(0, (now - new Date(offer.foundAt)) / 3600_000)
  if (offer.live && ageHours < LIVE_HOURS) return { ...offer, ageHours: 0, confidence: 'live' }
  return {
    ...offer,
    ageHours: Math.round(ageHours),
    confidence: ageHours < 24 ? 'fresh' : ageHours > 72 ? 'stale' : 'cache',
  }
}

// Comparar o Google com outra fonte viva não diz nada sobre o cache
export function cachePriceOf(offers) {
  return offers.find((offer) => offer.source === 'travelpayouts' && offer.price > 0)?.price ?? null
}

export function buildVerification(offers, check, now = new Date()) {
  const cachePrice = cachePriceOf(offers)
  if (check.cheapest == null || cachePrice == null) return null
  return {
    at: now.toISOString(),
    cachePrice,
    livePrice: check.cheapest,
    delta: Math.round(((check.cheapest - cachePrice) / cachePrice) * 100),
    googleUrl: check.googleUrl,
  }
}
