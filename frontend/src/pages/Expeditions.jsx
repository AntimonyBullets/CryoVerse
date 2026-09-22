import PageHeader from '../components/layout/PageHeader.jsx'
import { EmptyState } from '../components/ui'

// Placeholder. Expedition data and galleries arrive in Iteration 3 via src/services/.
export default function Expeditions() {
  return (
    <>
      <PageHeader
        eyebrow="Expeditions"
        title="Expeditions"
        subtitle="Explore resources and media grouped by polar expedition."
      />
      <section className="section">
        <div className="container">
          <div className="archive-frame archive-frame--expeditions">
            <div className="archive-frame__index">02 <span>EXPEDITION REGISTER</span></div>
            <EmptyState title="The register is being prepared">
              This page will list expeditions once it is connected to the backend API.
            </EmptyState>
            <div className="archive-frame__note">Routes / crews / observations / memory</div>
          </div>
        </div>
      </section>
    </>
  )
}
