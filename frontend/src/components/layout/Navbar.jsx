import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '../ui'

// Public navigation only. Auth-aware items (dashboard, logout) arrive with Iteration 2.
const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/repository', label: 'Repository' },
  { to: '/expeditions', label: 'Expeditions' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={close}>
          <span className="navbar__logo" aria-hidden="true">❄</span>
          Cryoverse
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="visually-hidden">Toggle navigation</span>
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>

        <nav id="primary-nav" className={`navbar__nav${open ? ' navbar__nav--open' : ''}`} aria-label="Primary">
          <ul className="navbar__links">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className="navbar__link" onClick={close}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="navbar__actions">
            <Button to="/login" variant="ghost" size="sm" onClick={close}>Log in</Button>
            <Button to="/register" size="sm" onClick={close}>Register</Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
