import { useEffect, useState } from 'react'
import { api } from './api.js'
import AirportInput from './AirportInput.jsx'
import { googleFlightsUrl } from './buyLinks.js'

export default function FlexTab({ prefill }) {
  const [origin, setOrigin] = useState(prefill?.origin || null)
  const [destination, setDestination] = useState(prefill?.destination || null)
  const [month, setMonth] = useState(prefill?.month || '')
  const originSeed = prefill?.origin ? { code: prefill.origin, text: prefill.originText } : null
  const destinationSeed = prefill?.destination
    ? { code: prefill.destination, text: prefill.destinationText }
    : null

  useEffect(() => {
    if (prefill) {
      setOrigin(prefill.origin || null)
      setDestination(prefill.destination || null)
      setMonth(prefill.month || '')
    }
  }, [prefill])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!origin || !destination || !month) {
      setError('Preencha origem, destino e o mês.')
      return
    }
    setLoading(true)
    setError(null)
    setRows(null)
    try {
      const res = await api.flex({ origin, destination, month })
      setRows(res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cheapest = rows?.length ? Math.min(...rows.map((r) => r.price)) : null

  return (
    <div>
      <p className="disclaimer">
        Menor preço por dia do mês (1 chamada só, cache Aviasales). Dias sem dados não aparecem.
      </p>
      <form className="search-form" onSubmit={search}>
        <AirportInput label="Origem" value={origin} seed={originSeed} onChange={setOrigin} />
        <AirportInput label="Destino" value={destination} seed={destinationSeed} onChange={setDestination} />
        <div className="field">
          <label>Mês</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button className="btn primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Ver preços do mês'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {rows && rows.length === 0 && <p>Sem dados de cache pra essa rota nesse mês.</p>}

      {rows && rows.length > 0 && (
        <table className="flex-table">
          <thead>
            <tr>
              <th>Ida</th>
              <th>Volta</th>
              <th>Escalas</th>
              <th>Menor preço</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.price === cheapest ? 'cheapest' : ''}>
                <td>{r.departureDate}</td>
                <td>{r.returnDate || '—'}</td>
                <td>{r.transfers ?? '—'}</td>
                <td>R$ {r.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>
                  <a
                    className="btn buy small-btn"
                    href={googleFlightsUrl({
                      origin,
                      destination,
                      departureDate: r.departureDate,
                      returnDate: r.returnDate,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Comprar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
