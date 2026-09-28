import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from '../ui'
import { X_CHAR_LIMIT, X_MAX_IMAGES, editDraft, getDraft, publishDraft, uploadXMedia } from '../../services/xService.js'

const STATUS_VARIANT = { draft: 'neutral', published: 'success', failed: 'danger' }

/**
 * Admin-only X (Twitter) draft/publish panel for a resource or expedition.
 * targetType is lowercase ('resource' | 'expedition'); the service maps it
 * to the capitalized form the X routes expect.
 */
export default function XPanel({ targetType, targetId, refreshToken }) {
  const [state, setState] = useState({ status: 'loading', publication: null, error: null })
  const [draftText, setDraftText] = useState('')
  const [savedDraft, setSavedDraft] = useState(null) // null until a save (or an existing publication) exists
  const [media, setMedia] = useState([])
  const [savedMedia, setSavedMedia] = useState([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionMessage, setActionMessage] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let active = true
    setState({ status: 'loading', publication: null, error: null })
    getDraft(targetType, targetId)
      .then(({ draft, publishing: pub }) => {
        if (!active) return
        setState({ status: 'ready', publication: pub, error: null })
        setDraftText(draft || '')
        setMedia(pub?.media || [])
        setSavedMedia(pub?.media || [])
        setSavedDraft(pub ? pub.draft : null) // no publication yet => nothing saved
      })
      .catch((err) => {
        if (!active) return
        if (err.status === 404) setState({ status: 'empty', publication: null, error: null })
        else setState({ status: 'error', publication: null, error: err })
      })
    return () => { active = false }
  }, [targetType, targetId, refreshToken])

  const dirty = savedDraft === null || draftText !== savedDraft || JSON.stringify(media) !== JSON.stringify(savedMedia)
  const overLimit = draftText.length > X_CHAR_LIMIT
  const isPublished = state.publication?.status === 'published'
  const canPublish = !isPublished && !dirty && savedDraft !== null && draftText.trim().length > 0

  async function handleSave() {
    setSaving(true)
    setActionError(null)
    setActionMessage(null)
    try {
      const publication = await editDraft(targetType, targetId, draftText.trim(), media)
      setState((current) => ({ ...current, status: 'ready', publication }))
      setSavedDraft(publication.draft)
      setSavedMedia(publication.media || [])
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
      const publication = await publishDraft(targetType, targetId)
      setState((current) => ({ ...current, status: 'ready', publication }))
      setActionMessage('Posted to X.')
    } catch (err) {
      setActionError(err.message)
      // Backend still returns the (now "failed") publication on error; reflect it if present.
      if (err.data?.publishing) setState((current) => ({ ...current, publication: err.data.publishing }))
    } finally {
      setPublishing(false)
    }
  }

  async function handleFiles(event) {
    const files = Array.from(event.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (files.length === 0) return
    const remaining = X_MAX_IMAGES - media.length
    if (remaining <= 0) {
      setActionError(`You can attach at most ${X_MAX_IMAGES} images.`)
      return
    }
    const toUpload = files.slice(0, remaining)
    setUploading(true)
    setActionError(null)
    try {
      const uploaded = []
      for (const file of toUpload) {
        uploaded.push(await uploadXMedia(file))
      }
      setMedia((current) => [...current, ...uploaded])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function removeImage(url) {
    setMedia((current) => current.filter((item) => item.url !== url))
  }

  if (state.status === 'loading') return <Card title="X post" className="x-panel"><Spinner size="sm" label="Loading X draft" /></Card>
  if (state.status === 'error') return <Card title="X post" className="x-panel"><Alert variant="danger" title="Couldn't load the X draft">{state.error.message}</Alert></Card>
  if (state.status === 'empty') return <Card title="X post" className="x-panel">
    <p className="text-muted">No X post draft has been generated yet. Use the AI content panel above (with "Generate X post" checked) to create one.</p>
  </Card>

  const { publication } = state

  return <Card title="X post" className="x-panel">
    <div className="resource-card__meta">
      {publication && <Badge variant={STATUS_VARIANT[publication.status] || 'neutral'}>{publication.status}</Badge>}
      {publication?.publishedAt && <span className="text-muted">Posted {new Date(publication.publishedAt).toLocaleString()}</span>}
    </div>
    <div className="field">
      <label className="field__label" htmlFor="x-draft">Post text</label>
      <textarea id="x-draft" className="field__input field__textarea" rows={5}
        value={draftText} onChange={(e) => setDraftText(e.target.value)} readOnly={isPublished} />
      <p className={`x-panel__counter${overLimit ? ' x-panel__counter--over' : ''}`}>{draftText.length} / {X_CHAR_LIMIT}</p>
    </div>

    <div className="x-panel__media">
      <span className="field__label">Images ({media.length}/{X_MAX_IMAGES})</span>
      <div className="x-panel__thumbs">
        {media.map((item) => (
          <div key={item.url} className="x-panel__thumb">
            <img src={item.url} alt="Attached media" />
            {!isPublished && <button type="button" className="x-panel__thumb-remove" aria-label="Remove image" onClick={() => removeImage(item.url)}>×</button>}
          </div>
        ))}
      </div>
      {!isPublished && media.length < X_MAX_IMAGES && <>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" multiple onChange={handleFiles} disabled={uploading} />
        {uploading && <Spinner size="sm" label="Uploading image" />}
      </>}
    </div>

    {actionError && <Alert variant="danger">{actionError}{publication?.error ? ` (${publication.error})` : ''}</Alert>}
    {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
    {overLimit && <Alert variant="warning">The post is over the 280-character limit and cannot be saved.</Alert>}

    {!isPublished && <div className="ai-panel__actions">
      <Button size="sm" loading={saving} disabled={!dirty || overLimit || !draftText.trim()} onClick={handleSave}>Save draft</Button>
      <Button size="sm" variant="secondary" loading={publishing} disabled={!canPublish} onClick={handlePublish}>Publish to X</Button>
    </div>}
    {!isPublished && dirty && <p className="text-muted">Save your changes before publishing.</p>}
    {isPublished && publication.xPostId && (
      <p><a href={`https://x.com/i/web/status/${publication.xPostId}`} target="_blank" rel="noreferrer">View post on X</a></p>
    )}
  </Card>
}
