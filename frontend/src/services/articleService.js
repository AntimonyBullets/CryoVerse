import { api } from './apiClient.js'

/**
 * The backend returns two different shapes for article data depending on the
 * endpoint: GET routes wrap the draft as `{ content, status, publishedAt }`,
 * while edit/publish/unpublish return the raw AIContent/ExpeditionAIContent
 * document (`websiteArticleDraft`, `websiteArticleStatus`,
 * `websiteArticlePublishedAt`). Normalize both into one shape so the UI only
 * has to deal with { targetType, targetId, content, status, publishedAt }.
 */
function normalize(data, targetType, targetId) {
  const article = data?.article
  if (!article) return null
  if (Object.prototype.hasOwnProperty.call(article, 'content')) {
    return {
      targetType: article.targetType || targetType,
      targetId: article.targetId || targetId,
      content: article.content || '',
      status: article.status || 'draft',
      publishedAt: article.publishedAt || null,
    }
  }
  return {
    targetType,
    targetId,
    content: article.websiteArticleDraft || '',
    status: article.websiteArticleStatus || 'draft',
    publishedAt: article.websiteArticlePublishedAt || null,
  }
}

/** Public: only returns an article when it has been published. */
export async function getPublishedArticle(targetType, id) {
  const data = await api.get(`/articles/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}`)
  return normalize(data, targetType, id)
}

/** Admin-only: returns the draft regardless of publish status. */
export async function getArticle(targetType, id) {
  const data = await api.get(`/articles/admin/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}`)
  return normalize(data, targetType, id)
}

export async function editArticle(targetType, id, content) {
  const data = await api.put(`/articles/admin/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}`, { content })
  return normalize(data, targetType, id)
}

export async function publishArticle(targetType, id) {
  const data = await api.post(`/articles/admin/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}/publish`)
  return normalize(data, targetType, id)
}

export async function unpublishArticle(targetType, id) {
  const data = await api.post(`/articles/admin/${encodeURIComponent(targetType)}/${encodeURIComponent(id)}/unpublish`)
  return normalize(data, targetType, id)
}
