import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

/** App shell: skip link + navbar + routed page + footer. */
export default function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main" className="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
