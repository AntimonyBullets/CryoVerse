/** Placeholder for "no data yet" states (also used while API data is not wired). */
export default function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p className="text-muted">{children}</p>}
      {action}
    </div>
  )
}
