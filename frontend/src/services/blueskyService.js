import { api } from './apiClient.js'

// The Bluesky routes use capitalized target types ("Resource" / "Expedition"),
// unlike the article routes which use lowercase. Callers pass the same
// lowercase `targetType` used elsewhere in the app; this maps it.
function toBlueskyTargetType(targetType) {
  if (targetType === 'resource') return 'Resource'
  if (targetType === 'expedition') return 'Expedition'
  return targetType
}

export const BLUESKY_CHAR_LIMIT = 300
export const BLUESKY_MAX_IMAGES = 4
export const BLUESKY_MAX_IMAGE_BYTES = 2000000
export const BLUESKY_ALT_MAX_LENGTH = 2000
export const BLUESKY_ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp'

export async function getDraft(targetType, targetId) {
  const query = new URLSearchParams({ targetType: toBlueskyTargetType(targetType), targetId }).toString()
  const data = await api.get(`/admin/bluesky/draft?${query}`)
  return { draft: data?.draft || '', publishing: data?.publishing || null }
}

export async function editDraft(targetType, targetId, draft, media = []) {
  const data = await api.put('/admin/bluesky/draft', {
    targetType: toBlueskyTargetType(targetType),
    targetId,
    draft,
    media,
  })
  return data?.publishing || null
}

/** Uploads a single image via the existing Cloudinary-backed media endpoint. Call once per file (max 4 total). */
export async function uploadBlueskyMedia(file) {
  if (file.size > BLUESKY_MAX_IMAGE_BYTES) {
    throw new Error(`Images must be 2 MB or smaller. "${file.name}" is ${Math.round(file.size / 1024)} KB.`)
  }  const body = new FormData()
  body.append('file', file)
  const data = await api.post('/admin/bluesky/media', body)
  if (!data?.fileUrl) throw new Error('The image upload did not return a file URL.')
  return { url: data.fileUrl, publicId: data.publicId || null, resourceType: data.resourceType || 'image', alt: '' }
}

export async function publishDraft(targetType, targetId) {
  const data = await api.post('/admin/bluesky/publish', { targetType: toBlueskyTargetType(targetType), targetId })
  return data?.publishing || null
}

export async function getPublishingStatus(targetType, targetId) {
  const query = new URLSearchParams({ targetType: toBlueskyTargetType(targetType), targetId }).toString()
  const data = await api.get(`/admin/bluesky/status?${query}`)
  return data?.publishing || null
}
