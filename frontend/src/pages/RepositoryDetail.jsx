import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, Spinner } from '../components/ui'
import { getResource } from '../services/repositoryService.js'
import { statusMeta } from '../utils/resourceStatus.js'

export default function RepositoryDetail() {
  const { id } = useParams()
  const [result, setResult] = useState({ id: null, resource: null, error: null })
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
  return <><PageHeader eyebrow={resource.type || 'Resource'} title={resource.title} subtitle={resource.category} /><section className="section"><div className="container"><Card><div className="resource-card__meta">{resource.status && <Badge variant={meta.variant}>{meta.label}</Badge>}{(resource.tags || []).map((tag) => <Badge key={tag} variant="info">{tag}</Badge>)}</div>{resource.description && <p>{resource.description}</p>}{(resource.sourceUrl || resource.source) && <p><strong>Source: </strong><a href={resource.sourceUrl || resource.source} target="_blank" rel="noreferrer">{resource.sourceUrl || resource.source}</a></p>}</Card><p><Button to="/repository" variant="ghost">Back to repository</Button></p></div></section></>
}
