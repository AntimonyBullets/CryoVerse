import { useState } from 'react'
import { Alert, Button, Card, Spinner } from '../ui'

export default function AIContentPanel({ title, description, generate }) {
  const [options, setOptions] = useState({ generateWebsiteArticle: false, generateLinkedInPost: false })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)
  const [content, setContent] = useState(null)
  const [edited, setEdited] = useState({})

  async function run(regenerate = false) {
    setStatus('loading')
    setError(null)
    try {
      const result = await generate(options, { regenerate })
      const nextContent = result.aiContent || {}
      setContent(nextContent)
      setCached(result.cached)
      setEdited({
        summary: nextContent.summary || '',
        simplifiedExplanation: nextContent.simplifiedExplanation || '',
        websiteArticleDraft: nextContent.websiteArticleDraft || '',
        linkedInPostDraft: nextContent.linkedInPostDraft || '',
      })
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  const hasWebsiteArticle = Boolean(content?.websiteArticleDraft)
  const hasLinkedInPost = Boolean(content?.linkedInPostDraft)
  const missingCachedDrafts = cached && (
    (options.generateWebsiteArticle && !hasWebsiteArticle) ||
    (options.generateLinkedInPost && !hasLinkedInPost)
  )
  function updateField(key, value) { setEdited((current) => ({ ...current, [key]: value })) }

  return <Card title={title} className="ai-panel">
    {description && <p className="text-muted">{description}</p>}
    <label className="ai-panel__checkbox"><input type="checkbox" checked={options.generateWebsiteArticle} onChange={(e) => setOptions((current) => ({ ...current, generateWebsiteArticle: e.target.checked }))} />Generate website article</label>
    <label className="ai-panel__checkbox"><input type="checkbox" checked={options.generateLinkedInPost} onChange={(e) => setOptions((current) => ({ ...current, generateLinkedInPost: e.target.checked }))} />Generate LinkedIn post</label>
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
      {hasWebsiteArticle && <EditableField id="ai-article" label="Website article draft" value={edited.websiteArticleDraft} onChange={(value) => updateField('websiteArticleDraft', value)} rows={8} />}
      {hasLinkedInPost && <EditableField id="ai-linkedin" label="LinkedIn post draft" value={edited.linkedInPostDraft} onChange={(value) => updateField('linkedInPostDraft', value)} rows={5} />}
    </div>}
  </Card>
}

function EditableField({ id, label, value, onChange, rows, readOnly = false }) {
  return <div className="field"><label className="field__label" htmlFor={id}>{label}</label><textarea id={id} className="field__input field__textarea" rows={rows} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} readOnly={readOnly} /></div>
}

function SuggestedMetadata({ data }) {
  if (Array.isArray(data)) return <p>{data.join(', ')}</p>
  if (typeof data !== 'object') return <p>{String(data)}</p>
  return <dl className="ai-panel__metadata">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>
}
