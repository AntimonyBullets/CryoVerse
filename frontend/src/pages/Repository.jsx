import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Card, EmptyState, Spinner } from '../components/ui'
import { listResources } from '../services/repositoryService.js'
import { statusMeta } from '../utils/resourceStatus.js'

export default function Repository() {
  const [resources, setResources] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    listResources().then((data) => active && setResources(data)).catch((err) => active && setError(err))
    return () => { active = false }
  }, [])
  return <><PageHeader eyebrow="Repository" title="Resource repository" subtitle="Reports, publications, datasets and media from public polar-science sources." /><section className="section"><div className="container"><div className="archive-frame">{error && <Alert variant="danger" title="Couldn't load resources">{error.message}</Alert>}{!error && !resources && <div className="page-loading"><Spinner label="Loading resources" /></div>}{!error && resources?.length === 0 && <EmptyState title="No resources published yet">Approved resources will appear here once contributors submit them.</EmptyState>}{!error && resources?.length > 0 && <div className="grid grid--3">{resources.map((resource) => { const id = resource._id || resource.id; const meta = statusMeta(resource.status); return <Card key={id} as={Link} to={`/repository/${id}`} className="resource-card" title={resource.title}><div className="resource-card__meta">{resource.type && <Badge variant="neutral">{resource.type}</Badge>}<Badge variant={meta.variant}>{meta.label}</Badge></div>{resource.description && <p className="text-muted resource-card__excerpt">{resource.description}</p>}</Card> })}</div>}<div className="archive-frame__note">Reports / papers / datasets / media</div></div></div></section></>
}
