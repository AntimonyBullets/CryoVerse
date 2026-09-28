import { useEffect, useRef, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from '../ui'
import {
  BLUESKY_ACCEPTED_TYPES,
  BLUESKY_ALT_MAX_LENGTH,
  BLUESKY_CHAR_LIMIT,
  BLUESKY_MAX_IMAGES,
  editDraft,
  getDraft,
  publishDraft,
  uploadBlueskyMedia,
} from '../../services/blueskyService.js'

const STATUS_VARIANT = { draft: 'neutral', published: 'success', failed: 'danger' }

const sameMedia = (a, b) => JSON.stringify(
  (a || []).map(({ url, publicId, alt }) => ({ url, publicId: publicId || null, alt: alt || '' })),
) === JSON.stringify(
  (b || []).map(({ url, publicId, alt }) => ({ url, publicId: publicId || null, alt: alt || '' })),
)

/**
 * Admin-only Bluesky draft/publish panel for a resource or expedition.
 * targetType is lowercase ('resource' | 'expedition'); the service maps it
 * to the capitalized form the Bluesky routes expect.
 */
export default function BlueskyPanel({ targetType, targetId, refreshToken }) {
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

  const dirty = savedDraft === null || draftText !== savedDraft || !sameMedia(media, savedMedia)
  const overLimit = draftText.length > BLUESKY_CHAR_LIMIT
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
      setActionMessage('Posted to Bluesky.')
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
    const remaining = BLUESKY_MAX_IMAGES - media.length
    if (remaining <= 0) {
      setActionError(`You can attach at most ${BLUESKY_MAX_IMAGES} images.`)
      return
    }
    const toUpload = files.slice(0, remaining)
    setUploading(true)
    setActionError(null)
    try {
      const uploaded = []
      for (const file of toUpload) {
        uploaded.push(await uploadBlueskyMedia(file))
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

  function updateAlt(url, alt) {
    setMedia((current) => current.map((item) => (item.url === url ? { ...item, alt } : item)))
  }

  if (state.status === 'loading') return <Card title="Bluesky post" className="bluesky-panel"><Spinner size="sm" label="Loading Bluesky draft" /></Card>
  if (state.status === 'error') return <Card title="Bluesky post" className="bluesky-panel"><Alert variant="danger" title="Couldn't load the Bluesky draft">{state.error.message}</Alert></Card>
  if (state.status === 'empty') return <Card title="Bluesky post" className="bluesky-panel">
    <p className="text-muted">No Bluesky post draft has been generated yet. Use the AI content panel above (with "Generate Bluesky post" checked) to create one.</p>
  </Card>

  const { publication } = state

  return <Card title="Bluesky post" className="bluesky-panel">
    <div className="resource-card__meta">
      {publication && <Badge variant={STATUS_VARIANT[publication.status] || 'neutral'}>{publication.status}</Badge>}
      {publication?.publishedAt && <span className="text-muted">Posted {new Date(publication.publishedAt).toLocaleString()}</span>}
    </div>
    <div className="field">
      <label className="field__label" htmlFor="bluesky-draft">Post text</label>
      <textarea id="bluesky-draft" className="field__input field__textarea" rows={5}
        value={draftText} onChange={(e) => setDraftText(e.target.value)} readOnly={isPublished} />
      <p className={`bluesky-panel__counter${overLimit ? ' bluesky-panel__counter--over' : ''}`}>{draftText.length} / {BLUESKY_CHAR_LIMIT}</p>
    </div>

    <div className="bluesky-panel__media">
      <span className="field__label">Images ({media.length}/{BLUESKY_MAX_IMAGES})</span>
      <div className="bluesky-panel__thumbs">
        {media.map((item) => (
          <div key={item.url} className="bluesky-panel__thumb">
            <img src={item.url} alt={item.alt || 'Attached image'} />
            {!isPublished && <button type="button" className="bluesky-panel__thumb-remove" aria-label="Remove image" onClick={() => removeImage(item.url)}>×</button>}
          </div>
        ))}
      </div>
      {!isPublished && media.map((item, index) => (
        <div key={item.url} className="field bluesky-panel__alt">
          <label className="field__label" htmlFor={`bluesky-alt-${index}`}>Alt text</label>
          <input
            id={`bluesky-alt-${index}`}
            className="field__input"
            type="text"
            maxLength={BLUESKY_ALT_MAX_LENGTH}
            value={item.alt || ''}
            placeholder="Describe this image for screen readers"
            onChange={(e) => updateAlt(item.url, e.target.value)}
          />
        </div>
      ))}
      {!isPublished && media.length < BLUESKY_MAX_IMAGES && <>
        <input ref={fileInputRef} type="file" accept={BLUESKY_ACCEPTED_TYPES} multiple onChange={handleFiles} disabled={uploading} />
        {uploading && <Spinner size="sm" label="Uploading image" />}
        <p className="text-muted">Up to {BLUESKY_MAX_IMAGES} images, 2 MB each (JPEG, PNG, GIF, or WebP).</p>
      </>}
    </div>

    {actionError && <Alert variant="danger">{actionError}{publication?.error ? ` (${publication.error})` : ''}</Alert>}
    {actionMessage && <Alert variant="success">{actionMessage}</Alert>}
    {overLimit && <Alert variant="warning">The post is over the 300-character limit and cannot be saved.</Alert>}

    {!isPublished && <div className="ai-panel__actions">
      <Button size="sm" loading={saving} disabled={!dirty || overLimit || !draftText.trim()} onClick={handleSave}>Save draft</Button>
      <Button size="sm" variant="secondary" loading={publishing} disabled={!canPublish} onClick={handlePublish}>Publish to Bluesky</Button>
    </div>}
    {!isPublished && dirty && <p className="text-muted">Save your changes before publishing.</p>}
    {isPublished && publication.blueskyPostUrl && (
      <p><a href={publication.blueskyPostUrl} target="_blank" rel="noreferrer">View post on Bluesky</a></p>
    )}
  </Card>
}
