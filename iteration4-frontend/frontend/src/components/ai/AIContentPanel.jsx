import { useState } from 'react'
import { Alert, Button, Card, Spinner } from '../ui'

/**
 * Reusable "Generate AI content" panel used by both the resource form and
 * the expedition detail page. `generate(options, meta)` should call the
 * matching service function (generateResourceAIContent / generateExpeditionAIContent)
 * and resolve to { cached, aiContent }.
 *
 * AI text fields are editable locally (contributor can tidy them up before
 * copying them elsewhere) — there is no backend endpoint to save edits, so
 * nothing here persists beyond this page session.
 */
export default function AIContentPanel({ title, description, generate }) {
  const [options, setOptions] = useState({ generateWebsiteArticle: false, generateLinkedInPost: false })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [error, setError] = useState(null)
  const [cached, setCached] = useState(false)
  const [content, setContent] = useState(null)
  const [edited, setEdited] = useState({})

  async function run(regenerate = false) {
    setStatus('loading')
    setError(null)
    try {
      const result = await generate(options, { regenerate })
      setContent(result.aiContent)
      setCached(result.cached)
      setEdited({
        summary: result.aiContent?.summary || '',
        simplifiedExplanation: result.aiContent?.simplifiedExplanation || '',
        websiteArticleDraft: result.aiContent?.websiteArticleDraft || '',
        linkedInPostDraft: result.aiContent?.linkedInPostDraft || '',
      })
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }

  function updateField(key, value) {
    setEdited((current) => ({ ...current, [key]: value }))
  }

  return (
    <Card title={title} className="ai-panel">
      {description && <p className="text-muted">{description}</p>}

      <label className="ai-panel__checkbox">
        <input
          type="checkbox"
          checked={options.generateWebsiteArticle}
          onChange={(e) => setOptions((c) => ({ ...c, generateWebsiteArticle: e.target.checked }))}
        />
        Generate website article
      </label>
      <label className="ai-panel__checkbox">
        <input
          type="checkbox"
          checked={options.generateLinkedInPost}
          onChange={(e) => setOptions((c) => ({ ...c, generateLinkedInPost: e.target.checked }))}
        />
        Generate LinkedIn post
      </label>

      <div className="ai-panel__actions">
        <Button type="button" loading={status === 'loading'} onClick={() => run(false)}>
          {status === 'loading' ? 'Generating…' : 'Generate AI content'}
        </Button>
        {status === 'success' && (
          <Button type="button" variant="secondary" size="sm" onClick={() => run(true)}>
            Regenerate
          </Button>
        )}
        {status === 'error' && (
          <Button type="button" variant="secondary" size="sm" onClick={() => run(false)}>
            Retry
          </Button>
        )}
      </div>

      {status === 'loading' && (
        <div className="ai-panel__loading"><Spinner size="sm" label="Generating AI content" /> This can take a little while for videos.</div>
      )}

      {status === 'error' && (
        <Alert variant="danger" title="AI generation failed">{error?.message || 'Something went wrong. Please try again.'}</Alert>
      )}

      {status === 'success' && content && (
        <div className="ai-panel__result">
          <Alert variant={cached ? 'info' : 'success'}>
            {cached ? 'Showing previously generated content for this item.' : 'AI content generated.'}
            {' '}AI-generated content — review and edit before publication.
          </Alert>

          <div className="field">
            <label className="field__label" htmlFor="ai-summary">Summary</label>
            <textarea
              id="ai-summary"
              className="field__input field__textarea"
              rows={4}
              value={edited.summary}
              onChange={(e) => updateField('summary', e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="ai-explanation">Simplified explanation</label>
            <textarea
              id="ai-explanation"
              className="field__input field__textarea"
              rows={4}
              value={edited.simplifiedExplanation}
              onChange={(e) => updateField('simplifiedExplanation', e.target.value)}
            />
          </div>

          {content.suggestedMetadata && (
            <div className="field">
              <span className="field__label">Suggested metadata</span>
              <SuggestedMetadata data={content.suggestedMetadata} />
            </div>
          )}

          {content.transcript && (
            <div className="field">
              <label className="field__label" htmlFor="ai-transcript">Transcript</label>
              <textarea
                id="ai-transcript"
                className="field__input field__textarea"
                rows={6}
                defaultValue={content.transcript}
                readOnly
              />
            </div>
          )}

          {options.generateWebsiteArticle && (
            <div className="field">
              <label className="field__label" htmlFor="ai-article">Website article draft</label>
              <textarea
                id="ai-article"
                className="field__input field__textarea"
                rows={8}
                value={edited.websiteArticleDraft}
                onChange={(e) => updateField('websiteArticleDraft', e.target.value)}
              />
            </div>
          )}

          {options.generateLinkedInPost && (
            <div className="field">
              <label className="field__label" htmlFor="ai-linkedin">LinkedIn post draft</label>
              <textarea
                id="ai-linkedin"
                className="field__input field__textarea"
                rows={5}
                value={edited.linkedInPostDraft}
                onChange={(e) => updateField('linkedInPostDraft', e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function SuggestedMetadata({ data }) {
  if (Array.isArray(data)) return <p>{data.join(', ')}</p>
  if (typeof data !== 'object') return <p>{String(data)}</p>
  return (
    <dl className="ai-panel__metadata">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
