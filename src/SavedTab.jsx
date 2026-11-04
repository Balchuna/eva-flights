import { useEffect, useState } from 'react'
import { api } from './api.js'
import { googleFlightsUrl } from './buyLinks.js'

export default function SavedTab() {
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])

  useEffect(() => {
    api.favorites().then(setFavorites).catch(() => {})
    api.history().then(setHistory).catch(() => {})
  }, [])

  return (
    <div>
      <h3>Rotas favoritas</h3>
      {favorites.length === 0 && <p>Nenhuma favorita. Salve a partir de uma busca.</p>}
      {favorites.map((f) => (
        <div className="row-card" key={f.id}>
          <div>
            <strong>
              {f.origin} → {f.destination}
            </strong>{' '}
            · {f.departureDate}
            {f.returnDate ? ` ⇄ ${f.returnDate}` : ''}
          </div>
          <div className="row-actions">
            <a
              className="btn buy small-btn"
              href={googleFlightsUrl(f)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Flights
            </a>
            <button
              className="btn danger"
              onClick={async () => setFavorites(await api.removeFavorite(f.id))}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}

      <div className="list-header">
        <h3>Histórico de buscas</h3>
        {history.length > 0 && (
          <button
            className="btn ghost"
            onClick={async () => {
              await api.clearHistory()
              setHistory([])
            }}
          >
            Limpar
          </button>
        )}
      </div>
      {history.length === 0 && <p>Nenhuma busca ainda.</p>}
      {history.map((h, i) => (
        <div className="row-card" key={i}>
          <div>
            <strong>
              {h.origin} → {h.destination}
            </strong>{' '}
            · {h.departureDate}
            {h.returnDate ? ` ⇄ ${h.returnDate}` : ''}
            <div className="meta">
              {h.at.slice(0, 16).replace('T', ' ')}
              {h.cheapest != null &&
                ` · menor preço: R$ ${h.cheapest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
