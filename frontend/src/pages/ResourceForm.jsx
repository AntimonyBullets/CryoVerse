import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'
import useForm from '../hooks/useForm.js'
import { createResource, listMyResources, updateResource } from '../services/repositoryService.js'
import { RESOURCE_TYPES } from '../utils/resourceStatus.js'
import { compactErrors, validateOptionalUrl, validateResourceDescription, validateResourceTitle, validateResourceType } from '../utils/validation.js'

const EMPTY = { title: '', description: '', type: '', category: '', tags: '', sourceUrl: '' }
const validate = (values) => compactErrors({ title: validateResourceTitle(values.title), description: validateResourceDescription(values.description), type: validateResourceType(values.type), sourceUrl: validateOptionalUrl(values.sourceUrl) })
const toValues = (r) => ({ title: r.title || '', description: r.description || '', type: r.type || '', category: r.category || '', tags: Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags || ''), sourceUrl: r.sourceUrl || r.source || '' })
const toPayload = (v) => ({ title: v.title.trim(), description: v.description.trim(), type: v.type, category: v.category.trim() || undefined, tags: v.tags.split(',').map((tag) => tag.trim()).filter(Boolean), sourceUrl: v.sourceUrl.trim() || undefined })

export default function ResourceForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState(isEdit ? null : EMPTY)
  const [loadError, setLoadError] = useState(null)
  useEffect(() => {
    if (!isEdit) return undefined
    let active = true
    listMyResources().then((resources) => {
      const resource = resources.find((item) => (item._id || item.id) === id)
      if (!resource) throw new Error('This resource is not available in your contributor account.')
      if (active) setInitialValues(toValues(resource))
    }).catch((error) => active && setLoadError(error))
    return () => { active = false }
  }, [id, isEdit])
  return <><PageHeader eyebrow="Dashboard" title={isEdit ? 'Edit resource' : 'New resource'} subtitle={isEdit ? 'Update the details of this resource.' : 'Submit a new resource to Cryoverse.'} /><section className="section"><div className="container">{loadError && <Alert variant="danger" title="Couldn't load this resource">{loadError.message}</Alert>}{!loadError && !initialValues && <div className="page-loading"><Spinner label="Loading resource" /></div>}{initialValues && <Fields id={id} isEdit={isEdit} initialValues={initialValues} onDone={() => navigate('/dashboard')} />}</div></section></>
}

function Fields({ id, isEdit, initialValues, onDone }) {
  const { submitting, submitError, handleSubmit, getFieldProps } = useForm({ initialValues, validate, onSubmit: async (values) => { if (isEdit) await updateResource(id, toPayload(values)); else await createResource(toPayload(values)); onDone() } })
  return <Card className="resource-form-card"><form className="auth-form" onSubmit={handleSubmit} noValidate>{submitError && <Alert variant="danger">{submitError.message}</Alert>}<Input label="Title" placeholder="Resource title" {...getFieldProps('title')} /><div className="field"><label htmlFor="type" className="field__label">Type</label><select id="type" className="field__input" {...getFieldProps('type')}><option value="">Select a type…</option>{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></div><Input label="Category (optional)" placeholder="e.g. Glaciology" {...getFieldProps('category')} /><div className="field"><label htmlFor="description" className="field__label">Description</label><textarea id="description" className="field__input field__textarea" rows={5} placeholder="What is this resource about?" {...getFieldProps('description')} /></div><Input label="Tags (optional, comma-separated)" placeholder="e.g. sea-ice, antarctica" {...getFieldProps('tags')} /><Input label="Source URL (optional)" placeholder="https://…" {...getFieldProps('sourceUrl')} /><Button type="submit" loading={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create resource'}</Button></form></Card>
}
