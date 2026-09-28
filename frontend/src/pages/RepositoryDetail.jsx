import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import AIContentPanel from '../components/ai/AIContentPanel.jsx'
import ArticlePanel from '../components/article/ArticlePanel.jsx'
import BlueskyPanel from '../components/bluesky/BlueskyPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { generateResourceAIContent, getResource } from '../services/repositoryService.js'
import { moderateResource, publishResource, unpublishResource } from '../services/adminService.js'
import { statusMeta } from '../utils/resourceStatus.js'

const canGenerateAI = (user, resource) => (
  user?.role === 'admin'
  || (user?.role === 'contributor' && String(resource?.contributorId) === String(user.id))
)

export default function RepositoryDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [result, setResult] = useState({ id: null, resource: null, error: null })
  const [preview, setPreview] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [moderating, setModerating] = useState(false)
  const [moderationError, setModerationError] = useState(null)
  const [rejecting, setRejecting] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    let active = true
    getResource(id).then((resource) => active && setResult({ id, resource, error: null })).catch((error) => active && setResult({ id, resource: null, error }))
    return () => { active = false }
  }, [id])
  const resource = result.id === id ? result.resource : null
  const error = result.id === id ? result.error : null
  if (error) return <section className="section"><div className="container"><Alert variant="danger" title="Couldn't load this resource">{error.message}</Alert><p><Link to="/repository">Back to repository</Link></p></div></section>
  if (!resource) return <section className="section"><div className="container page-loading"><Spinner label="Loading resource" /></div></section>
  if (user?.role === 'user' && resource.status !== 'published') return <section className="section"><div className="container"><Alert variant="danger" title="Resource not found">This resource is not available.</Alert><p><Link to="/repository">Back to repository</Link></p></div></section>
  const meta = statusMeta(resource.status)
  const fileUrl = resource.fileUrl
  const isPdf = /\.pdf($|\?)/i.test(fileUrl || '') || /\/raw\/upload\//i.test(fileUrl || '')
  const isVideo = /\.(mp4|webm|mov|m4v)($|\?)/i.test(fileUrl || '') || /\/video\/upload\//i.test(fileUrl || '')
  const isImage = /\.(png|jpe?g|gif|webp|avif)($|\?)/i.test(fileUrl || '') || /\/image\/upload\//i.test(fileUrl || '')
  const expedition = resource.expeditionId

  async function runModeration(action) {
    setModerating(true)
    setModerationError(null)
    try {
      let updated
      if (action === 'approve') updated = await moderateResource(id, 'approve')
      else if (action === 'publish') ({ resource: updated } = await publishResource(id))
      else if (action === 'unpublish') updated = await unpublishResource(id)
      setResult({ id, resource: updated || resource, error: null })
    } catch (err) {
      setModerationError(err.message)
    } finally {
      setModerating(false)
    }
  }

  async function submitRejection() {
    if (!feedback.trim()) { setModerationError('Feedback is required to reject a resource.'); return }
    setModerating(true)
    setModerationError(null)
    try {
      const updated = await moderateResource(id, 'reject', feedback.trim())
      setResult({ id, resource: updated || resource, error: null })
      setRejecting(false)
      setFeedback('')
    } catch (err) {
      setModerationError(err.message)
    } finally {
      setModerating(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow={resource.type || 'Resource'} title={resource.title} subtitle={resource.category} />
      <section className="section">
        <div className="container">
          <Card>
            <div className="resource-card__meta">
              {resource.type && <Badge variant="neutral">{resource.type}</Badge>}
              {resource.status && <Badge variant={meta.variant}>{meta.label}</Badge>}
              {(resource.tags || []).map((tag) => <Badge key={tag} variant="info">{tag}</Badge>)}
            </div>
            {resource.description && <p>{resource.description}</p>}
            <dl className="resource-details">
              {resource.category && <><dt>Category</dt><dd>{resource.category}</dd></>}
              {resource.date && <><dt>Date</dt><dd>{new Date(resource.date).toLocaleDateString()}</dd></>}
              {expedition && <><dt>Expedition</dt><dd><Link to={`/expeditions/${expedition._id || expedition.id}`}>{expedition.name}</Link></dd></>}
              {(resource.sourceUrl || resource.source) && <><dt>Source</dt><dd><a href={resource.sourceUrl || resource.source} target="_blank" rel="noreferrer">{resource.sourceUrl || resource.source}</a></dd></>}
            </dl>
            {fileUrl && <div className="resource-media">
              {isPdf
                ? <><Button onClick={() => setPreview(true)}>Preview PDF</Button> <a className="btn btn--secondary btn--md" href={fileUrl} target="_blank" rel="noreferrer">Open / Download PDF</a></>
                : isImage
                  ? <a href={fileUrl} target="_blank" rel="noreferrer"><img src={fileUrl} alt={resource.title} /></a>
                  : isVideo
                    ? <video controls src={fileUrl} className="resource-video">Your browser does not support video playback.</video>
                    : <a href={fileUrl} target="_blank" rel="noreferrer">Open attached media</a>}
            </div>}
          </Card>

          {isAdmin && <Card title="Admin moderation" className="admin-moderation-card">
            {moderationError && <Alert variant="danger">{moderationError}</Alert>}
            <div className="ai-panel__actions">
              {resource.status === 'submitted' && <>
                <Button size="sm" loading={moderating} onClick={() => runModeration('approve')}>Approve</Button>
                <Button size="sm" variant="danger" disabled={moderating} onClick={() => { setRejecting(true); setFeedback('') }}>Reject</Button>
              </>}
              {resource.status === 'approved' && <Button size="sm" loading={moderating} onClick={() => runModeration('publish')}>Publish resource</Button>}
              {resource.status === 'published' && <Button size="sm" variant="secondary" loading={moderating} onClick={() => runModeration('unpublish')}>Unpublish resource</Button>}
            </div>
            {rejecting && <div className="admin-submission__reject">
              <label className="field__label" htmlFor="reject-feedback">Rejection feedback (required)</label>
              <textarea id="reject-feedback" className="field__input field__textarea" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
              <div className="ai-panel__actions">
                <Button size="sm" loading={moderating} onClick={submitRejection}>Submit rejection</Button>
                <Button size="sm" variant="ghost" disabled={moderating} onClick={() => { setRejecting(false); setFeedback('') }}>Cancel</Button>
              </div>
            </div>}
          </Card>}

          {canGenerateAI(user, resource) && <AIContentPanel
            title="AI Content"
            description="Generate a summary and optional outreach drafts from this resource. Edits here are local only — nothing is saved automatically."
            generate={(options, meta) => generateResourceAIContent(id, options, meta)}
            isAdmin={isAdmin}
            onGenerated={() => setRefreshToken((t) => t + 1)}
          />}

          {isAdmin && <ArticlePanel targetType="resource" targetId={id} refreshToken={refreshToken} />}
          {isAdmin && <BlueskyPanel targetType="resource" targetId={id} refreshToken={refreshToken} />}

          <p><Button to="/repository" variant="ghost">Back to repository</Button></p>
        </div>
      </section>
      {preview && <div className="modal-backdrop" role="presentation" onClick={() => setPreview(false)}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="PDF preview" onClick={(event) => event.stopPropagation()}>
          <Button className="modal__close" variant="ghost" aria-label="Close PDF preview" onClick={() => setPreview(false)}>×</Button>
          <iframe title={`${resource.title} PDF preview`} src={fileUrl} className="pdf-preview" />
        </div>
      </div>}
    </>
  )
}
