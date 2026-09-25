import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteResource, listMyResources } from '../services/repositoryService.js'
import { statusMeta } from '../utils/resourceStatus.js'

export default function Dashboard() {
  const { user } = useAuth()
  const [resources, setResources] = useState(null)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const load = useCallback(() => listMyResources().then(setResources).catch(setError), [])
  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!window.confirm('Delete this resource? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteResource(id)
      setResources((current) => current.filter((item) => (item._id || item.id) !== id))
    } catch (err) {
      setError(err)
    } finally {
      setDeletingId(null)
    }
  }

  return <>
    <PageHeader eyebrow="Dashboard" title={user?.name ? `Welcome, ${user.name}` : 'Your resources'} subtitle="Manage the resources you've submitted to Cryoverse." />
    <section className="section"><div className="container">
      <div className="dashboard-toolbar"><Button to="/dashboard/new">New resource</Button></div>
      {error && <Alert variant="danger" title="Couldn't load your resources">{error.message}</Alert>}
      {!error && resources === null && <div className="page-loading"><Spinner label="Loading your resources" /></div>}
      {!error && resources?.length === 0 && <EmptyState title="You haven't added any resources yet">Create your first resource to submit it for review.</EmptyState>}
      {!error && resources?.length > 0 && <div className="stack">{resources.map((resource) => {
        const id = resource._id || resource.id
        const meta = statusMeta(resource.status)
        return <Card key={id}><div className="dashboard-item"><div><h3><Link to={`/repository/${id}`}>{resource.title}</Link></h3><div className="resource-card__meta"><Badge variant="neutral">{resource.type}</Badge><Badge variant={meta.variant}>{meta.label}</Badge></div></div><div className="dashboard-item__actions"><Button to={`/dashboard/${id}/edit`} variant="secondary" size="sm">Edit</Button><Button variant="danger" size="sm" loading={deletingId === id} onClick={() => handleDelete(id)}>Delete</Button></div></div></Card>
      })}</div>}
    </div></section>
  </>
}
