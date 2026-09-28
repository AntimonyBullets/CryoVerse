export const RESOURCE_TYPES = ['report', 'publication', 'dataset', 'media']

const STATUS_META = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted: { label: 'Submitted', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  published: { label: 'Published', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
}

export function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', variant: 'neutral' }
}
