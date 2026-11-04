# Estudo para entrevista

Dez perguntas prováveis sobre o Eva Flights, com respostas baseadas no código. Os números de testes valem para `npm test` em 04/11/2026.

## 1. Que problema o projeto resolve?

Comparar passagem de graça é difícil, porque não encontrei API oficial gratuita com preço vivo e os preços de cache divergem do Google Flights sem explicação. O app junta as fontes grátis em uma lista, mostra a idade de cada preço e permite conferir uma oferta no Google Flights antes de comprar. Ele não elimina a incerteza: torna a incerteza visível.

Um ponto honesto: em uma medição real de 04/11/2026, a busca só de ida GRU→GIG trouxe 2 ofertas e a de ida e volta veio vazia, com 6 datas próximas. A amostra é pequena, mas mostra que a cobertura do cache é a maior limitação do produto.

## 2. Como é a arquitetura?

Três camadas:

- **Front:** React com Vite, em `src/`. Em desenvolvimento, o Vite encaminha `/api` para o servidor, conforme `vite.config.js`.
- **API:** Express, em `server/app.js`. Valida entradas, mantém um cache em memória de 3 horas, chama os provedores e aplica a quota.
- **Provedores:** um arquivo por fonte em `server/providers/`. `getProviders()`, em `index.js`, escolhe entre os reais e o demo.

`createApp({ providers })` recebe os provedores como parâmetro. É isso que permite testar as rotas com fontes falsas, sem rede.

A persistência é em JSON, em `server/store.js`. Foi escolhida porque o app é local e de um usuário só, e evita dependência nativa no Windows.

## 3. Como você normaliza respostas tão diferentes?

Cada provedor exporta uma função pura que recebe a resposta crua e devolve o mesmo formato: `source`, `live`, `foundAt`, `origin`, `destination`, `price`, `airline`, `gate`, `flightNumber`, `departureAt`, `returnAt`, `transfers`, `returnTransfers`, `durationMinutes` e `buyUrl`.

Exemplos de diferenças tratadas:

- a Travelpayouts v3 usa `price`, e o `/v2/prices/latest` usa `value`;
- o v3 responde a cidade em `origin` (SAO) e o aeroporto em `origin_airport` (GRU), então `normalizeOffer` prefere o aeroporto;
- o `latest` traz agência em `gate`, que nunca é tratada como companhia;
- o Sky-Scrapper usa `price.raw` e `legs`;
- a SerpAPI devolve horário com espaço, e `isoOf` troca por `T`;
- companhias viram um código canônico em `shared/airlines.js`, para Gol e G3 serem a mesma.

Não há classe central: a função fica junto do provedor, porque só ele conhece aquele formato. Um teste, `todo provedor devolve o mesmo formato de oferta`, garante o contrato. Um detalhe: a SerpAPI devolve um objeto diferente, com `offers`, `cheapest`, `priceInsights` e `googleUrl`, porque ela verifica preço em vez de alimentar a busca.

## 4. Como funciona a deduplicação?

`mergeOffers`, em `server/offers.js`, ordena por preço e percorre a lista. Cada oferta só entra se nenhuma já mantida for o mesmo voo. Como a lista já está ordenada, sobra sempre a mais barata.

`sameFlight` exige o mesmo vendedor e o mesmo minuto de partida. Depois:

- se as duas ofertas têm número de voo, ele decide;
- se falta o número, como no fast-flights e no Sky-Scrapper, o dia da volta separa viagens diferentes.

O vendedor é a companhia ou, se não houver, `agência:<gate>`. Sem vendedor ou sem partida, nada é fundido: prefiro mostrar uma repetição a esconder uma oferta real.

Limitação conhecida: o mesmo voo pode aparecer duas vezes quando uma fonte traz a companhia com horário e a outra só a agência com a data.

## 5. O que acontece quando uma fonte falha ou demora?

Em `/api/flights`, cada fonte é uma promessa com o próprio `.catch`, que transforma o erro em `{ error }`. O `Promise.all` nunca rejeita por causa de uma fonte só. Depois, os erros viram `warnings` e os arrays viram ofertas.

- Se **todas** falham, a resposta é 502 com as mensagens.
- Se só algumas falham, a resposta é 200 com aviso, mesmo com a lista vazia.

O fast-flights é o mais arriscado, então tem `Promise.race` com timeout de 12 s e limpa o timer no `finally`, para não deixar timer pendente. Há testes para erro, lentidão e cache vazio em `tests/app.test.js`.

Um ponto a melhorar: o aviso fica no cache de 3 horas junto com o resultado, então uma falha passageira continua aparecendo.

## 6. Como você evita estourar as quotas grátis?

`server/usage.js` guarda as chamadas do mês. `LIMITS` define 100 para a SerpAPI e 100 para o Sky-Scrapper, e `canCall(source, cost)` é consultado **antes** da chamada.

Decisões específicas:

- o Sky-Scrapper custa 3 chamadas por busca (2 aeroportos e os voos), então `canCall('skyscrapper', 3)` impede começar o que não pode terminar;
- a auto-verificação tem sub-orçamento de 50 (`AUTO_VERIFY_BUDGET`), para preservar a quota dos cliques;
- a auto-verificação é registrada **antes** da chamada, porque resposta vazia e erro também gastam quota e não podem se repetir a cada busca;
- `assertRoute` valida a entrada antes, porque chamada inválida não pode gastar quota.

Limitações: o contador soma antes de a chamada sair, mesmo sem token; o mês vira em UTC; o fast-flights não é contado; e o limite é o do código, não o da conta real.

## 7. Como o app lida com preço de cache contra preço vivo?

`withConfidence`, em `server/offers.js`, classifica cada oferta **na resposta**, e não na busca. Uma oferta pode ficar 3 horas no cache em memória, então "vivo" só vale nos primeiros 10 minutos (`LIVE_HOURS`).

- sem `foundAt`: `unknown`;
- `live` verdadeiro e menos de 10 minutos: `live`;
- menos de 24 horas: `fresh`;
- mais de 72 horas: `stale`;
- entre os dois: `cache`.

A escolha de `unknown` veio de uma medição real: o endpoint v3 não traz data do preço. Tratar isso como antigo seria inventar, assim como tratar como novo.

`buildVerification` compara o menor preço do Google com o menor preço **de cache** (`cachePriceOf`). Comparar o Google com outra fonte viva não diria nada sobre o cache. O resultado é a diferença percentual mostrada na tela.

## 8. Como você testou?

Com `node:test`, sem biblioteca extra: 118 testes, todos aprovados. Comando: `npm test`.

- **Sem rede e sem chave:** `tests/helpers/setup.js` substitui o `fetch`, bloqueia qualquer host diferente de `127.0.0.1` e apaga as chaves do ambiente. O teste `nenhum teste de rota tenta sair para a rede` confere isso.
- **Fixtures inventadas:** seguem o formato das APIs, com valores fictícios, sem resposta real gravada.
- **Rotas de verdade:** a API sobe em porta local e é chamada por HTTP, com provedores falsos injetados em `createApp`.
- **Corridas:** `tests/alerts.test.js` cobre alerta excluído, pausado, editado ou criado durante uma checagem.
- **Configuração:** `tests/env.test.js` confere se o `.env.example` lista toda variável lida no servidor e não traz nenhuma chave.

A CI, em `.github/workflows/ci.yml`, roda testes e build em Ubuntu com Node 20, 22 e 24 e em Windows com Node 24.

O teste não cobre tudo. As fixtures iniciais erravam o formato real do v3, e só uma busca real mostrou que `origin` vinha como cidade e que `found_at` não existia. Por isso medi com dados reais e corrigi os testes depois. Fixture só prova o que você já sabe sobre a API.

## 9. Como você cuida de segredos e segurança?

- **Chaves só no servidor:** ficam no `.env` e nunca são enviadas à tela.
- **`.env` fora do git:** o `.gitignore` cobre `.env` e `.env.*`, mas mantém o `.env.example`. A pasta `data/`, com o histórico pessoal, também fica de fora.
- **Rede:** `startServer` escuta só em `127.0.0.1`, porque a API não tem login e gasta as quotas. `tests/bind.test.js` confere.
- **Entrada:** `assertRoute` valida IATA e datas em `/api/verify`. O corpo de alertas e favoritos ainda não é validado, e assumi isso porque a exposição é local.
- **Fonte não oficial:** o fast-flights fica desligado por padrão, e só `FASTFLIGHTS_DISABLED=false` liga, porque quem clona o projeto não deve chamar o Google sem decidir isso.
- **Publicação:** o repositório nasce privado e passa por varredura de segredos, incluindo o histórico, antes de qualquer publicação.

## 10. O que significa "medir em vez de prometer", e o que você mudaria?

Dizem que a passagem fica mais barata de madrugada. A pesquisa apontou um mito com um grão de verdade. Em vez de colocar essa promessa no app, criei a vigília: `startAlertLoop`, em `server/alerts.js`, checa os alertas em horários fixos (`WATCH_HOURS`), e `src/PriceHistory.jsx` mostra o menor preço por faixa horária. Ainda não tenho resultado publicado dessa medição, e digo isso no README.

A mesma postura valeu para o resto: a busca real de 04/11/2026 revelou três problemas que os testes não pegavam, e corrigi cada um deles.

Com mais tempo, eu mudaria:

1. Agendar a vigília fora do processo, pelo Agendador de Tarefas, porque hoje alertas só rodam com o servidor aberto.
2. Separar aviso de resultado no cache, para falha passageira não durar 3 horas.
3. Validar o corpo de alertas e favoritos.
4. Passar para SQLite se o histórico crescer, porque cada leitura hoje abre um arquivo inteiro.
5. Fundir melhor as ofertas de companhia e de agência.
