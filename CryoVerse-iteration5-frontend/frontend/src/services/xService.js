import { api } from './apiClient.js'

// The X routes use capitalized target types ("Resource" / "Expedition"),
// unlike the article routes which use lowercase. Callers pass the same
// lowercase `targetType` used elsewhere in the app; this maps it.
function toXTargetType(targetType) {
  if (targetType === 'resource') return 'Resource'
  if (targetType === 'expedition') return 'Expedition'
  return targetType
}

export const X_CHAR_LIMIT = 280
export const X_MAX_IMAGES = 4

export async function getDraft(targetType, targetId) {
  const query = new URLSearchParams({ targetType: toXTargetType(targetType), targetId }).toString()
  const data = await api.get(`/admin/x/draft?${query}`)
  return { draft: data?.draft || '', publishing: data?.publishing || null }
}

export async function editDraft(targetType, targetId, draft, media = []) {
  const data = await api.put('/admin/x/draft', {
    targetType: toXTargetType(targetType),
    targetId,
    draft,
    media,
  })
  return data?.publishing || null
}

/** Uploads a single image via the existing X media endpoint. Call once per file (max 4 total). */
export async function uploadXMedia(file) {
  const body = new FormData()
  body.append('file', file)
  const data = await api.post('/admin/x/media', body)
  if (!data?.fileUrl) throw new Error('The image upload did not return a file URL.')
  return { url: data.fileUrl, publicId: data.publicId || null, resourceType: data.resourceType || 'image' }
}

export async function publishDraft(targetType, targetId) {
  const data = await api.post('/admin/x/publish', { targetType: toXTargetType(targetType), targetId })
  return data?.publishing || null
}

export async function getPublishingStatus(targetType, targetId) {
  const query = new URLSearchParams({ targetType: toXTargetType(targetType), targetId }).toString()
  const data = await api.get(`/admin/x/status?${query}`)
  return data?.publishing || null
}
