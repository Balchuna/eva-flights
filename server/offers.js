function dedupeKey(offer) {
  return `${offer.airline || '?'}:${offer.flightNumber || '?'}:${(offer.departureAt || '').slice(0, 16)}`
}

export function mergeOffers(offers) {
  const seen = new Map()
  for (const offer of offers) {
    const key = dedupeKey(offer)
    const prev = seen.get(key)
    if (!prev || offer.price < prev.price) seen.set(key, offer)
  }
  return [...seen.values()].sort((a, b) => a.price - b.price)
}

// Calculada na resposta, não na busca: a oferta pode ficar até 3h no cache em memória
export function withConfidence(offer, now = new Date()) {
  if (offer.live) return { ...offer, ageHours: 0, confidence: 'live' }
  if (!offer.foundAt) return { ...offer, ageHours: null, confidence: 'stale' }
  const ageHours = Math.max(0, (now - new Date(offer.foundAt)) / 3600_000)
  return {
    ...offer,
    ageHours: Math.round(ageHours),
    confidence: ageHours < 24 ? 'fresh' : ageHours > 72 ? 'stale' : 'cache',
  }
}

export function buildVerification(offers, check, now = new Date()) {
  if (check.cheapest == null) return null
  const cachePrice = offers[0].price
  return {
    at: now.toISOString(),
    cachePrice,
    livePrice: check.cheapest,
    delta: Math.round(((check.cheapest - cachePrice) / cachePrice) * 100),
    googleUrl: check.googleUrl,
  }
}
