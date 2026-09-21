/** Consistent page title band used by inner pages. */
export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="page-header">
      <div className="container">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
