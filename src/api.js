async function request(path, options) {
  const res = await fetch(path, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`)
  return body
}

export const api = {
  locations: (q) => request(`/api/locations?q=${encodeURIComponent(q)}`),
  flights: (params) => request(`/api/flights?${new URLSearchParams(params)}`),
  flex: (params) => request(`/api/flex?${new URLSearchParams(params)}`),
  sources: () => request('/api/sources'),
  verify: (params) =>
    request('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),
  history: () => request('/api/history'),
  clearHistory: () => request('/api/history', { method: 'DELETE' }),
  favorites: () => request('/api/favorites'),
  addFavorite: (fav) =>
    request('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fav),
    }),
  removeFavorite: (id) => request(`/api/favorites/${id}`, { method: 'DELETE' }),
  alerts: () => request('/api/alerts'),
  addAlert: (alert) =>
    request('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    }),
  patchAlert: (id, patch) =>
    request(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  removeAlert: (id) => request(`/api/alerts/${id}`, { method: 'DELETE' }),
  checkAlerts: () => request('/api/alerts/check', { method: 'POST' }),
}
