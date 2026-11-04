import { useState } from 'react'
import { api } from './api.js'
import AirportInput from './AirportInput.jsx'
import OfferCard from './OfferCard.jsx'
import Filters from './Filters.jsx'
import { applyFilters, EMPTY_FILTERS } from './filtering.js'
import { nearbyNote } from './offerLabels.js'

function loadLastSearch() {
  try {
    return JSON.parse(localStorage.getItem('eva-last-search')) || null
  } catch {
    return null
  }
}

export default function SearchTab({ canVerify, canSky, verifyRemaining, onOpenFlex }) {
  const last = loadLastSearch()
  const [origin, setOrigin] = useState(last?.origin || null)
  const [destination, setDestination] = useState(last?.destination || null)
  const [originSeed, setOriginSeed] = useState(last?.origin ? { code: last.origin, text: last.originText } : null)
  const [destinationSeed, setDestinationSeed] = useState(
    last?.destination ? { code: last.destination, text: last.destinationText } : null
  )
  const [originText, setOriginText] = useState(last?.originText || '')
  const [destinationText, setDestinationText] = useState(last?.destinationText || '')
  const [departureDate, setDepartureDate] = useState(last?.departureDate || '')
  const [returnDate, setReturnDate] = useState(last?.returnDate || '')
  const [useSky, setUseSky] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [offers, setOffers] = useState(null)
  const [route, setRoute] = useState(null)
  const [nearby, setNearby] = useState([])
  const [verified, setVerified] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  async function runSearch(params) {
    setLoading(true)
    setError(null)
    try {
      const res = await api.flights({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        ...(params.returnDate ? { returnDate: params.returnDate } : {}),
        ...(params.useSky ? { useSkyscrapper: 'true' } : {}),
      })
      setOffers(res.data)
      setRoute({ origin: params.origin, destination: params.destination })
      setNearby(res.nearby || [])
      setVerified(res.verified || null)
      setWarnings(res.warnings || [])
      setFilters(EMPTY_FILTERS)
      localStorage.setItem(
        'eva-last-search',
        JSON.stringify({
          origin: params.origin,
          destination: params.destination,
          originText: params.originText,
          destinationText: params.destinationText,
          departureDate: params.departureDate,
          returnDate: params.returnDate || '',
        })
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function search(e) {
    e.preventDefault()
    if (!origin || !destination || !departureDate) {
      setError('Preencha origem, destino e data de ida (selecione da lista).')
      return
    }
    runSearch({ origin, destination, originText, destinationText, departureDate, returnDate, useSky })
  }

  function searchNearby(date) {
    setDepartureDate(date)
    runSearch({ origin, destination, originText, destinationText, departureDate: date, returnDate, useSky })
  }

  function swap() {
    setOrigin(destination)
    setDestination(origin)
    setOriginText(destinationText)
    setDestinationText(originText)
    setOriginSeed(destination ? { code: destination, text: destinationText } : null)
    setDestinationSeed(origin ? { code: origin, text: originText } : null)
  }

  async function favorite() {
    await api.addFavorite({ origin, destination, departureDate, returnDate: returnDate || null })
    alert('Rota salva nos favoritos.')
  }

  const visible = offers ? applyFilters(offers, filters) : null

  return (
    <div>
      <form className="search-form" onSubmit={search}>
        <AirportInput
          label="Origem"
          value={origin}
          seed={originSeed}
          onChange={(code, text) => {
            setOrigin(code)
            if (text) setOriginText(text)
          }}
        />
        <button type="button" className="btn ghost swap" onClick={swap} title="Inverter origem e destino">
          ⇄
        </button>
        <AirportInput
          label="Destino"
          value={destination}
          seed={destinationSeed}
          onChange={(code, text) => {
            setDestination(code)
            if (text) setDestinationText(text)
          }}
        />
        <div className="field">
          <label>Ida</label>
          <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Volta (opcional)</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </div>
        <button className="btn primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        {canSky && (
          <label className="checkbox">
            <input type="checkbox" checked={useSky} onChange={(e) => setUseSky(e.target.checked)} />
            incluir Sky-Scrapper (gasta quota RapidAPI)
          </label>
        )}
      </form>

      {error && <p className="error">{error}</p>}
      {warnings.map((w, i) => (
        <p className="warning" key={i}>{w}</p>
      ))}

      {loading && (
        <div className="results">
          {[0, 1, 2].map((i) => (
            <div className="offer skeleton" key={i} />
          ))}
        </div>
      )}

      {!loading && offers && offers.length > 0 && (
        <div className="results">
          {verified && (
            <p className="verify-summary">
              ✓ Rota conferida no Google Flights: a partir de{' '}
              <span className="mono">
                R$ {verified.livePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>{' '}
              ({verified.delta > 0 ? '+' : ''}
              {verified.delta}% vs o menor preço do cache).
            </p>
          )}
          <Filters offers={offers} filters={filters} onChange={setFilters} />
          <p className="disclaimer">
            {visible.length} de {offers.length} oferta(s) (por adulto). Preço final é confirmado no
            site de compra.
          </p>
          {visible.map((offer, i) => (
            <OfferCard
              key={i}
              offer={offer}
              route={route}
              onFavorite={favorite}
              canVerify={canVerify}
              verifyRemaining={verifyRemaining}
              routeVerified={verified}
            />
          ))}
          {visible.length === 0 && (
            <div className="empty">
              Nenhuma oferta passa nesses filtros.{' '}
              <button className="chip" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && offers && offers.length === 0 && (
        <div className="empty">
          <p>Nada no cache pra essa rota e data — isso não significa que não existam voos.</p>
          {nearby.length > 0 && (
            <>
              <p className="disclaimer">{nearbyNote(nearby, returnDate)}</p>
              <div className="nearby-grid">
                {nearby.map((n, i) => (
                  <button key={i} className="nearby-card" onClick={() => searchNearby(n.departureDate)}>
                    <span className="nearby-date">{n.departureDate}</span>
                    <span className="nearby-price mono">
                      R$ {n.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {onOpenFlex && origin && destination && departureDate && (
            <button
              className="btn alt"
              onClick={() =>
                onOpenFlex({ origin, destination, originText, destinationText, month: departureDate.slice(0, 7) })
              }
            >
              Ver o mês inteiro (datas flexíveis)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
