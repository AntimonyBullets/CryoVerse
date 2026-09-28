import { useLayoutEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Spinner } from '../ui'

/**
 * Generates AI content for a resource or expedition.
 * Summary / simplified explanation / metadata are always requested.
 * Website article + Bluesky post drafts are admin-only extras (backend rejects
 * these from non-admins with a 403), so the checkboxes only render when
 * `isAdmin` is true.
 */
export default function AIContentPanel({ title, description, generate, isAdmin = false, onGenerated }) {
  const [options, setOptions] = useState({ generateWebsiteArticle: false, generateBlueskyPost: false })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)
  const [content, setContent] = useState(null)
  const [edited, setEdited] = useState({})

  async function run(regenerate = false) {
    setStatus('loading')
    setError(null)
    try {
      const effectiveOptions = isAdmin ? options : { generateWebsiteArticle: false, generateBlueskyPost: false }
      const result = await generate(effectiveOptions, { regenerate })
      const nextContent = result.aiContent || {}
      setContent(nextContent)
      setCached(result.cached)
      setEdited({
        summary: nextContent.summary || '',
        simplifiedExplanation: nextContent.simplifiedExplanation || '',
        websiteArticleDraft: nextContent.websiteArticleDraft || '',
        blueskyPostDraft: nextContent.blueskyPostDraft || '',
      })
      setStatus('success')
      onGenerated?.(nextContent)
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const hasWebsiteArticle = Boolean(content?.websiteArticleDraft)
  const hasBlueskyPost = Boolean(content?.blueskyPostDraft)
  const missingCachedDrafts = cached && (
    (options.generateWebsiteArticle && !hasWebsiteArticle) ||
    (options.generateBlueskyPost && !hasBlueskyPost)
  )
  function updateField(key, value) { setEdited((current) => ({ ...current, [key]: value })) }

  return <Card title={title} className="ai-panel">
    {description && <p className="text-muted">{description}</p>}
    {isAdmin && <>
      <label className="ai-panel__checkbox"><input type="checkbox" checked={options.generateWebsiteArticle} onChange={(e) => setOptions((current) => ({ ...current, generateWebsiteArticle: e.target.checked }))} />Generate website article</label>
      <label className="ai-panel__checkbox"><input type="checkbox" checked={options.generateBlueskyPost} onChange={(e) => setOptions((current) => ({ ...current, generateBlueskyPost: e.target.checked }))} />Generate Bluesky post</label>
    </>}
    <div className="ai-panel__actions">
      <Button type="button" loading={status === 'loading'} onClick={() => run(false)}>{status === 'loading' ? 'Generating…' : 'Generate AI content'}</Button>
      {status === 'success' && <Button type="button" variant="secondary" size="sm" onClick={() => run(true)}>Regenerate</Button>}
      {status === 'error' && <Button type="button" variant="secondary" size="sm" onClick={() => run(false)}>Retry</Button>}
    </div>
    {status === 'loading' && <div className="ai-panel__loading"><Spinner size="sm" label="Generating AI content" /> This can take a little while for videos.</div>}
    {status === 'error' && <Alert variant="danger" title="AI generation failed">{error?.message || 'Something went wrong. Please try again.'}</Alert>}
    {status === 'success' && content && <div className="ai-panel__result">
      <Alert variant={cached ? 'info' : 'success'}>{cached ? 'Showing previously generated content for this item.' : 'AI content generated.'} AI-generated content — review and edit before publication.</Alert>
      {missingCachedDrafts && <Alert variant="warning">The cached result does not contain one or more requested drafts. Regenerate to create the missing draft.</Alert>}
      <EditableField id="ai-summary" label="Summary" value={edited.summary} onChange={(value) => updateField('summary', value)} rows={4} />
      <EditableField id="ai-explanation" label="Simplified explanation" value={edited.simplifiedExplanation} onChange={(value) => updateField('simplifiedExplanation', value)} rows={4} />
      {content.suggestedMetadata && <div className="field"><span className="field__label">Suggested metadata</span><SuggestedMetadata data={content.suggestedMetadata} /></div>}
      {content.transcript && <EditableField id="ai-transcript" label="Transcript" value={content.transcript} rows={6} readOnly />}
      {isAdmin && hasWebsiteArticle && <EditableField id="ai-article" label="Website article draft" value={edited.websiteArticleDraft} onChange={(value) => updateField('websiteArticleDraft', value)} rows={8} />}
      {isAdmin && hasBlueskyPost && <EditableField id="ai-bluesky-post" label="Bluesky post draft" value={edited.blueskyPostDraft} onChange={(value) => updateField('blueskyPostDraft', value)} rows={5} />}
      {isAdmin && (hasWebsiteArticle || hasBlueskyPost) && <p className="text-muted ai-panel__hint">Manage, edit, save and publish these drafts in the Website Article / Bluesky sections below.</p>}
    </div>}
  </Card>
}

function EditableField({ id, label, value, onChange, rows, readOnly = false }) {
  const textareaRef = useRef(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const styles = window.getComputedStyle(textarea)
    const borderHeight = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth)
    textarea.style.height = `${textarea.scrollHeight + borderHeight}px`
  }, [value, rows])

  return <div className="field"><label className="field__label" htmlFor={id}>{label}</label><textarea ref={textareaRef} id={id} className="field__input field__textarea" rows={rows} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} readOnly={readOnly} /></div>
}

function SuggestedMetadata({ data }) {
  if (Array.isArray(data)) return <p>{data.join(', ')}</p>
  if (typeof data !== 'object') return <p>{String(data)}</p>
  return <dl className="ai-panel__metadata">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>
}
