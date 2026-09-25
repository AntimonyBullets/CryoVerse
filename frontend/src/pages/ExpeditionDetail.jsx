import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Card, EmptyState, Spinner } from '../components/ui'
import { getExpedition } from '../services/expeditionService.js'

export default function ExpeditionDetail() {
  const { id } = useParams(); const [state, setState] = useState({ item: null, error: null })
  useEffect(() => { let active = true; getExpedition(id).then((item) => active && setState({ item, error: null })).catch((error) => active && setState({ item: null, error })); return () => { active = false } }, [id])
  if (state.error) return <section className="section"><div className="container"><Alert variant="danger" title="Couldn't load this expedition">{state.error.message}</Alert><Link to="/expeditions">Back to expeditions</Link></div></section>
  if (!state.item) return <div className="container page-loading"><Spinner label="Loading expedition" /></div>
  const { item } = state
  return <><PageHeader eyebrow="Expedition" title={item.name} subtitle={[item.year, item.location, item.region].filter(Boolean).join(' · ')} /><section className="section"><div className="container"><Card><p>{item.description}</p><h2>Associated resources</h2>{!item.resources?.length && <EmptyState title="No public resources yet">Resources linked to this expedition will appear here.</EmptyState>}{item.resources?.length > 0 && <div className="grid grid--3">{item.resources.map((resource) => <Card key={resource._id || resource.id} as={Link} to={`/repository/${resource._id || resource.id}`}><Badge variant="neutral">{resource.type}</Badge><h3>{resource.title}</h3></Card>)}</div>}</Card><p><Link to="/expeditions">Back to expeditions</Link></p></div></section></>
}
