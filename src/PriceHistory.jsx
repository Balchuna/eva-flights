// Mini-gráfico SVG de preço × tempo + menor preço por faixa horária.
// Serve pra testar empiricamente o "mito da madrugada" nas rotas monitoradas.

const BANDS = [
  { key: 'madrugada', label: 'Madrugada (0h–6h)', from: 0, to: 6 },
  { key: 'manha', label: 'Manhã (6h–12h)', from: 6, to: 12 },
  { key: 'tarde', label: 'Tarde (12h–18h)', from: 12, to: 18 },
  { key: 'noite', label: 'Noite (18h–24h)', from: 18, to: 24 },
]

function fmtBRL(v) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function PriceHistory({ history }) {
  if (!history || history.length < 2) {
    return (
      <p className="meta">
        Histórico curto ainda ({history?.length || 0} checagem(ns)). A vigília noturna coleta
        preços em vários horários; com alguns dias de dados dá pra ver se a madrugada rende
        preço menor de verdade.
      </p>
    )
  }

  const prices = history.map((h) => h.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const W = 560
  const H = 80
  const points = history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * (W - 8) + 4
      const y = H - 8 - ((h.price - min) / range) * (H - 16)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const bands = BANDS.map((b) => {
    const inBand = history.filter((h) => {
      const hour = new Date(h.date).getHours()
      return hour >= b.from && hour < b.to
    })
    return {
      ...b,
      count: inBand.length,
      min: inBand.length ? Math.min(...inBand.map((h) => h.price)) : null,
    }
  })
  const bestBand = bands
    .filter((b) => b.min != null)
    .sort((a, b) => a.min - b.min)[0]

  return (
    <div className="price-history">
      <svg viewBox={`0 0 ${W} ${H}`} className="spark" preserveAspectRatio="none" role="img" aria-label="Evolução do preço">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="spark-range meta">
        min <span className="mono">R$ {fmtBRL(min)}</span> · max{' '}
        <span className="mono">R$ {fmtBRL(max)}</span> · {history.length} checagens
      </div>
      <table className="bands-table">
        <tbody>
          {bands.map((b) => (
            <tr key={b.key} className={bestBand?.key === b.key ? 'cheapest' : ''}>
              <td>{b.label}</td>
              <td className="mono">{b.min != null ? `R$ ${fmtBRL(b.min)}` : 'sem dados'}</td>
              <td className="meta">{b.count} checagem(ns)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
