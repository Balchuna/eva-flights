import { useEffect, useState } from 'react'
import { api } from './api.js'
import SearchTab from './SearchTab.jsx'
import FlexTab from './FlexTab.jsx'
import AlertsTab from './AlertsTab.jsx'
import SavedTab from './SavedTab.jsx'
import InfoBanner from './InfoBanner.jsx'

const TABS = [
  { id: 'search', label: 'Buscar' },
  { id: 'flex', label: 'Datas flexíveis' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'saved', label: 'Salvos' },
]

const SOURCE_NAMES = {
  travelpayouts: 'Aviasales',
  serpapi: 'Google (SerpAPI)',
  skyscrapper: 'Skyscanner',
  fastflights: 'Google (vivo)',
}

const OFF_REASON = {
  fastflights: 'desligado por padrão; FASTFLIGHTS_DISABLED=false no .env liga',
}

export default function App() {
  const [tab, setTab] = useState('search')
  const [status, setStatus] = useState(null)
  const [flexPrefill, setFlexPrefill] = useState(null)

  function openFlex(prefill) {
    setFlexPrefill(prefill)
    setTab('flex')
  }

  useEffect(() => {
    const load = () => api.sources().then(setStatus).catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const sources = status?.sources || {}
  const usage = status?.usage?.calls || {}

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M2 16l20-9-7 9 2 5-4-3-6 4 2-6-7 0z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div>
            <h1>Eva Flights</h1>
            <span className="tagline">caçador local de tarifas</span>
          </div>
        </div>
        <div className="source-pills">
          {Object.entries(SOURCE_NAMES).map(([key, name]) => (
            <span key={key} className={sources[key] ? 'pill on' : 'pill off'} title={sources[key] ? `${usage[key] || 0} chamadas este mês` : OFF_REASON[key] || 'sem key no .env'}>
              {name}
              {sources[key] && usage[key] ? ` · ${usage[key]}` : ''}
            </span>
          ))}
        </div>
      </header>
      <nav>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        <InfoBanner />
        {tab === 'search' && (
          <SearchTab
            canVerify={Boolean(sources.serpapi)}
            canSky={Boolean(sources.skyscrapper)}
            verifyRemaining={status?.remaining?.serpapi}
            onOpenFlex={openFlex}
          />
        )}
        {tab === 'flex' && <FlexTab prefill={flexPrefill} />}
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'saved' && <SavedTab />}
      </main>
      <footer>
        Preços do cache Aviasales são referência, não cotação viva. A compra acontece sempre em
        site externo confiável (Aviasales, Google Flights ou a companhia) e o preço final é o de
        lá.
      </footer>
    </div>
  )
}
