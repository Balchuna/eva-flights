import { useState } from 'react'
import { api } from './api.js'
import { googleFlightsUrl, airlineSite } from './buyLinks.js'

const SOURCE_LABELS = {
  travelpayouts: 'Aviasales · cache',
  skyscrapper: 'Skyscanner',
  google: 'Google Flights',
  'google-live': 'Google Flights',
}

function fmtDateTime(iso) {
  return iso ? iso.slice(0, 16).replace('T', ' ') : ''
}

function fmtDuration(min) {
  if (min == null) return null
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}min`
}

function stopsLabel(n) {
  if (n == null) return null
  return n === 0 ? 'direto' : `${n} escala${n > 1 ? 's' : ''}`
}

function priceAge(foundAt) {
  if (!foundAt) return null
  const hours = Math.round((Date.now() - new Date(foundAt).getTime()) / 3600_000)
  if (hours < 1) return 'visto há menos de 1h'
  if (hours < 48) return `visto há ${hours}h`
  return `visto há ${Math.round(hours / 24)} dias`
}

function fmtBRL(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const CONFIDENCE = {
  live: { label: 'Vivo', title: 'Resultado de busca real, feita há menos de 10 minutos' },
  fresh: { label: 'Recente', title: 'Visto há menos de 24h' },
  cache: { label: 'Cache', title: 'Preço de cache — pode ter mudado' },
  stale: { label: 'Antigo', title: 'Visto há mais de 72h — confirme antes de confiar' },
}

export default function OfferCard({ offer, onFavorite, canVerify, verifyRemaining, routeVerified }) {
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(null)
  const [verifyError, setVerifyError] = useState(null)

  const airline = airlineSite(offer.airline)
  const search = {
    origin: offer.origin,
    destination: offer.destination,
    departureDate: offer.departureAt?.slice(0, 10),
    returnDate: offer.returnAt?.slice(0, 10) || undefined,
  }
  const age = priceAge(offer.foundAt)

  async function verify() {
    setVerifying(true)
    setVerifyError(null)
    try {
      setVerified(await api.verify(search))
    } catch (e) {
      setVerifyError(e.message)
    } finally {
      setVerifying(false)
    }
  }

  return (
    <article className="offer">
      <div className="offer-info">
        <div className="offer-tags">
          <span className={`badge src-${offer.source}`}>
            {SOURCE_LABELS[offer.source] || offer.source}
          </span>
          {offer.confidence && (
            <span className={`badge conf-${offer.confidence}`} title={CONFIDENCE[offer.confidence]?.title}>
              {CONFIDENCE[offer.confidence]?.label}
            </span>
          )}
          {age && <span className="badge age">{age}</span>}
          {routeVerified && (
            <span
              className="badge verified"
              title={`Google Flights conferido: R$ ${fmtBRL(routeVerified.livePrice)} (${routeVerified.delta > 0 ? '+' : ''}${routeVerified.delta}%)`}
            >
              ✓ rota conferida
            </span>
          )}
        </div>
        <div className="itinerary">
          <span className="route">
            {offer.origin} <span className="arrow">→</span> {offer.destination}
            <span className="when">{fmtDateTime(offer.departureAt)}</span>
          </span>
          <span className="meta">
            {[
              airline ? airline.name : offer.airline,
              offer.flightNumber ? `voo ${offer.airline}${offer.flightNumber}` : null,
              stopsLabel(offer.transfers),
              fmtDuration(offer.durationMinutes),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
        {offer.returnAt && (
          <div className="itinerary">
            <span className="route">
              {offer.destination} <span className="arrow">→</span> {offer.origin}
              <span className="when">{fmtDateTime(offer.returnAt)}</span>
            </span>
            {offer.returnTransfers != null && (
              <span className="meta">volta: {stopsLabel(offer.returnTransfers)}</span>
            )}
          </div>
        )}
        {verified && (
          <div className="verify-panel">
            <strong>Google Flights agora:</strong>{' '}
            {verified.cheapest != null ? (
              <>
                a partir de <span className="mono">R$ {fmtBRL(verified.cheapest)}</span>
                {verified.priceInsights?.priceLevel && <> · nível: {verified.priceInsights.priceLevel}</>}
                <span className="verify-note">
                  vs R$ {fmtBRL(offer.price)} no cache. O preço vivo é o que vale.
                </span>
              </>
            ) : (
              'sem resultados pra essa combinação'
            )}
          </div>
        )}
        {verifyError && <div className="verify-panel error-text">{verifyError}</div>}
      </div>
      <div className="offer-actions">
        <div className="price mono">R$ {fmtBRL(offer.price)}</div>
        {offer.buyUrl && (
          <a className="btn buy" href={offer.buyUrl} target="_blank" rel="noopener noreferrer">
            Comprar no Aviasales
          </a>
        )}
        {canVerify && (
          <button className="btn alt" onClick={verify} disabled={verifying}>
            {verifying
              ? 'Consultando Google…'
              : `Verificar preço real${verifyRemaining != null ? ` (${verifyRemaining} restam)` : ''}`}
          </button>
        )}
        <a className="btn ghost" href={googleFlightsUrl(search)} target="_blank" rel="noopener noreferrer">
          Google Flights
        </a>
        {airline && (
          <a className="btn ghost" href={airline.url} target="_blank" rel="noopener noreferrer">
            Site da {airline.name}
          </a>
        )}
        {onFavorite && (
          <button className="btn ghost" onClick={onFavorite}>
            Favoritar rota
          </button>
        )}
      </div>
    </article>
  )
}
