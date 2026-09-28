import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Badge, Button, Card, Input, Spinner } from '../components/ui'
import useForm from '../hooks/useForm.js'
import { createResource, listMyResources, submitResource, updateResource, uploadMedia } from '../services/repositoryService.js'
import { listExpeditions } from '../services/expeditionService.js'
import { RESOURCE_TYPES, statusMeta } from '../utils/resourceStatus.js'
import { compactErrors, validateOptionalUrl, validateResourceDescription, validateResourceTitle, validateResourceType } from '../utils/validation.js'

const EMPTY = { title: '', description: '', type: '', category: '', tags: '', sourceUrl: '', fileUrl: '', expeditionId: '' }
const validate = (values) => compactErrors({ title: validateResourceTitle(values.title), description: validateResourceDescription(values.description), type: validateResourceType(values.type), sourceUrl: validateOptionalUrl(values.sourceUrl) })
const toValues = (r) => ({ title: r.title || '', description: r.description || '', type: r.type || '', category: r.category || '', tags: Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags || ''), sourceUrl: r.sourceUrl || r.source || '', fileUrl: r.fileUrl || '', expeditionId: r.expeditionId?._id || r.expeditionId || '' })
const toPayload = (v) => ({ title: v.title.trim(), description: v.description.trim(), type: v.type, category: v.category.trim() || undefined, tags: v.tags.split(',').map((tag) => tag.trim()).filter(Boolean), sourceUrl: v.sourceUrl.trim() || undefined, fileUrl: v.fileUrl.trim() || undefined, expeditionId: v.expeditionId || undefined })

export default function ResourceForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [initialValues, setInitialValues] = useState(isEdit ? null : EMPTY)
  const [initialStatus, setInitialStatus] = useState('draft')
  const [loadError, setLoadError] = useState(null)
  useEffect(() => {
    if (!isEdit) return undefined
    let active = true
    listMyResources().then((resources) => {
      const resource = resources.find((item) => (item._id || item.id) === id)
      if (!resource) throw new Error('This resource is not available in your contributor account.')
      if (active) {
        setInitialValues(toValues(resource))
        setInitialStatus(resource.status || 'draft')
      }
    }).catch((error) => active && setLoadError(error))
    return () => { active = false }
  }, [id, isEdit])
  return <><PageHeader eyebrow="Dashboard" title={isEdit ? 'Edit resource' : 'New resource'} subtitle={isEdit ? 'Update the details of this resource.' : 'Submit a new resource to Cryoverse.'} /><section className="section"><div className="container">{loadError && <Alert variant="danger" title="Couldn't load this resource">{loadError.message}</Alert>}{!loadError && !initialValues && <div className="page-loading"><Spinner label="Loading resource" /></div>}{initialValues && <Fields id={id} initialStatus={initialStatus} initialValues={initialValues} onDone={() => navigate('/dashboard')} />}</div></section></>
}

function Fields({ id, initialStatus, initialValues, onDone }) {
  const [expeditions, setExpeditions] = useState([]); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState(null)
  const [resourceId, setResourceId] = useState(id || null)
  const [resourceStatus, setResourceStatus] = useState(initialStatus)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const actionRef = useRef('save')
  const actionLock = useRef(false)
  useEffect(() => { listExpeditions().then(setExpeditions).catch(() => {}) }, [])
  const { submitting, submitError, handleSubmit, getFieldProps, values, setValues } = useForm({
    initialValues,
    validate,
    onSubmit: async (current) => {
      if (actionLock.current) return
      actionLock.current = true
      const action = actionRef.current
      setActiveAction(action)
      setSubmitSuccess(false)
      try {
        const saved = resourceId
          ? await updateResource(resourceId, toPayload(current))
          : await createResource(toPayload(current))
        const savedId = saved?._id || saved?.id || resourceId
        if (!savedId) throw new Error('The saved resource did not include an ID, so it could not be submitted.')
        setResourceId(savedId)
        setResourceStatus(saved?.status || resourceStatus || 'draft')

        if (action === 'submit') {
          const submitted = await submitResource(savedId)
          setResourceStatus(submitted?.status || 'submitted')
          setSubmitSuccess(true)
        } else {
          onDone()
        }
      } finally {
        actionLock.current = false
        setActiveAction(null)
      }
    },
  })
  async function chooseFile(event) { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setUploadError(null); try { const fileUrl = await uploadMedia(file); setValues((current) => ({ ...current, fileUrl })) } catch (error) { setUploadError(error) } finally { setUploading(false) } }
  const status = statusMeta(resourceStatus)
  const canSubmit = ['draft', 'rejected'].includes(resourceStatus)
  const canEdit = !['submitted', 'approved', 'published'].includes(resourceStatus)
  const locked = submitting || uploading || !canEdit
  return <Card className="resource-form-card"><form className="auth-form" onSubmit={handleSubmit} noValidate>
    {resourceStatus && <div className="resource-card__meta"><Badge variant={status.variant}>{status.label}</Badge></div>}
    {submitError && <Alert variant="danger" title="Couldn't save or submit this resource">{submitError.message}</Alert>}
    {submitSuccess && <Alert variant="success" title="Submitted to Admin">Your resource was submitted for review and is now pending admin review.</Alert>}
    {uploadError && <Alert variant="danger" title="Upload failed">{uploadError.message}</Alert>}
    <fieldset className="resource-form__fields" disabled={locked}>
      <Input label="Title" placeholder="Resource title" {...getFieldProps('title')} />
      <div className="field"><label htmlFor="type" className="field__label">Type</label><select id="type" className="field__input" {...getFieldProps('type')}><option value="">Select a type…</option>{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></div>
      <Input label="Category (optional)" placeholder="e.g. Glaciology" {...getFieldProps('category')} />
      <div className="field"><label htmlFor="expedition" className="field__label">Expedition (optional)</label><select id="expedition" className="field__input" {...getFieldProps('expeditionId')}><option value="">No expedition</option>{expeditions.map((expedition) => <option key={expedition._id} value={expedition._id}>{expedition.name}</option>)}</select></div>
      <div className="field"><label htmlFor="description" className="field__label">Description</label><textarea id="description" className="field__input field__textarea" rows={5} placeholder="What is this resource about?" {...getFieldProps('description')} /></div>
      <Input label="Tags (optional, comma-separated)" placeholder="e.g. sea-ice, antarctica" {...getFieldProps('tags')} />
      <Input label="Source URL (optional)" placeholder="https://…" {...getFieldProps('sourceUrl')} />
      <div className="field"><label className="field__label" htmlFor="media-file">Upload image, video, or PDF (optional)</label><input id="media-file" className="field__input" type="file" accept="image/*,video/*,application/pdf" onChange={chooseFile} disabled={locked} />{uploading && <p className="field__hint">Uploading…</p>}{values.fileUrl && <p className="field__hint">Media attached.</p>}</div>
    </fieldset>
    {canEdit && <div className="ai-panel__actions">
      <Button type="submit" loading={submitting && activeAction === 'save'} disabled={submitting || uploading} onClick={() => { actionRef.current = 'save' }}>{resourceId ? 'Save changes' : 'Create resource'}</Button>
      {canSubmit && <Button type="submit" variant="secondary" loading={submitting && activeAction === 'submit'} disabled={submitting || uploading} onClick={() => { actionRef.current = 'submit' }}>Submit to Admin</Button>}
    </div>}
  </form></Card>
}
