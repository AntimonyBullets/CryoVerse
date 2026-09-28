import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Card, Spinner } from '../../components/ui'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import { getAuditHistory } from '../../services/adminService.js'

const TARGET_TYPES = ['User', 'Resource', 'Expedition', 'XPost']
const ACTION_VARIANT = {
  resource_approved: 'success',
  resource_published: 'success',
  website_article_published: 'success',
  x_post_published: 'success',
  resource_rejected: 'danger',
  x_post_failed: 'danger',
  resource_unpublished: 'warning',
  website_article_unpublished: 'warning',
  role_changed: 'info',
  resource_submitted: 'info',
}

export default function AdminAuditLog() {
  const [targetType, setTargetType] = useState('')
  const [page, setPage] = useState(1)
  const [state, setState] = useState({ history: [], pagination: { page: 1, limit: 20, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getAuditHistory({ targetType: targetType || undefined, page, limit: 20 }).then(setState).catch(setError).finally(() => setLoading(false))
  }, [targetType, page])

  useEffect(() => { load() }, [load])

  return <div className="stack">
    <Card>
      <div className="field">
        <label className="field__label" htmlFor="audit-target-type">Target type</label>
        <select id="audit-target-type" className="field__input" value={targetType}
          onChange={(e) => { setPage(1); setTargetType(e.target.value) }}>
          <option value="">All</option>
          {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </Card>

    {error && <Alert variant="danger" title="Couldn't load the audit log">{error.message}</Alert>}
    {loading && <div className="page-loading"><Spinner label="Loading audit log" /></div>}

    {!loading && !error && <Card>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr>
          </thead>
          <tbody>
            {state.history.map((entry) => (
              <tr key={entry._id}>
                <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}</td>
                <td>{entry.actorId?.name || entry.actorId?.email || 'Unknown'}</td>
                <td><Badge variant={ACTION_VARIANT[entry.action] || 'neutral'}>{entry.action.replaceAll('_', ' ')}</Badge></td>
                <td>{entry.targetType} <span className="text-muted">{String(entry.targetId).slice(-8)}</span></td>
                <td>
                  {entry.fromStatus && entry.toStatus && <span>{entry.fromStatus} → {entry.toStatus}</span>}
                  {entry.feedback && <p className="text-muted">{entry.feedback}</p>}
                  {entry.details && <pre className="admin-table__details">{JSON.stringify(entry.details)}</pre>}
                </td>
              </tr>
            ))}
            {state.history.length === 0 && <tr><td colSpan={5} className="admin-table__empty">No audit entries match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <AdminPagination pagination={state.pagination} onPageChange={setPage} />
    </Card>}
  </div>
}
