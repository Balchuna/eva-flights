import { useState } from 'react'

export default function InfoBanner() {
  const [hidden, setHidden] = useState(() => localStorage.getItem('eva-info-dismissed') === '1')
  if (hidden) return null
  return (
    <div className="info-banner">
      <span>
        <strong>Como ler os preços:</strong> a maioria vem do cache Aviasales (o que outros
        usuários viram, pode ter mudado). O badge mostra a idade. "Vivo" = resultado de busca
        real feita há menos de 10 minutos. Use <em>Verificar preço real</em> para conferir no
        Google antes de comprar.
      </span>
      <button
        className="chip"
        onClick={() => {
          localStorage.setItem('eva-info-dismissed', '1')
          setHidden(true)
        }}
      >
        Entendi
      </button>
    </div>
  )
}
