import notifier from 'node-notifier'
import { getProviders, isDemo } from './providers/index.js'
import { read, write } from './store.js'

export function alertTitle() {
  return `${isDemo() ? '[DEMO] ' : ''}Eva Flights — preço atingido!`
}

export function listAlerts() {
  return read('alerts', [])
}

export function saveAlerts(alerts) {
  write('alerts', alerts)
}

export async function checkAlert(alert) {
  const offers = await getProviders().travelpayouts.searchFlights({
    origin: alert.origin,
    destination: alert.destination,
    departureDate: alert.departureDate,
    returnDate: alert.returnDate || undefined,
    limit: 3,
  })
  if (!offers.length) return null
  return Math.min(...offers.map((o) => o.price))
}

function applyPrice(alert, price, notify) {
  alert.history = alert.history || []
  alert.history.push({ date: new Date().toISOString(), price })
  alert.lastPrice = price
  alert.lastChecked = new Date().toISOString()
  if (price <= alert.targetPrice && !alert.notified) {
    alert.notified = true
    alert.triggeredAt = new Date().toISOString()
    notify({
      title: alertTitle(),
      message: `${alert.origin} → ${alert.destination} por R$ ${price.toFixed(2)} (alvo R$ ${alert.targetPrice})`,
    })
  } else if (price > alert.targetPrice) {
    alert.notified = false
  }
}

export async function checkAllAlerts({ notify = (toast) => notifier.notify(toast), check = checkAlert } = {}) {
  for (const alert of listAlerts()) {
    if (!alert.active) continue
    try {
      const price = await check(alert)
      if (price == null) continue
      // Relê depois da rede: enquanto a checagem esperava, a API pode ter excluído, pausado,
      // editado ou criado alertas, e gravar a lista antiga desfaria isso
      const current = listAlerts()
      const fresh = current.find((a) => a.id === alert.id)
      if (!fresh?.active) continue
      applyPrice(fresh, price, notify)
      saveAlerts(current)
    } catch (e) {
      console.error(`Alerta ${alert.origin}→${alert.destination}: ${e.message}`)
    }
  }
  return listAlerts()
}

// Vigília noturna: além do intervalo padrão, checa em horários fixos (WATCH_HOURS)
// pra registrar como o preço se comporta por faixa horária — inclusive na madrugada.
export function startAlertLoop() {
  const intervalHours = Number(process.env.ALERT_CHECK_HOURS) || 6
  const watchHours = (process.env.WATCH_HOURS || '2,4,9,14,20')
    .split(',')
    .map((h) => Number(h.trim()))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
  console.log(
    `Alertas: a cada ${intervalHours}h + vigília nos horários ${watchHours.join('h, ')}h (enquanto o server estiver aberto)`
  )

  setInterval(() => {
    checkAllAlerts().catch((e) => console.error('Loop de alertas:', e.message))
  }, intervalHours * 3600_000)

  let lastWatchedHour = null
  setInterval(() => {
    const hour = new Date().getHours()
    if (hour !== lastWatchedHour && watchHours.includes(hour)) {
      lastWatchedHour = hour
      checkAllAlerts().catch((e) => console.error('Vigília de alertas:', e.message))
    }
    if (hour !== lastWatchedHour && !watchHours.includes(hour)) lastWatchedHour = null
  }, 15 * 60_000)
}
