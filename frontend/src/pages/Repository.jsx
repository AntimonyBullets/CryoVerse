import PageHeader from '../components/layout/PageHeader.jsx'
import { EmptyState } from '../components/ui'

// Placeholder. Listing, search and filters are Iteration 2–3 and will load data via src/services/.
export default function Repository() {
  return (
    <>
      <PageHeader
        eyebrow="Repository"
        title="Resource repository"
        subtitle="Reports, publications, datasets and media from public polar-science sources."
      />
      <section className="section">
        <div className="container">
          <div className="archive-frame">
            <div className="archive-frame__index">01 <span>RESOURCE INDEX</span></div>
            <EmptyState title="The index is being prepared">
              This page will list resources once it is connected to the backend API.
            </EmptyState>
            <div className="archive-frame__note">Reports / papers / datasets / media</div>
          </div>
        </div>
      </section>
    </>
  )
}
