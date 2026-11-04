import { useEffect, useState } from 'react'
import { api } from './api.js'
import AirportInput from './AirportInput.jsx'
import PriceHistory from './PriceHistory.jsx'

export default function AlertsTab() {
  const [alerts, setAlerts] = useState([])
  const [origin, setOrigin] = useState(null)
  const [destination, setDestination] = useState(null)
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.alerts().then(setAlerts).catch(() => {})
  }, [])

  async function add(e) {
    e.preventDefault()
    if (!origin || !destination || !departureDate || !targetPrice) {
      setError('Preencha origem, destino, data e preço alvo.')
      return
    }
    setError(null)
    setAlerts(
      await api.addAlert({
        origin,
        destination,
        departureDate,
        returnDate: returnDate || null,
        targetPrice,
      })
    )
  }

  async function checkNow() {
    setChecking(true)
    setError(null)
    try {
      setAlerts(await api.checkAlerts())
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <p className="disclaimer">
        Checagem periódica (6h por padrão, ajustável no .env) + vigília em horários fixos (inclusive
        de madrugada), enquanto o app está aberto. Toast do Windows quando o preço atinge o alvo.
      </p>
      <details className="note">
        <summary>Sobre o "reset de preços na madrugada"</summary>
        <p>
          O reset à meia-noite é mito: companhias reprecificam continuamente por demanda. O grão de
          verdade: cargas de tarifas promocionais e liberação de assentos baratos não vendidos
          acontecem às vezes entre ~1h e 5h, sem garantia. Em vez de prometer, o Eva Flights mede:
          a vigília registra o preço por faixa horária e a tabela de cada alerta mostra se a
          madrugada rende menor preço nas tuas rotas.
        </p>
      </details>
      <form className="search-form" onSubmit={add}>
        <AirportInput label="Origem" value={origin} onChange={setOrigin} />
        <AirportInput label="Destino" value={destination} onChange={setDestination} />
        <div className="field">
          <label>Ida</label>
          <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Volta (opcional)</label>
          <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </div>
        <div className="field small">
          <label>Preço alvo (R$)</label>
          <input type="number" min="1" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} />
        </div>
        <button className="btn primary">Criar alerta</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="list-header">
        <h3>Alertas</h3>
        <button className="btn ghost" onClick={checkNow} disabled={checking}>
          {checking ? 'Checando…' : 'Checar agora'}
        </button>
      </div>

      {alerts.length === 0 && <div className="empty">Nenhum alerta ainda. Crie um acima.</div>}
      {alerts.map((a) => (
        <div className="row-card column" key={a.id}>
          <div className="row-card-main">
            <div>
              <strong>
                {a.origin} → {a.destination}
              </strong>{' '}
              · {a.departureDate}
              {a.returnDate ? ` ⇄ ${a.returnDate}` : ''} · alvo{' '}
              <span className="mono">R$ {a.targetPrice}</span>
              {!a.active && <span className="badge age">pausado</span>}
              {a.notified && <span className="badge hit">alvo atingido</span>}
              <div className="meta">
                {a.lastPrice != null
                  ? `Último preço: R$ ${a.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${a.lastChecked?.slice(0, 16).replace('T', ' ')})`
                  : 'Ainda não checado'}
              </div>
            </div>
            <div className="row-actions">
              <button
                className="btn ghost"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              >
                {expanded === a.id ? 'Fechar histórico' : 'Histórico'}
              </button>
              <button
                className="btn ghost"
                onClick={async () => setAlerts(await api.patchAlert(a.id, { active: !a.active }))}
              >
                {a.active ? 'Pausar' : 'Retomar'}
              </button>
              <button className="btn danger" onClick={async () => setAlerts(await api.removeAlert(a.id))}>
                Excluir
              </button>
            </div>
          </div>
          {expanded === a.id && <PriceHistory history={a.history} />}
        </div>
      ))}
    </div>
  )
}
