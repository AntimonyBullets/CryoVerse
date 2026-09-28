import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Card, Spinner } from '../../components/ui'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { changeUserRole, listUsers } from '../../services/adminService.js'

const ROLES = ['user', 'contributor', 'admin']
const ROLE_BADGE = { user: 'neutral', contributor: 'info', admin: 'success' }

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [state, setState] = useState({ users: [], pagination: { page: 1, limit: 20, total: 0 } })
  const [filters, setFilters] = useState({ role: '', search: '' })
  const [page, setPage] = useState(1)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [rowError, setRowError] = useState({ id: null, message: null })

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listUsers({ page, limit: 20, role: filters.role || undefined, search: filters.search || undefined })
      .then(setState)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [page, filters.role, filters.search])

  useEffect(() => { load() }, [load])

  async function handleRoleChange(id, role) {
    setUpdatingId(id)
    setRowError({ id: null, message: null })
    try {
      const updated = await changeUserRole(id, role)
      setState((current) => ({
        ...current,
        users: current.users.map((u) => (u.id === id ? updated || u : u)),
      }))
    } catch (err) {
      setRowError({ id, message: err.message })
    } finally {
      setUpdatingId(null)
    }
  }

  return <div className="stack">
    <Card>
      <div className="admin-filters">
        <div className="field">
          <label className="field__label" htmlFor="user-search">Search</label>
          <input id="user-search" className="field__input" placeholder="Name or email"
            value={filters.search}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, search: e.target.value })) }} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="user-role-filter">Role</label>
          <select id="user-role-filter" className="field__input" value={filters.role}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, role: e.target.value })) }}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </Card>

    {error && <Alert variant="danger" title="Couldn't load users">{error.message}</Alert>}
    {loading && <div className="page-loading"><Spinner label="Loading users" /></div>}

    {!loading && !error && <Card>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Change role</th></tr>
          </thead>
          <tbody>
            {state.users.map((u) => {
              const isSelf = String(u.id) === String(currentUser?.id)
              return <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><Badge variant={ROLE_BADGE[u.role] || 'neutral'}>{u.role}</Badge></td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                <td>
                  <select
                    className="field__input admin-table__role-select"
                    value={u.role}
                    disabled={isSelf || updatingId === u.id}
                    title={isSelf ? 'You cannot change your own role' : undefined}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {rowError.id === u.id && <p className="field__error">{rowError.message}</p>}
                </td>
              </tr>
            })}
            {state.users.length === 0 && <tr><td colSpan={5} className="admin-table__empty">No users match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <AdminPagination pagination={state.pagination} onPageChange={setPage} />
    </Card>}
  </div>
}
