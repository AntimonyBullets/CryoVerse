import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from '../ui'
import { editArticle, getArticle, publishArticle, unpublishArticle } from '../../services/articleService.js'

/**
 * Admin-only website article editor for a resource or expedition.
 * targetType must be lowercase ('resource' | 'expedition') to match the
 * article routes' URL scheme.
 */
export default function ArticlePanel({ targetType, targetId, refreshToken }) {
  const [state, setState] = useState({ status: 'loading', article: null, error: null })
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)

  useEffect(() => {
    let active = true
    setState({ status: 'loading', article: null, error: null })
    getArticle(targetType, targetId)
      .then((article) => { if (active) { setState({ status: 'ready', article, error: null }); setDraft(article?.content || '') } })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setState({ status: 'empty', article: null, error: null })
        else setState({ status: 'error', article: null, error: err })
      })
    return () => { active = false }
  }, [targetType, targetId, refreshToken])

  async function handleSave() {
    setSaving(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const article = await editArticle(targetType, targetId, draft)
      setState({ status: 'ready', article, error: null })
      setActionMessage('Draft saved.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const article = await publishArticle(targetType, targetId)
      setState({ status: 'ready', article, error: null })
      setActionMessage('Article published.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    setPublishing(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const article = await unpublishArticle(targetType, targetId)
      setState({ status: 'ready', article, error: null })
      setDraft(article?.content || '')
      setActionMessage('Article unpublished. It is no longer visible to the public.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (state.status === 'loading') return <Card title="Website article" className="article-panel"><Spinner size="sm" label="Loading article" /></Card>
  if (state.status === 'error') return <Card title="Website article" className="article-panel"><Alert variant="danger" title="Couldn't load the article">{state.error.message}</Alert></Card>
  if (state.status === 'empty') return <Card title="Website article" className="article-panel">
    <p className="text-muted">No website article has been generated yet. Use the AI content panel above (with "Generate website article" checked) to create one.</p>
  </Card>

  const { article } = state
  const isPublished = article.status === 'published'
  const dirty = draft !== article.content

  return <Card title="Website article" className="article-panel">
    <div className="resource-card__meta">
      <Badge variant={isPublished ? 'success' : 'neutral'}>{isPublished ? 'Published' : 'Draft'}</Badge>
      {article.publishedAt && <span className="text-muted">Published {new Date(article.publishedAt).toLocaleString()}</span>}
    </div>
    {isPublished && <Alert variant="info">Unpublish the article before editing it.</Alert>}
    <div className="field">
      <label className="field__label" htmlFor="article-draft">Article content</label>
      <textarea id="article-draft" className="field__input field__textarea" rows={12}
        value={draft} onChange={(e) => setDraft(e.target.value)} readOnly={isPublished} />
    </div>
    {actionError && <Alert className="article-panel__action-message" variant="danger">{actionError}</Alert>}
    {actionMessage && <Alert className="article-panel__action-message" variant="success">{actionMessage}</Alert>}
    <div className="ai-panel__actions">
      {!isPublished && <Button size="sm" loading={saving} disabled={!dirty || !draft.trim()} onClick={handleSave}>Save draft</Button>}
      {!isPublished && <Button size="sm" variant="secondary" loading={publishing} disabled={dirty || !article.content} onClick={handlePublish}>Publish</Button>}
      {isPublished && <Button size="sm" variant="secondary" loading={publishing} onClick={handleUnpublish}>Unpublish</Button>}
      {isPublished && <Button size="sm" variant="ghost" to={`/articles/${targetType}/${targetId}`}>View public article</Button>}
    </div>
    {!isPublished && dirty && <p className="text-muted">Save your changes before publishing.</p>}
  </Card>
}
