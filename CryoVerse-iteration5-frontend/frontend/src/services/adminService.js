import { api } from './apiClient.js'

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const suffix = query.toString()
  return suffix ? `?${suffix}` : ''
}

// -- Users -------------------------------------------------------------

export async function listUsers(params = {}) {
  const data = await api.get(`/admin/users${buildQuery(params)}`)
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0 },
  }
}

export async function changeUserRole(id, role) {
  const data = await api.patch(`/admin/users/${encodeURIComponent(id)}/role`, { role })
  return data?.user || null
}

// -- Submissions / moderation -------------------------------------------

export async function listSubmissions(params = {}) {
  const data = await api.get(`/admin/submissions${buildQuery(params)}`)
  return {
    resources: Array.isArray(data?.resources) ? data.resources : [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0 },
  }
}

export async function moderateResource(id, action, feedback) {
  const data = await api.post(`/admin/resources/${encodeURIComponent(id)}/moderate`, {
    action,
    ...(feedback ? { feedback } : {}),
  })
  return data?.resource || null
}

export async function publishResource(id) {
  const data = await api.post(`/admin/resources/${encodeURIComponent(id)}/publish`)
  return { resource: data?.resource || null, aiContent: data?.aiContent || null }
}

export async function unpublishResource(id) {
  const data = await api.post(`/admin/resources/${encodeURIComponent(id)}/unpublish`)
  return data?.resource || null
}

// -- Audit history --------------------------------------------------------

export async function getAuditHistory(params = {}) {
  const data = await api.get(`/admin/audit${buildQuery(params)}`)
  return {
    history: Array.isArray(data?.history) ? data.history : [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0 },
  }
}
