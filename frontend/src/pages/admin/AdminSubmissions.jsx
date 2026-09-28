import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Spinner } from '../../components/ui'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import { listSubmissions, moderateResource, publishResource, unpublishResource } from '../../services/adminService.js'
import { statusMeta } from '../../utils/resourceStatus.js'

const STATUS_TABS = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
]

export default function AdminSubmissions() {
  const [status, setStatus] = useState('submitted')
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ resources: [], pagination: { page: 1, limit: 20, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({ id: null, message: null })
  const [rejectingId, setRejectingId] = useState(null)
  const [feedback, setFeedback] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listSubmissions({ status, page, limit: 20 }).then(setState).catch(setError).finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => { load() }, [load])

  function replaceResource(id, updated) {
    setState((current) => ({
      ...current,
      resources: current.resources.map((row) => {
        const rowId = row.resource._id || row.resource.id
        return rowId === id ? { ...row, resource: updated || row.resource } : row
      }),
    }))
  }

  async function runAction(id, action) {
    setBusyId(id)
    setRowError({ id: null, message: null })
    try {
      let updated
      if (action === 'approve') updated = await moderateResource(id, 'approve')
      else if (action === 'publish') ({ resource: updated } = await publishResource(id))
      else if (action === 'unpublish') updated = await unpublishResource(id)
      replaceResource(id, updated)
    } catch (err) {
      setRowError({ id, message: err.message })
    } finally {
      setBusyId(null)
    }
  }

  async function submitRejection(id) {
    if (!feedback.trim()) {
      setRowError({ id, message: 'Feedback is required to reject a resource.' })
      return
    }
    setBusyId(id)
    setRowError({ id: null, message: null })
    try {
      const updated = await moderateResource(id, 'reject', feedback.trim())
      replaceResource(id, updated)
      setRejectingId(null)
      setFeedback('')
    } catch (err) {
      setRowError({ id, message: err.message })
    } finally {
      setBusyId(null)
    }
  }

  return <div className="stack">
    <nav className="admin-tabs admin-tabs--sub" aria-label="Filter by status">
      {STATUS_TABS.map((tab) => (
        <button key={tab.value} type="button"
          className={`admin-tabs__link${status === tab.value ? ' admin-tabs__link--active' : ''}`}
          onClick={() => { setStatus(tab.value); setPage(1) }}>
          {tab.label}
        </button>
      ))}
    </nav>

    {error && <Alert variant="danger" title="Couldn't load submissions">{error.message}</Alert>}
    {loading && <div className="page-loading"><Spinner label="Loading submissions" /></div>}

    {!loading && !error && state.resources.length === 0 && (
      <Card><p className="text-muted">No {status} resources right now.</p></Card>
    )}

    {!loading && !error && state.resources.map(({ resource, aiContent }) => {
      const id = resource._id || resource.id
      const meta = statusMeta(resource.status)
      const isBusy = busyId === id
      return <Card key={id}>
        <div className="admin-submission">
          <div className="admin-submission__main">
            <h3><Link to={`/repository/${id}`}>{resource.title}</Link></h3>
            <div className="resource-card__meta">
              <Badge variant="neutral">{resource.type}</Badge>
              <Badge variant={meta.variant}>{meta.label}</Badge>
              {resource.contributorId?.name && <Badge variant="info">{resource.contributorId.name}</Badge>}
              {resource.expeditionId?.name && <Badge variant="info">{resource.expeditionId.name}</Badge>}
            </div>
            <p className="text-muted">{resource.description}</p>
            {resource.reviewReason && <Alert variant="warning" title="Previous rejection feedback">{resource.reviewReason}</Alert>}
            <p className="text-muted admin-submission__ai">
              {aiContent ? 'AI content has been generated for this resource.' : 'No AI content generated yet.'}
              {aiContent?.websiteArticleDraft ? ' Website article draft available.' : ''}
              {aiContent?.blueskyPostDraft ? ' Bluesky post draft available.' : ''}
            </p>
          </div>
          <div className="admin-submission__actions">
            {resource.status === 'submitted' && <>
              <Button size="sm" loading={isBusy} onClick={() => runAction(id, 'approve')}>Approve</Button>
              <Button size="sm" variant="danger" disabled={isBusy} onClick={() => { setRejectingId(id); setFeedback('') }}>Reject</Button>
            </>}
            {resource.status === 'approved' && (
              <Button size="sm" loading={isBusy} onClick={() => runAction(id, 'publish')}>Publish</Button>
            )}
            {resource.status === 'published' && (
              <Button size="sm" variant="secondary" loading={isBusy} onClick={() => runAction(id, 'unpublish')}>Unpublish</Button>
            )}
            <Button size="sm" variant="ghost" to={`/repository/${id}`}>View</Button>
          </div>
        </div>
        {rejectingId === id && <div className="admin-submission__reject">
          <label className="field__label" htmlFor={`feedback-${id}`}>Rejection feedback (required)</label>
          <textarea id={`feedback-${id}`} className="field__input field__textarea" rows={3}
            value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <div className="admin-submission__actions">
            <Button size="sm" loading={isBusy} onClick={() => submitRejection(id)}>Submit rejection</Button>
            <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => { setRejectingId(null); setFeedback('') }}>Cancel</Button>
          </div>
        </div>}
        {rowError.id === id && <Alert variant="danger">{rowError.message}</Alert>}
      </Card>
    })}
    <AdminPagination pagination={state.pagination} onPageChange={setPage} />
  </div>
}
