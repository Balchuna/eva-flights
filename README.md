# Eva Flights

App local pra caçar passagens aéreas pelo menor preço, com várias fontes gratuitas. Nada é vendido aqui: os botões de compra abrem Aviasales, Google Flights ou o site da companhia.

> Histórico: começou como "Voos Baratos" sobre a Amadeus Self-Service (desativada em 17/07/2026); migrado pra Travelpayouts e renomeado em 18/07/2026.

## Setup

1. Criar conta grátis em https://www.travelpayouts.com → perfil → API token.
2. Copiar `.env.example` pra `.env` e preencher `TRAVELPAYOUTS_TOKEN`.
3. `npm install` (o `start.bat` faz sozinho na primeira vez).

Keys opcionais no `.env`:
- `SERPAPI_KEY` (serpapi.com, ~100 buscas grátis/mês) → ativa o botão **Verificar preço real** (preço vivo do Google Flights ao lado do preço de cache).
- `RAPIDAPI_KEY` (rapidapi.com, assinar Sky-Scrapper no plano Basic free) → ativa a 2ª fonte de busca (checkbox na aba Buscar).

Requer Node 20+.

## Rodar

Duplo clique em `start.bat`, ou `npm run dev`. Server :3001, app :5173.

## Como os preços funcionam

- **Aviasales (cache):** preços vistos por outros usuários recentemente; cada oferta mostra "visto há Xh". Ótimo pra achar o patamar barato, mas o preço vivo pode diferir — por isso o Google costuma mostrar outro valor.
- **Verificar preço real:** consulta o Google Flights via SerpAPI na hora e mostra a comparação. Quota pequena — use nas melhores ofertas.
- **Reset de madrugada:** mito (pricing é contínuo); só cargas promocionais ocasionais entre ~1h–5h. A vigília noturna (`WATCH_HOURS`) mede isso: deixe um alerta ativo alguns dias e veja o menor preço por faixa horária no histórico do alerta.

## Notas

- Alertas: checagem a cada `ALERT_CHECK_HOURS` + vigília nos `WATCH_HOURS`, enquanto o server roda; toast do Windows ao atingir o alvo.
- Uso mensal por fonte em `data/usage.json`, exibido no topo da UI.
- Dados locais em `app/data/*.json` (gitignored).
