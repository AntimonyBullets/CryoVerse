import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Button, Card, Input, Spinner } from '../components/ui'
import useForm from '../hooks/useForm.js'
import { createResource, generateResourceAIContent, listMyResources, updateResource, uploadMedia } from '../services/repositoryService.js'
import { listExpeditions } from '../services/expeditionService.js'
import AIContentPanel from '../components/ai/AIContentPanel.jsx'
import { RESOURCE_TYPES } from '../utils/resourceStatus.js'
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
  const [expeditions, setExpeditions] = useState([]); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState(null)
  useEffect(() => { listExpeditions().then(setExpeditions).catch(() => {}) }, [])
  const { submitting, submitError, handleSubmit, getFieldProps, values, setValues } = useForm({ initialValues, validate, onSubmit: async (current) => { if (isEdit) await updateResource(id, toPayload(current)); else await createResource(toPayload(current)); onDone() } })
  async function chooseFile(event) { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setUploadError(null); try { const fileUrl = await uploadMedia(file); setValues((current) => ({ ...current, fileUrl })) } catch (error) { setUploadError(error) } finally { setUploading(false) } }
  return <>
    <Card className="resource-form-card"><form className="auth-form" onSubmit={handleSubmit} noValidate>{submitError && <Alert variant="danger">{submitError.message}</Alert>}{uploadError && <Alert variant="danger" title="Upload failed">{uploadError.message}</Alert>}<Input label="Title" placeholder="Resource title" {...getFieldProps('title')} /><div className="field"><label htmlFor="type" className="field__label">Type</label><select id="type" className="field__input" {...getFieldProps('type')}><option value="">Select a type…</option>{RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></div><Input label="Category (optional)" placeholder="e.g. Glaciology" {...getFieldProps('category')} /><div className="field"><label htmlFor="expedition" className="field__label">Expedition (optional)</label><select id="expedition" className="field__input" {...getFieldProps('expeditionId')}><option value="">No expedition</option>{expeditions.map((expedition) => <option key={expedition._id} value={expedition._id}>{expedition.name}</option>)}</select></div><div className="field"><label htmlFor="description" className="field__label">Description</label><textarea id="description" className="field__input field__textarea" rows={5} placeholder="What is this resource about?" {...getFieldProps('description')} /></div><Input label="Tags (optional, comma-separated)" placeholder="e.g. sea-ice, antarctica" {...getFieldProps('tags')} /><Input label="Source URL (optional)" placeholder="https://…" {...getFieldProps('sourceUrl')} /><div className="field"><label className="field__label" htmlFor="media-file">Upload image, video, or PDF (optional)</label><input id="media-file" className="field__input" type="file" accept="image/*,video/*,application/pdf" onChange={chooseFile} disabled={uploading} />{uploading && <p className="field__hint">Uploading…</p>}{values.fileUrl && <p className="field__hint">Media attached.</p>}</div><Button type="submit" loading={submitting || uploading}>{submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create resource'}</Button></form></Card>
    {isEdit && (
      <AIContentPanel
        title="Generate AI content"
        description="Uses the resource's uploaded PDF or video to draft a summary, a simplified explanation and (optionally) outreach copy. Requires a report/publication PDF or a video file already attached above. Edits here are local only — nothing is saved automatically."
        generate={(options, meta) => generateResourceAIContent(id, options, meta)}
      />
    )}
  </>
}
