import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ClassPicker from '../../components/ClassPicker'
import { API_BASE, authFetch } from '../../api/client'
import ModuleIcon from './ModuleIcon'
import './InstructorAnnouncements.css'

const EMPTY = { title: '', content: '', priority: 'medium', is_pinned: false }
const PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
const timestamp = value => {
  if (!value) return 'Date unavailable'
  // The API serializes UTC datetimes without an offset.
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
async function responseError(res) {
  const body = await res.json().catch(() => ({}))
  return body.error || body.message || body.msg || `Request failed (HTTP ${res.status}). Please try again.`
}

export default function Announcements({ classId, classInfo, onEditingChange }) {
  const navigate = useNavigate()
  const [pickedClass, setPickedClass] = useState(null)
  if (classId == null && !pickedClass) return <ClassPicker onSelect={setPickedClass} onCancel={() => navigate(-1)} actionLabel="Post announcement" prompt="Which class is this announcement for?" />
  const id = classId ?? pickedClass.id
  // A new class gets a fresh workspace, so a message can never follow a class switch.
  return <AnnouncementWorkspace key={id} classId={id} className={classInfo?.section_no || pickedClass?.name} subjectName={classInfo?.subjects?.join(' · ') || classInfo?.name || pickedClass?.subjectName} onEditingChange={onEditingChange} onChangeClass={classId == null ? () => setPickedClass(null) : null} />
}

function AnnouncementWorkspace({ classId, className, subjectName, onChangeClass, onEditingChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editor, setEditor] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [original, setOriginal] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [discardAction, setDiscardAction] = useState(null)
  const mutation = useRef(false)
  const requestId = useRef(0)
  const titleRef = useRef(null)
  const newButton = useRef(null)
  const dirty = JSON.stringify(form) !== JSON.stringify(original)
  const audience = className ? `Class ${className}` : 'Selected class'

  const load = useCallback(async signal => {
    const sequence = ++requestId.current
    setLoading(true)
    setLoadError('')
    try {
      const res = await authFetch(`${API_BASE}/api/announcements?class_id=${encodeURIComponent(classId)}`, { signal })
      if (!res.ok) throw new Error(await responseError(res))
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('The announcement list could not be read.')
      if (sequence !== requestId.current || signal?.aborted) return
      setItems(data)
      setLoaded(true)
    } catch (err) {
      if (sequence === requestId.current && !signal?.aborted) setLoadError(err.message || 'Unable to load announcements.')
    } finally {
      if (sequence === requestId.current && !signal?.aborted) setLoading(false)
    }
  }, [classId])
  // These are remote-resource loading states, reset when the class changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => { controller.abort() } }, [load])
  useEffect(() => { if (editor) titleRef.current?.focus() }, [editor, editingId])
  useEffect(() => { onEditingChange?.(editor); return () => onEditingChange?.(false) }, [editor, onEditingChange])
  useEffect(() => {
    if (!editor || !dirty) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [editor, dirty])

  const begin = item => {
    const next = item ? { title: item.title, content: item.content, priority: item.priority || 'medium', is_pinned: !!item.is_pinned } : { ...EMPTY }
    setForm(next); setOriginal(next); setEditingId(item?.id ?? null); setError(''); setSuccess(''); setUncertain(false); setEditor(true)
  }
  const finishCancel = () => {
    setEditor(false); setError(''); setUncertain(false); newButton.current?.focus()
  }
  const start = item => {
    if (mutation.current) return
    if (editor && dirty) { setDiscardAction({ kind: 'start', item }); return }
    begin(item)
  }
  const cancel = () => {
    if (mutation.current) return
    if (dirty) { setDiscardAction({ kind: 'close' }); return }
    finishCancel()
  }
  const confirmDiscard = () => {
    const action = discardAction
    setDiscardAction(null)
    if (action?.kind === 'close') finishCancel()
    else begin(action?.item)
  }
  const submit = async e => {
    e.preventDefault()
    if (mutation.current || uncertain) return
    if (!form.title.trim() || !form.content.trim()) { setError('Enter both a title and a message before posting.'); titleRef.current?.focus(); return }
    if (!classId) { setError('Choose an assigned class before posting.'); return }
    mutation.current = true; setSaving(true); setError(''); setSuccess('')
    let received = false
    try {
      const res = await authFetch(`${API_BASE}/api/announcements${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, title: form.title.trim(), content: form.content.trim(), class_id: classId }),
      })
      received = true
      if (!res.ok) throw new Error(await responseError(res))
      // A successful save is separate from the following list refresh.
      setEditor(false); setSuccess(editingId ? 'Announcement updated.' : 'Announcement posted to this class.'); setForm({ ...EMPTY }); setOriginal({ ...EMPTY })
      setSearch(''); setPriority('all')
      await load()
      newButton.current?.focus()
    } catch (err) {
      if (!received) { setUncertain(true); setError('We could not confirm whether this announcement was saved. Your text is preserved. Refresh the list below and check it before closing and starting another post.') }
      else setError(err.message || 'Unable to save. Your changes are still here.')
    } finally { mutation.current = false; setSaving(false) }
  }
  const remove = async () => {
    if (!deleteTarget || mutation.current) return
    mutation.current = true; setDeleting(true); setDeleteError('')
    try {
      const res = await authFetch(`${API_BASE}/api/announcements/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await responseError(res))
      setItems(prev => prev.filter(a => a.id !== deleteTarget.id)); setDeleteTarget(null); setSuccess('Announcement deleted.')
    } catch (err) { setDeleteError(`${err.message || 'Unable to confirm deletion.'} Refresh the list before trying again.`) }
    finally { mutation.current = false; setDeleting(false) }
  }
  const filtered = items.filter(a => (priority === 'all' || a.priority === priority) && `${a.title}\n${a.content}`.toLowerCase().includes(search.toLowerCase()))
  const pinned = filtered.filter(a => a.is_pinned)
  const regular = filtered.filter(a => !a.is_pinned)
  const cards = entries => entries.map(a => <article key={a.id} className={`ia-card ${a.is_pinned ? 'ia-pinned' : ''}`}>
    <header><div><div className="ia-card-badges">{a.is_pinned && <span className="ia-pin-badge"><PinIcon />Pinned</span>}<span className={`ia-priority-badge ia-${a.priority}`}>{PRIORITIES[a.priority] || 'Medium'} priority</span></div><h3>{a.title}</h3><p className="ia-meta">{a.instructor || 'Instructor'}<span aria-hidden="true"> · </span><time>{timestamp(a.created_at)}</time></p></div><div className="ia-card-actions"><button type="button" className="ia-icon-button" aria-label={`Edit announcement: ${a.title}`} onClick={() => start(a)} disabled={saving || deleting}><ModuleIcon name="edit" size={18} /></button><button type="button" className="ia-icon-button ia-delete" aria-label={`Delete announcement: ${a.title}`} onClick={() => { setDeleteError(''); setDeleteTarget(a) }} disabled={saving || deleting}><ModuleIcon name="trash" size={18} /></button></div></header>
    <p className="ia-message-body">{a.content}</p>
  </article>)

  return <section className="ia-workspace" aria-label="Class announcements">
    <header className="ia-heading"><div><h2>Announcements</h2><p>Keep your class informed, one clear update at a time.</p></div><button ref={newButton} type="button" className="ia-primary" disabled={saving || deleting} onClick={() => start(null)}><ModuleIcon name="plus" size={18} />New announcement</button></header>
    <div className="ia-audience"><ModuleIcon name="users" size={18} /><span>{audience}{subjectName && ` · ${subjectName}`}</span><span className="ia-audience-note">Visible to students in this class</span>{onChangeClass && <button type="button" disabled={editor || saving} onClick={onChangeClass}>Change class</button>}</div>
    {success && <div role="status" className="ia-feedback ia-success">{success}<button type="button" aria-label="Dismiss success message" onClick={() => setSuccess('')}>×</button></div>}
    {editor && <form className="ia-composer" onSubmit={submit} noValidate>
      <header className="ia-composer-heading"><div><h3>{editingId ? 'Edit announcement' : 'Write an announcement'}</h3><p>Share lesson reminders, schedule changes or important class news.</p></div><button type="button" className="ia-icon-button" aria-label="Close announcement editor" disabled={saving} onClick={cancel}>×</button></header>
      {error && <div className="ia-feedback ia-error" role="alert">{error}</div>}
      <div className="ia-editor-layout"><fieldset disabled={saving} className="ia-fields">
        <label className="ia-field"><span>Title <span aria-hidden="true">*</span></span><input ref={titleRef} name="title" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. What to prepare for our next class" /></label>
        <label className="ia-field"><span>Message <span aria-hidden="true">*</span></span><textarea name="content" rows={8} required value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your update. Include the details your students need." /><small>Line breaks are preserved. Your message is posted as plain text.</small></label>
        <fieldset className="ia-priorities"><legend>Priority</legend><div>{Object.entries(PRIORITIES).map(([value,label]) => <label key={value} className={`ia-priority-option ia-${value}`}><input type="radio" name="priority" value={value} checked={form.priority === value} onChange={() => setForm(p => ({ ...p, priority: value }))} /><span>{label}</span></label>)}</div><p>Priority adds a label; it does not schedule delivery.</p></fieldset>
        <label className="ia-pin-control"><PinIcon /><span><strong>Pin to the top</strong><small>Keep this update above unpinned announcements.</small></span><input type="checkbox" name="is_pinned" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} /></label>
      </fieldset><aside className="ia-preview" aria-label="Announcement preview"><h4>Student preview</h4><div className="ia-card-badges">{form.is_pinned && <span className="ia-pin-badge"><PinIcon />Pinned</span>}<span className={`ia-priority-badge ia-${form.priority}`}>{PRIORITIES[form.priority]} priority</span></div><h3>{form.title.trim() || 'Your announcement title'}</h3><p className="ia-message-body">{form.content.trim() || 'Your message will appear here as you write.'}</p><p className="ia-preview-note"><ModuleIcon name="eye" size={16} />{audience} · Posted only when you confirm</p></aside></div>
      <footer className="ia-savebar"><p>{saving ? 'Saving your announcement…' : dirty ? 'Unsaved changes' : 'Nothing posted yet'}{uncertain && ' · Save status unconfirmed'}</p><div><button type="button" className="ia-secondary" disabled={saving} onClick={cancel}>Cancel</button><button type="submit" className="ia-primary" disabled={saving || uncertain}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Post announcement'}<ModuleIcon name="announcement" size={17} /></button></div></footer>
    </form>}
    <div className="ia-toolbar"><label className="ia-search"><ModuleIcon name="search" size={18} /><input type="search" aria-label="Search announcements" placeholder="Search announcements" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="ia-filter"><span>Priority</span><select aria-label="Filter announcements by priority" value={priority} onChange={e => setPriority(e.target.value)}><option value="all">All priorities</option>{Object.entries(PRIORITIES).map(([v,t]) => <option key={v} value={v}>{t}</option>)}</select></label><button type="button" className="ia-secondary" disabled={loading || saving || deleting} onClick={() => load()}>Refresh</button></div>
    {loadError && <div className="ia-feedback ia-error" role="alert"><span>{loadError}{loaded && ' Previously loaded announcements remain visible.'}</span><button type="button" onClick={() => load()} disabled={loading}>Retry</button></div>}
    {loading && <p role="status" className="ia-loading">Loading announcements…</p>}
    {loaded && <div className="ia-list" aria-busy={loading}>{pinned.length > 0 && <section aria-label="Pinned announcements"><h3 className="ia-list-label"><PinIcon />Pinned <span>{pinned.length}</span></h3>{cards(pinned)}</section>}{regular.length > 0 && <section aria-label="Other announcements">{pinned.length > 0 && <h3 className="ia-list-label">Latest updates</h3>}{cards(regular)}</section>}
      {!loading && !loadError && filtered.length === 0 && <div className="ia-empty"><ModuleIcon name={search || priority !== 'all' ? 'search' : 'announcement'} size={40} /><h3>{search || priority !== 'all' ? 'No matching announcements' : 'Your next class update starts here'}</h3><p>{search || priority !== 'all' ? 'Try another search or clear your filters.' : 'Post a reminder or share something your students should know.'}</p>{search || priority !== 'all' ? <button type="button" className="ia-secondary" onClick={() => { setSearch(''); setPriority('all') }}>Clear filters</button> : !editor && <button type="button" className="ia-primary" onClick={() => start(null)}>Create announcement</button>}</div>}
    </div>}
    {discardAction && <DiscardAnnouncement onCancel={() => setDiscardAction(null)} onConfirm={confirmDiscard} />}
    {deleteTarget && <DeleteAnnouncement announcement={deleteTarget} busy={deleting} error={deleteError} onCancel={() => { if (!deleting) setDeleteTarget(null) }} onConfirm={remove} />}
  </section>
}

function PinIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-4 2-3 5-5-5 5-3 2-4ZM9 10l-4 4 5 5 4-4M7 17l-5 5" /></svg> }
function DeleteAnnouncement({ announcement, busy, error, onCancel, onConfirm }) {
  const dialog = useRef(null)
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close() }, [])
  return <dialog ref={dialog} className="ia-delete-dialog" aria-labelledby="ia-delete-title" onCancel={e => { e.preventDefault(); if (!busy) onCancel() }}><h2 id="ia-delete-title">Delete announcement?</h2><p>Delete “{announcement.title}”? Students will no longer see this update. This cannot be undone.</p>{error && <p role="alert" className="ia-feedback ia-error">{error}</p>}<div><button type="button" className="ia-secondary" disabled={busy} onClick={onCancel} autoFocus>Keep announcement</button><button type="button" className="ia-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete announcement'}</button></div></dialog>
}

function DiscardAnnouncement({ onCancel, onConfirm }) {
  const dialog = useRef(null)
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close() }, [])
  return <dialog ref={dialog} className="ia-delete-dialog" aria-labelledby="ia-discard-title" onCancel={e => { e.preventDefault(); onCancel() }}><h2 id="ia-discard-title">Discard unsaved changes?</h2><p>Your announcement has not been saved. Keep editing to preserve your message.</p><div><button type="button" className="ia-secondary" onClick={onCancel} autoFocus>Keep editing</button><button type="button" className="ia-danger" onClick={onConfirm}>Discard changes</button></div></dialog>
}
