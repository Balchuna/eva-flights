// Fixtures escritas à mão. Nenhuma é resposta real de API: seguem só os nomes de campo que
// cada provedor usa, com voos, agências e preços inventados.

export const travelpayoutsV3Row = {
  origin: 'GRU',
  destination: 'GIG',
  price: 412,
  airline: 'G3',
  flight_number: 9101,
  departure_at: '2026-12-10T08:30:00-03:00',
  return_at: '2026-12-20T18:10:00-03:00',
  transfers: 0,
  return_transfers: 1,
  duration: 130,
  link: '/search/GRU1012GIG20121',
  found_at: '2026-12-01T10:00:00Z',
}

export const travelpayoutsLatestRow = {
  origin: 'GRU',
  destination: 'GIG',
  value: 380,
  gate: 'Agência Fictícia',
  depart_date: '2026-12-10',
  return_date: '2026-12-20',
  number_of_changes: 1,
  duration: 180,
  found_at: '2026-12-01T12:00:00Z',
}

export const monthMatrixRow = {
  origin: 'SAO',
  destination: 'RIO',
  depart_date: '2026-12-12',
  return_date: '',
  gate: 'Agência Fictícia',
  value: 310,
  number_of_changes: 0,
  found_at: '2026-12-01T12:00:00Z',
}

export const placesRow = {
  code: 'GRU',
  name: 'Aeroporto Fictício',
  city_name: 'São Paulo',
  country_name: 'Brasil',
  type: 'airport',
}

export const fastFlightsResult = {
  type: 'G3',
  price: 500,
  airlines: ['Gol'],
  flights: [
    {
      departure: { date: [2026, 12, 10], time: [8, 30] },
      arrival: { date: [2026, 12, 10], time: [9, 35] },
      duration: 65,
    },
    {
      departure: { date: [2026, 12, 10], time: [10, 0] },
      arrival: { date: [2026, 12, 10], time: [11, 0] },
      duration: 60,
    },
  ],
}

export const skyItinerary = {
  price: { raw: 610 },
  legs: [
    {
      departure: '2026-12-10T08:30:00',
      stopCount: 0,
      durationInMinutes: 65,
      carriers: { marketing: [{ name: 'Gol Linhas Aéreas' }] },
    },
    { departure: '2026-12-20T18:10:00', stopCount: 1 },
  ],
}

export const serpapiBody = {
  best_flights: [
    {
      price: 700,
      total_duration: 65,
      flights: [
        {
          airline: 'Gol',
          flight_number: 'G3 9101',
          departure_airport: { id: 'GRU', time: '2026-12-10 08:30' },
          arrival_airport: { id: 'GIG', time: '2026-12-10 09:35' },
        },
      ],
    },
  ],
  other_flights: [
    {
      price: 650,
      total_duration: 200,
      flights: [
        {
          airline: 'Azul',
          flight_number: 'AD 9202',
          departure_airport: { id: 'GRU', time: '2026-12-10 13:00' },
          arrival_airport: { id: 'VCP', time: '2026-12-10 14:00' },
        },
        {
          airline: 'Azul',
          flight_number: 'AD 9203',
          departure_airport: { id: 'VCP', time: '2026-12-10 15:00' },
          arrival_airport: { id: 'GIG', time: '2026-12-10 16:20' },
        },
      ],
    },
  ],
  price_insights: { lowest_price: 650, price_level: 'typical', typical_price_range: [500, 800] },
  search_metadata: { google_flights_url: 'https://www.google.com/travel/flights?q=ficticio' },
}
