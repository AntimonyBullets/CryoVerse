/** Inline message. variant: info | success | warning | danger */
export default function Alert({ children, variant = 'info', title, className = '' }) {
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status'
  return (
    <div className={`alert alert--${variant} ${className}`.trim()} role={role}>
      {title && <strong className="alert__title">{title}</strong>}
      <div>{children}</div>
    </div>
  )
}
