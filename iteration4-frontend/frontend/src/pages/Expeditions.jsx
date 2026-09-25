import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader.jsx'
import { Alert, Button, Card, EmptyState, Input, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext.jsx'
import { createExpedition, deleteExpedition, listExpeditions, updateExpedition } from '../services/expeditionService.js'

const empty = { name: '', year: '', date: '', location: '', region: '', description: '' }
const canManage = (user) => ['admin', 'contributor'].includes(user?.role)

export default function Expeditions() {
  const { user } = useAuth()
  const [items, setItems] = useState(null); const [error, setError] = useState(null); const [editing, setEditing] = useState(null)
  const load = useCallback(() => listExpeditions().then(setItems).catch(setError), [])
  useEffect(() => { load() }, [load])
  async function remove(id) { if (!window.confirm('Delete this expedition? Resources will remain in the repository.')) return; try { await deleteExpedition(id); setItems((current) => current.filter((item) => (item._id || item.id) !== id)) } catch (err) { setError(err) } }
  return <><PageHeader eyebrow="Expeditions" title="Expeditions" subtitle="Explore resources and media grouped by polar expedition." /><section className="section"><div className="container"><div className="archive-frame"><div className="archive-frame__index">02 <span>EXPEDITION REGISTER</span></div>{canManage(user) && <Button onClick={() => setEditing(empty)}>New expedition</Button>}{editing && <ExpeditionForm initial={editing} onCancel={() => setEditing(null)} onSaved={(item) => { setItems((current) => { const id = item._id || item.id; const exists = current.some((entry) => (entry._id || entry.id) === id); return exists ? current.map((entry) => (entry._id || entry.id) === id ? item : entry) : [item, ...current] }); setEditing(null) }} />}{error && <Alert variant="danger" title="Couldn't load expeditions">{error.message}</Alert>}{!error && !items && <div className="page-loading"><Spinner label="Loading expeditions" /></div>}{!error && items?.length === 0 && <EmptyState title="No expeditions yet">Expeditions will appear here when they are added.</EmptyState>}{items?.length > 0 && <div className="grid grid--3">{items.map((item) => { const id = item._id || item.id; return <Card key={id}><h3><Link to={`/expeditions/${id}`}>{item.name}</Link></h3><p className="text-muted">{[item.year, item.location, item.region].filter(Boolean).join(' · ')}</p><p>{item.description}</p>{canManage(user) && <div className="dashboard-item__actions"><Button size="sm" variant="secondary" onClick={() => setEditing(item)}>Edit</Button><Button size="sm" variant="danger" onClick={() => remove(id)}>Delete</Button></div>}</Card> })}</div>}<div className="archive-frame__note">Routes / crews / observations / memory</div></div></div></section></>
}

function ExpeditionForm({ initial, onCancel, onSaved }) {
  const [values, setValues] = useState({ ...empty, ...initial }); const [saving, setSaving] = useState(false); const [error, setError] = useState(null)
  const change = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }))
  async function submit(event) { event.preventDefault(); setSaving(true); setError(null); try { const payload = { ...values, year: values.year ? Number(values.year) : undefined }; const item = initial._id ? await updateExpedition(initial._id, payload) : await createExpedition(payload); onSaved(item) } catch (err) { setError(err) } finally { setSaving(false) } }
  return <Card className="expedition-form"><form className="auth-form" onSubmit={submit}>{error && <Alert variant="danger">{error.message}</Alert>}<Input label="Name" value={values.name} onChange={change('name')} required /><div className="form-grid"><Input label="Year" type="number" value={values.year} onChange={change('year')} /><Input label="Date" type="date" value={values.date ? String(values.date).slice(0, 10) : ''} onChange={change('date')} /><Input label="Location" value={values.location} onChange={change('location')} /><Input label="Region" value={values.region} onChange={change('region')} /></div><div className="field"><label className="field__label" htmlFor="expedition-description">Description</label><textarea id="expedition-description" className="field__input field__textarea" rows={4} value={values.description} onChange={change('description')} required /></div><Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save expedition'}</Button> <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></form></Card>
}
