import { NavLink, Outlet } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader.jsx'

const TABS = [
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/audit', label: 'Audit log' },
]

/** Shell for the admin dashboard: title band + tab navigation + routed sub-page. */
export default function AdminLayout() {
  return <>
    <PageHeader eyebrow="Admin" title="Admin dashboard" subtitle="Manage users, review submissions, and audit platform activity." />
    <section className="section">
      <div className="container">
        <nav className="admin-tabs" aria-label="Admin sections">
          {TABS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `admin-tabs__link${isActive ? ' admin-tabs__link--active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-tabs__panel">
          <Outlet />
        </div>
      </div>
    </section>
  </>
}
