import { Button, EmptyState } from '../components/ui'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <EmptyState
          title="Page not found"
          action={<Button to="/">Back to home</Button>}
        >
          The page you are looking for does not exist.
        </EmptyState>
      </div>
    </section>
  )
}
