import { Button } from '../ui'

/** Simple prev/next pager shared by the admin list pages. */
export default function AdminPagination({ pagination, onPageChange }) {
  const { page = 1, limit = 20, total = 0 } = pagination || {}
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null
  return (
    <div className="admin-pagination">
      <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
      <span className="admin-pagination__label">Page {page} of {totalPages} · {total} total</span>
      <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
    </div>
  )
}
