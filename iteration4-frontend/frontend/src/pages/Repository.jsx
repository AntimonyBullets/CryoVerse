import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Card, EmptyState, Input, Spinner } from '../components/ui'
import { listResources } from '../services/repositoryService.js'
import { listExpeditions } from '../services/expeditionService.js'
import { statusMeta } from '../utils/resourceStatus.js'

export default function Repository() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState({ search: params.get('search') || '', type: params.get('type') || '', category: params.get('category') || '', expeditionId: params.get('expeditionId') || '' })
  const [resources, setResources] = useState(null)
  const [expeditions, setExpeditions] = useState([])
  const [error, setError] = useState(null)
  useEffect(() => { listExpeditions().then(setExpeditions).catch(() => {}) }, [])
  useEffect(() => {
    let active = true
    listResources(filters).then((data) => active && setResources(data)).catch((err) => active && setError(err))
    return () => { active = false }
  }, [filters])
  function update(key, value) {
    const next = { ...filters, [key]: value }
    setResources(null)
    setError(null)
    setFilters(next)
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
  }
  return <><PageHeader eyebrow="Repository" title="Resource repository" subtitle="Reports, publications, datasets and media from public polar-science sources." /><section className="section"><div className="container"><div className="archive-frame"><div className="repository-filters"><Input label="Search" value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Search title, description, source…" /><div className="field"><label className="field__label" htmlFor="resource-type">Type</label><select id="resource-type" className="field__input" value={filters.type} onChange={(event) => update('type', event.target.value)}><option value="">All types</option>{['report', 'publication', 'dataset', 'media'].map((type) => <option key={type} value={type}>{type}</option>)}</select></div><Input label="Category" value={filters.category} onChange={(event) => update('category', event.target.value)} placeholder="All categories" /><div className="field"><label className="field__label" htmlFor="resource-expedition">Expedition</label><select id="resource-expedition" className="field__input" value={filters.expeditionId} onChange={(event) => update('expeditionId', event.target.value)}><option value="">All expeditions</option>{expeditions.map((expedition) => <option key={expedition._id || expedition.id} value={expedition._id || expedition.id}>{expedition.name}</option>)}</select></div></div>{error && <Alert variant="danger" title="Couldn't load resources">{error.message}</Alert>}{!error && !resources && <div className="page-loading"><Spinner label="Loading resources" /></div>}{!error && resources?.length === 0 && <EmptyState title="No matching resources">Try broadening your search or clearing a filter.</EmptyState>}{!error && resources?.length > 0 && <div className="grid grid--3">{resources.map((resource) => { const id = resource._id || resource.id; const meta = statusMeta(resource.status); const expedition = resource.expeditionId;   return <Card key={id} as={Link} to={`/repository/${id}`} className="resource-card"><div className="resource-card__meta">{resource.type && <Badge variant="neutral">{resource.type}</Badge>}<Badge variant={meta.variant}>{meta.label}</Badge></div><h3>{resource.title}</h3>{resource.description && <p className="text-muted resource-card__excerpt">{resource.description}</p>}<p className="text-muted">{[resource.category, resource.date && new Date(resource.date).toLocaleDateString(), expedition?.name].filter(Boolean).join(' · ')}</p></Card> })}</div>}<div className="archive-frame__note">Reports / papers / datasets / media</div></div></div></section></>
}
