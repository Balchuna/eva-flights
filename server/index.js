import 'dotenv/config'
import { createApp, startServer } from './app.js'
import { activeSources, isDemo } from './providers/index.js'
import { startAlertLoop } from './alerts.js'

const port = Number(process.env.PORT) || 3001
startServer(createApp(), port, () => {
  const active = Object.entries(activeSources())
    .filter(([, on]) => on)
    .map(([k]) => k)
  console.log(`Eva Flights server em http://127.0.0.1:${port} (fontes ativas: ${active.join(', ') || 'nenhuma — configure o .env'})`)
  if (isDemo()) console.log('Modo demo: preços fictícios, nenhuma chamada externa, dados em data/demo')
  startAlertLoop()
})
