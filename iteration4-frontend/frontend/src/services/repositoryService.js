import { api } from './apiClient.js'

function resourcesFrom(data) {
  return Array.isArray(data?.resources) ? data.resources : []
}

function resourceFrom(data) {
  return data?.resource || null
}

export async function listResources(filters = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => value && query.set(key, value))
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return resourcesFrom(await api.get(`/repository${suffix}`))
}

export async function uploadMedia(file) {
  const body = new FormData()
  body.append('file', file)
  const data = await api.post('/repository/media', body)
  if (!data?.fileUrl) throw new Error('The media upload did not return a file URL.')
  return data.fileUrl
}

export async function listMyResources() {
  return resourcesFrom(await api.get('/repository/mine'))
}

export async function getResource(id) {
  return resourceFrom(await api.get(`/repository/${encodeURIComponent(id)}`))
}

export async function createResource(payload) {
  return resourceFrom(await api.post('/repository', payload))
}

export async function updateResource(id, payload) {
  return resourceFrom(await api.put(`/repository/${encodeURIComponent(id)}`, payload))
}

export async function deleteResource(id) {
  return api.delete(`/repository/${encodeURIComponent(id)}`)
}

/**
 * Triggers/fetches AI content for a resource (POST /repository/:id/ai-content).
 * options: { generateWebsiteArticle, generateLinkedInPost }
 * Set `regenerate: true` to bypass the backend's cache and force a fresh generation.
 * Returns { cached, aiContent } — aiContent fields: summary, simplifiedExplanation,
 * suggestedMetadata, transcript, websiteArticleDraft, linkedInPostDraft, sourceMediaType.
 */
export async function generateResourceAIContent(id, options = {}, { regenerate = false } = {}) {
  const suffix = regenerate ? '?regenerate=true' : ''
  const data = await api.post(`/repository/${encodeURIComponent(id)}/ai-content${suffix}`, {
    generateWebsiteArticle: Boolean(options.generateWebsiteArticle),
    generateLinkedInPost: Boolean(options.generateLinkedInPost),
  })
  return { cached: Boolean(data?.cached), aiContent: data?.aiContent || null }
}
