# Como o Eva Flights funciona

Este texto explica o projeto sem exigir conhecimento de programação. Os nomes de arquivo servem para quem quiser abrir o código.

## A ideia

O Eva Flights é um site que roda no seu computador. Ele pergunta o preço de uma passagem para várias fontes, junta as respostas em uma lista só e mostra o quanto cada preço é confiável. Ele não vende nada: para comprar, o botão leva à Aviasales, ao Google Flights ou à companhia aérea.

## As três partes

1. **A tela (`src/`)** é o que você vê no navegador. Ela só conversa com o servidor do próprio app.
2. **O servidor (`server/`)** recebe os pedidos da tela, guarda as chaves das APIs e consulta as fontes. As chaves nunca chegam à tela.
3. **Os arquivos de dados (`data/`)** guardam alertas, favoritos, histórico e contagem de uso. Ficam só na sua máquina e fora do git.

## O caminho de uma busca

Exemplo: Guarulhos para o Galeão em 7 de dezembro.

1. A tela pede a busca ao servidor em `/api/flights`.
2. O servidor vê se já fez essa mesma busca nas últimas 3 horas. Se fez, responde com o que guardou na memória.
3. Se não fez, consulta as fontes ao mesmo tempo:
   - duas consultas à Travelpayouts, sempre;
   - o fast-flights, só se foi ligado no `.env`;
   - o Sky-Scrapper, só se você marcou o checkbox e ainda há quota.
4. Cada fonte fala de um jeito. O preço da Travelpayouts vem em `price` ou `value`; o do Sky-Scrapper vem em `price.raw`. Um **normalizador** traduz cada resposta para o mesmo formato de oferta.
5. O servidor ordena por preço e remove repetições, ficando com a oferta mais barata de cada voo.
6. Se uma fonte falhou, ela vira um aviso na tela, e a busca continua com as outras. Só dá erro se todas falharem.
7. Se a lista ficou vazia, o servidor procura datas até 3 dias antes ou depois.
8. Se existe chave da SerpAPI, há oferta de cache e sobra orçamento, ele confere a rota no Google Flights. Faz isso no máximo uma vez a cada 24 horas por rota e data.
9. O servidor grava a busca no histórico, calcula a idade de cada preço e responde à tela.

Uma busca pode gastar até 4 chamadas da Travelpayouts: dia exato, mês inteiro se o dia veio vazio, `latest` e, se tudo veio vazio, a grade do mês para as datas próximas.

## De onde vêm os preços

| Fonte | O que é | Quando entra |
|---|---|---|
| Travelpayouts (Aviasales) | Preços que outros usuários viram recentemente. É cache, não cotação. | Sempre, fora do demo |
| SerpAPI | Consulta ao Google Flights na hora. Só confere preço. | Com chave no `.env` |
| Sky-Scrapper | Segunda fonte de busca, de terceiros, na RapidAPI. | Com chave e checkbox marcado |
| fast-flights | Lê uma parte interna do Google Flights, sem autorização oficial. | Só se você ligar, por sua conta |

Cache é como perguntar a quem acabou de ir ao mercado quanto custava o arroz: a informação é útil e sai de graça, mas o preço pode ter mudado.

## O que significam os selos

| Selo | Significado |
|---|---|
| Vivo | Resultado de busca real, feita há menos de 10 minutos |
| Recente | Visto há menos de 24 horas |
| Cache | Visto entre 24 e 72 horas atrás |
| Antigo | Visto há mais de 72 horas |
| Idade desconhecida | A fonte não disse quando viu o preço |

A idade é calculada na hora de responder, e não na hora da busca. Assim, uma oferta guardada há 2 horas não continua aparecendo como "Vivo".

## A trava de quota

Os planos grátis têm limite por mês. O servidor conta as chamadas em `data/usage.json` e confere o saldo antes de gastar: 100 por mês para a SerpAPI e 100 para o Sky-Scrapper. A conferência automática da SerpAPI só pode usar 50 dessas 100, para sobrar para os cliques. Quando o limite chega, a fonte vira um aviso em vez de gastar além do previsto. O contador zera na virada do mês, em UTC.

Esses limites são os valores que estão no código. O limite real é o do plano de cada conta.

## Alertas e vigília

Você define uma rota e um preço alvo. Enquanto o servidor está aberto, ele checa o preço em dois momentos:

- a cada `ALERT_CHECK_HOURS`, 6 horas por padrão;
- nos horários de `WATCH_HOURS`, 2h, 4h, 9h, 14h e 20h por padrão.

Quando o preço chega ao alvo, o Windows mostra um aviso, uma vez só. Se o preço subir de novo acima do alvo, o aviso fica liberado outra vez.

Cada checagem entra no histórico do alerta, e o app mostra o menor preço por faixa do dia: madrugada, manhã, tarde e noite. É assim que dá para ver se a madrugada compensa nas suas rotas, em vez de acreditar no boato.

Se o servidor estiver fechado, nada é checado.

## O modo demo

Serve para qualquer pessoa ver o app sem criar conta em lugar nenhum. Com `DEMO_MODE=true`:

- as fontes reais são trocadas por dados inventados, no mesmo formato cru de cada API;
- esses dados passam pelos mesmos normalizadores, pela mesma deduplicação e pela mesma trava de quota;
- nada sai para a internet pelo servidor;
- os dados ficam em `data/demo`, separados dos reais;
- a tela mostra uma faixa avisando que tudo é fictício, e os avisos de alerta começam com `[DEMO]`.

Os links para o Google Flights e para as companhias continuam abrindo os sites de verdade, com os preços de lá.

## Segurança

- O servidor só aceita conexões da própria máquina, porque não tem login e gasta as suas quotas.
- As chaves ficam no `.env`, que não vai para o git. O `.env.example` traz só os nomes.
- O histórico de buscas fica em `data/`, também fora do git.

## Onde olhar no código

| Assunto | Arquivo |
|---|---|
| Rotas da API, cache de 3h e auto-verificação | `server/app.js` |
| Deduplicação e selos de confiança | `server/offers.js` |
| Quota | `server/usage.js` |
| Cada fonte e seu normalizador | `server/providers/*.js` |
| Troca para o modo demo | `server/providers/index.js` |
| Dados fictícios | `server/demo/fixtures.js` |
| Alertas e vigília | `server/alerts.js` |
| Leitura e escrita dos arquivos JSON | `server/store.js` |
| Tela de busca e cartão da oferta | `src/SearchTab.jsx` e `src/OfferCard.jsx` |
| Tabela por faixa horária | `src/PriceHistory.jsx` |
| Testes | `tests/` |
