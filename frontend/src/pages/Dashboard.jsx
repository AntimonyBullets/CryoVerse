import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, EmptyState, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteResource, listMyResources } from '../services/repositoryService.js'
import { statusMeta } from '../utils/resourceStatus.js'

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()
  const [resources, setResources] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Adding, editing and deleting resources stays contributor/admin only, but
  // the list itself is scoped by ownership on the backend.
  const canContribute = ['contributor', 'admin'].includes(user?.role)

  const load = useCallback(() => {
    if (!isAuthenticated) return
    let active = true
    setLoading(true)
    setError(null)
    listMyResources()
      .then((data) => {
        if (active) setResources(user?.role === 'user' ? data.filter((resource) => resource.status === 'published') : data)
      })
      .catch((err) => { if (active) { setResources([]); setError(err) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isAuthenticated, user?.role])

  useEffect(() => load(), [load])

  if (user?.role === 'admin') return <Navigate to="/admin" replace />

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
      {canContribute && <div className="dashboard-toolbar"><Button to="/dashboard/new">New resource</Button></div>}
      {!canContribute && <Alert className="dashboard-access-alert" variant="info" title="Contributor access required">You can review the resources you have submitted, but adding or editing resources requires a contributor account.</Alert>}
      {error && <Alert variant="danger" title="Couldn't load your resources">{error.message}</Alert>}
      {!error && loading && <div className="page-loading"><Spinner label="Loading your resources" /></div>}
      {!error && !loading && resources?.length === 0 && <EmptyState title="You haven't added any resources yet">Create your first resource to submit it for review.</EmptyState>}
      {!error && !loading && resources?.length > 0 && <div className="stack">{resources.map((resource) => {
        const id = resource._id || resource.id
        const meta = statusMeta(resource.status)
        return <Card key={id}><div className="dashboard-item"><div className="dashboard-item__content"><h3><Link to={`/repository/${id}`}>{resource.title}</Link></h3><div className="resource-card__meta"><Badge variant="neutral">{resource.type}</Badge><Badge variant={meta.variant}>{meta.label}</Badge></div></div>{canContribute && <div className="dashboard-item__actions"><Button to={`/dashboard/${id}/edit`} variant="secondary" size="sm">Edit</Button><Button variant="danger" size="sm" loading={deletingId === id} onClick={() => handleDelete(id)}>Delete</Button></div>}</div></Card>
      })}</div>}
    </div></section>
  </>
}
