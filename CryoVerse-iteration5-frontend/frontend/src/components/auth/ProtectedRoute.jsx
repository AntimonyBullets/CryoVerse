import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Alert } from '../ui'
import Spinner from '../ui/Spinner.jsx'

/**
 * Guards nested routes behind authentication, and optionally a role check.
 * `roles`, when provided, restricts access to users whose role is included
 * in the list (e.g. `roles={['admin']}`). Omitting it preserves the original
 * "must be logged in" behavior used by Iterations 1-4.
 */
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) return <div className="container page-loading"><Spinner label="Restoring session" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(user?.role)) {
    return <section className="section"><div className="container">
      <Alert variant="danger" title="Access denied">You do not have permission to view this page.</Alert>
    </div></section>
  }
  return <Outlet />
}
