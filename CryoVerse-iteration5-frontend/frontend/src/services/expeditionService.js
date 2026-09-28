import { api } from './apiClient.js'

const list = (data) => Array.isArray(data?.expeditions) ? data.expeditions : []
const one = (data) => data?.expedition || null

export async function listExpeditions() { return list(await api.get('/expeditions')) }
export async function getExpedition(id) { return one(await api.get(`/expeditions/${encodeURIComponent(id)}`)) }
export async function createExpedition(payload) { return one(await api.post('/expeditions', payload)) }
export async function updateExpedition(id, payload) { return one(await api.put(`/expeditions/${encodeURIComponent(id)}`, payload)) }
export async function deleteExpedition(id) { return api.delete(`/expeditions/${encodeURIComponent(id)}`) }

export async function generateExpeditionAIContent(id, options = {}, { regenerate = false } = {}) {
  const suffix = regenerate ? '?regenerate=true' : ''
  const data = await api.post(`/expeditions/${encodeURIComponent(id)}/ai-content${suffix}`, {
    generateWebsiteArticle: Boolean(options.generateWebsiteArticle),
    generateXPost: Boolean(options.generateXPost),
  })
  return { cached: Boolean(data?.cached), aiContent: data?.aiContent || null }
}
