// Tabela única das companhias: o servidor usa para reconhecer o mesmo voo em fontes
// diferentes, a interface para rótulo e link. Cada fonte escreve o nome de um jeito.
export const AIRLINES = {
  G3: {
    name: 'GOL',
    url: 'https://www.voegol.com.br',
    aliases: ['Gol Linhas Aéreas', 'Gol Linhas Aéreas Inteligentes'],
  },
  AD: {
    name: 'Azul',
    url: 'https://www.voeazul.com.br',
    aliases: ['Azul Linhas Aéreas', 'Azul Linhas Aéreas Brasileiras'],
  },
  LA: {
    name: 'LATAM',
    url: 'https://www.latamairlines.com/br/pt',
    aliases: ['JJ', 'TAM', 'TAM Linhas Aéreas', 'LATAM Airlines', 'LATAM Airlines Brasil', 'LATAM Brasil'],
  },
  TP: { name: 'TAP', url: 'https://www.flytap.com/pt-br', aliases: ['TAP Air Portugal', 'TAP Portugal'] },
  AF: { name: 'Air France', url: 'https://www.airfrance.com.br' },
  KL: { name: 'KLM', url: 'https://www.klm.com.br', aliases: ['KLM Royal Dutch Airlines'] },
  LH: { name: 'Lufthansa', url: 'https://www.lufthansa.com/br/pt' },
  BA: { name: 'British Airways', url: 'https://www.britishairways.com' },
  IB: { name: 'Iberia', url: 'https://www.iberia.com/br' },
  UX: { name: 'Air Europa', url: 'https://www.aireuropa.com' },
  AA: { name: 'American Airlines', url: 'https://www.aa.com', aliases: ['American'] },
  DL: { name: 'Delta', url: 'https://www.delta.com', aliases: ['Delta Air Lines'] },
  UA: { name: 'United', url: 'https://www.united.com', aliases: ['United Airlines'] },
  CM: { name: 'Copa', url: 'https://www.copaair.com', aliases: ['Copa Airlines'] },
  AV: { name: 'Avianca', url: 'https://www.avianca.com' },
  AR: { name: 'Aerolíneas Argentinas', url: 'https://www.aerolineas.com.ar' },
  EK: { name: 'Emirates', url: 'https://www.emirates.com/br' },
  QR: { name: 'Qatar Airways', url: 'https://www.qatarairways.com' },
  TK: { name: 'Turkish Airlines', url: 'https://www.turkishairlines.com' },
}

function plain(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
}

const CODE_BY_LABEL = new Map(
  Object.entries(AIRLINES).flatMap(([code, airline]) =>
    [code, airline.name, ...(airline.aliases || [])].map((label) => [plain(label), code])
  )
)

// Companhia fora da tabela fica como veio: duas grafias dela não fundem, o que é o erro menor
export function canonicalAirline(value) {
  if (!value) return null
  return CODE_BY_LABEL.get(plain(value)) || value
}
