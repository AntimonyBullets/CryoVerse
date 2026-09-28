import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

const STATS = [
  ['00', 'Research records', 'Reports / papers'],
  ['00', 'Expeditions', 'Field registers'],
  ['00', 'Datasets', 'Open observations'],
  ['00', 'Media', 'Images / film'],
]

const ARCHIVE_LINKS = [
  ['01', 'Research', 'Reports, papers and findings', '/repository'],
  ['02', 'Datasets', 'Measurements ready to explore', '/repository'],
  ['03', 'Expeditions', 'Routes, crews and field notes', '/expeditions'],
  ['04', 'Media', 'A visual record of the ice', '/repository'],
]

export default function Home() {
  const handleGlobeMove = (event) => {
    const globe = event.currentTarget.querySelector('.hollow-globe')
    if (!globe) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2
    globe.style.setProperty('--globe-tilt-x', `${y * -9}deg`)
    globe.style.setProperty('--globe-tilt-y', `${x * 12}deg`)
  }

  const resetGlobe = (event) => {
    const globe = event.currentTarget.querySelector('.hollow-globe')
    if (!globe) return
    globe.style.setProperty('--globe-tilt-x', '0deg')
    globe.style.setProperty('--globe-tilt-y', '0deg')
  }

  return (
    <div className="field-page">
      <div className="atmosphere" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>

      <section className="earth-section">
        <div className="field-index">CRYOVERSE / FIELD JOURNAL <span>01—05</span></div>
        <div className="earth-section__copy">
          <span className="field-kicker">Polar science / public archive</span>
          <h1>The ice<br /><em>remembers.</em></h1>
          <p>A living record of the polar world: research, expedition memory and observations gathered at the edge of the map.</p>
          <Button to="/repository" size="lg">Explore Repository <span aria-hidden="true">↗</span></Button>
        </div>
        <figure className="earth-object" aria-label="Photographic polar globe study" onMouseMove={handleGlobeMove} onMouseLeave={resetGlobe}>
          <div className="hollow-globe" aria-hidden="true">
            <span className="globe-surface"></span>
            <span className="globe-land globe-land--north"></span>
            <span className="globe-land globe-land--south"></span>
            <span className="globe-shine"></span>
            <span className="globe-contour globe-contour--vertical"></span>
            <span className="globe-contour globe-contour--horizontal"></span>
            <span className="globe-contour globe-contour--polar"></span>
          </div>
          <figcaption>POLAR SYMBOL / 0001</figcaption>
        </figure>
        <div className="earth-coordinate">78° 27′ S<br />106° 50′ W<br /><small>FIELD LOG / 2026</small></div>
      </section>

      <section className="specimen-section">
        <div className="section-index">02 <span>THE POLAR SPECIMEN</span></div>
        <div className="specimen-heading">
          <span className="field-kicker">Botanical record / frost study</span>
          <h2>Life, held<br /><em>in the ice.</em></h2>
          <p>An isolated specimen from the southern field: delicate, translucent and marked for study.</p>
        </div>
        <div className="botanical-plate" aria-label="Scientific six-petal flower specimen">
          <div className="botanical-flower">
            <span className="botanical-stem"></span>
            <span className="botanical-leaf botanical-leaf--left"></span>
            <span className="botanical-leaf botanical-leaf--right"></span>
            <span className="botanical-bloom">
              <i></i><i></i><i></i><i></i><i></i><i></i><b></b>
            </span>
          </div>
          <div className="plate-callout plate-callout--bloom"><span className="marker">01</span><b>FROST PETAL</b><small>translucent layer</small><i></i></div>
          <div className="plate-callout plate-callout--stem"><span className="marker">02</span><b>STEM STRUCTURE</b><small>vertical growth</small><i></i></div>
          <div className="plate-code">SPECIMEN / 0003<br />SOUTHERN FIELD REGISTER</div>
        </div>
      </section>

      <section className="archive-section">
        <div className="section-index">03 <span>ARCHIVE AT A GLANCE</span></div>
        <div className="archive-intro"><h2>What has<br /><em>been observed.</em></h2><p>The index is ready for the next record. Every count begins at zero and grows with verified research.</p></div>
        <div className="stat-line">{STATS.map(([value, label, note]) => <div className="stat-line__item" key={label}><strong>{value}</strong><span>{label}</span><small>{note}</small></div>)}</div>
      </section>

      <section className="expedition-section">
        <div className="section-index">04 <span>FEATURED EXPEDITION</span></div>
        <div className="expedition-spread">
          <div className="expedition-copy"><span className="field-kicker">West Antarctica / 2024</span><h2>Beyond the<br /><em>white horizon.</em></h2><p>Following the slow architecture of the ice sheet, a field team documented the layers, movements and living edges of a landscape in motion.</p><div className="expedition-details"><span>REGION <b>WEST ANTARCTICA</b></span><span>COORDINATES <b>78° 27′ S / 106° 50′ W</b></span><span>METHOD <b>ICE-CORE SURVEY</b></span><span>STATUS <b>FIELD REGISTER</b></span></div><Link className="field-link" to="/expeditions">View Expedition ↗</Link></div>
          <div className="glacier-specimen" aria-label="Layered glacier field observation">
            <div className="glacier-form" aria-hidden="true">
              <span className="glacier-layer glacier-layer--back"></span>
              <span className="glacier-layer glacier-layer--middle"></span>
              <span className="glacier-layer glacier-layer--front"></span>
              <span className="glacier-snowline"></span>
            </div>
            <div className="glacier-callout glacier-callout--ridge"><i></i><b>ICE SHEET</b><small>layered escarpment</small></div>
            <div className="glacier-callout glacier-callout--elevation"><i></i><b>ELEVATION / 2,410 M</b><small>surface reading</small></div>
            <div className="glacier-callout glacier-callout--region"><i></i><b>REGION / WEST ANTARCTICA</b><small>observation 036</small></div>
          </div>
        </div>
      </section>

      <section className="archive-nav-section">
        <div className="section-index">05 <span>EXPLORE THE ARCHIVE</span></div>
        <div className="archive-nav-heading"><h2>Follow<br /><em>the evidence.</em></h2><p>One record becomes a route. Start with a question and let the archive lead you outward.</p></div>
        <nav className="archive-nav" aria-label="Explore the archive">{ARCHIVE_LINKS.map(([number, label, detail, to]) => <Link to={to} key={number}><span>{number}</span><b>{label}</b><small>{detail}</small><strong>↗</strong></Link>)}</nav>
      </section>
    </div>
  )
}
