const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Unable to load fleet data')
  return response.status === 204 ? null : response.json()
}

export const api = {
  equipment: () => request('/equipment'),
  dashboard: () => request('/dashboard'),
  requests: () => request('/requests'),
  createRequest: payload => request('/requests', { method: 'POST', body: JSON.stringify(payload) }),
  approveRequest: id => request(`/requests/${id}/approve`, { method: 'POST' }),
  extendRequest: (id, extraDays) => request(`/requests/${id}/extension`, { method: 'POST', body: JSON.stringify({ extraDays }) }),
  createSite: payload => request('/sites', { method: 'POST', body: JSON.stringify(payload) }),
  rfid: (action,payload) => request(`/${action}`, { method: 'POST', body: JSON.stringify(payload) }),
  customers: () => request('/customers'),
  customerPortal: id => request(`/customers/${id}/portal`),
  telemetry: id => request(`/equipment/${id}/telemetry`),
  adminNotifications: () => request('/notifications/admin'),
  customerNotifications: id => request(`/notifications/customer/${id}`),
}
