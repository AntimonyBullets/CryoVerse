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
          <EmptyState title="Expeditions will appear here">
            This page will list expeditions once it is connected to the backend API.
          </EmptyState>
        </div>
      </section>
    </>
  )
}
