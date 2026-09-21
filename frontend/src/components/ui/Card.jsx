/** Generic surface. Use title/footer for simple cards or compose children freely. */
export default function Card({ title, footer, children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`card ${className}`.trim()} {...rest}>
      {title && <h3 className="card__title">{title}</h3>}
      <div className="card__body">{children}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </Tag>
  )
}
