import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import AIContentPanel from '../components/ai/AIContentPanel.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { generateResourceAIContent, getResource } from '../services/repositoryService.js'
import { statusMeta } from '../utils/resourceStatus.js'

const canGenerateAI = (user, resource) => (
  user?.role === 'admin'
  || (user?.role === 'contributor' && String(resource?.contributorId) === String(user.id))
)

export default function RepositoryDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [result, setResult] = useState({ id: null, resource: null, error: null })
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    let active = true
    getResource(id).then((resource) => active && setResult({ id, resource, error: null })).catch((error) => active && setResult({ id, resource: null, error }))
    return () => { active = false }
  }, [id])
  const resource = result.id === id ? result.resource : null
  const error = result.id === id ? result.error : null
  if (error) return <section className="section"><div className="container"><Alert variant="danger" title="Couldn't load this resource">{error.message}</Alert><p><Link to="/repository">Back to repository</Link></p></div></section>
  if (!resource) return <section className="section"><div className="container page-loading"><Spinner label="Loading resource" /></div></section>
  const meta = statusMeta(resource.status)
  const fileUrl = resource.fileUrl
  const isPdf = /\.pdf($|\?)/i.test(fileUrl || '') || /\/raw\/upload\//i.test(fileUrl || '')
  const isVideo = /\.(mp4|webm|mov|m4v)($|\?)/i.test(fileUrl || '') || /\/video\/upload\//i.test(fileUrl || '')
  const isImage = /\.(png|jpe?g|gif|webp|avif)($|\?)/i.test(fileUrl || '') || /\/image\/upload\//i.test(fileUrl || '')
  const expedition = resource.expeditionId
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
          {canGenerateAI(user, resource) && <AIContentPanel
            title="AI Content"
            description="Generate a summary and optional outreach drafts from this resource. Edits here are local only — nothing is saved automatically."
            generate={(options, meta) => generateResourceAIContent(id, options, meta)}
          />}
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
