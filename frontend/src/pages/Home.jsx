import { Button, Card } from '../components/ui'

// Static descriptive copy only. Real counts/featured items will come from the API in later iterations.
const FEATURES = [
  {
    title: 'Curated repository',
    text: 'Reports, publications and dataset metadata from public polar-science sources, with source links and attribution preserved.',
  },
  {
    title: 'Expeditions',
    text: 'Explore resources, photographs and videos grouped by the expedition they belong to.',
  },
  {
    title: 'Reviewed outreach',
    text: 'AI-assisted summaries and explanations are always reviewed by a human before publication.',
  },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="eyebrow">Polar science outreach portal</span>
          <h1>Explore the science of the poles.</h1>
          <p className="hero__lead">
            Cryoverse brings polar-science reports, publications, datasets and expedition media
            together in one place, making research easier to find, understand and share.
          </p>
          <div className="hero__actions">
            <Button to="/repository" size="lg">Browse repository</Button>
            <Button to="/expeditions" variant="secondary" size="lg">View expeditions</Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>What Cryoverse offers</h2>
          <div className="grid grid--3">
            {FEATURES.map((f) => (
              <Card key={f.title} title={f.title}>
                <p className="text-muted">{f.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
