import { useCallback, useEffect, useRef, useState } from 'react'
import ModuleEditor from './ModuleEditor'
import ModuleIcon from './ModuleIcon'
import { downloadModuleFile, formatSize, jsonOptions, moduleJson } from './moduleApi'
import emptyBook from '../../assets/instructor/module-empty-book.png'
import './InstructorModules.css'

function DeleteModuleDialog({ lesson, busy, error, onClose, onDelete }) {
  const dialog = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  return <dialog ref={dialog} className="im-dialog" aria-labelledby="module-delete-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <div className="im-dialog-inner"><h2 id="module-delete-title">Delete module?</h2><p className="im-description">Delete “{lesson.title}” and all its attached files? This cannot be undone.</p>
      {error && <p className="im-message im-error" role="alert">{error}</p>}
      <div className="im-inline-actions"><button className="ir-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="ir-secondary im-danger" disabled={busy} onClick={onDelete}>{busy ? 'Deleting…' : 'Delete module'}</button></div>
    </div>
  </dialog>
}

function ModuleDialog({ lesson, onClose, onFileDeleted }) {
  const dialog = useRef(null)
  const [files, setFiles] = useState(lesson.files || [])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [remove, setRemove] = useState(null)
  useEffect(() => {
    const opener = document.activeElement
    const element = dialog.current
    element.showModal()
    return () => { element.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  async function download(file) {
    if (busy) return
    setBusy(file.id); setError('')
    try { await downloadModuleFile(lesson.id, file) } catch (failure) { setError(failure.message) } finally { setBusy(null) }
  }
  async function removeFile() {
    if (busy || !remove) return
    setBusy(remove.id); setError('')
    try {
      await moduleJson(`/api/lessons/${lesson.id}/files/${remove.id}`, { method: 'DELETE' })
      setFiles(previous => previous.filter(file => file.id !== remove.id))
      onFileDeleted(lesson.id, remove.id); setRemove(null)
    } catch (failure) { setError(failure.message) } finally { setBusy(null) }
  }
  return <dialog ref={dialog} className="im-dialog" aria-labelledby="module-detail-title" onCancel={event => { if (busy) event.preventDefault(); else onClose() }}>
    <div className="im-dialog-inner"><header><div><span className={`im-status ${lesson.is_published ? 'published' : 'draft'}`}>{lesson.is_published ? 'Published' : 'Draft'}</span><h2 id="module-detail-title">{lesson.title}</h2><p>Week {lesson.week_number}</p></div><button className="ir-secondary" disabled={Boolean(busy)} onClick={onClose}>Close</button></header>
      <p className="im-description">{lesson.description}</p>
      <h3>Attached files ({files.length})</h3>
      {error && <p className="im-message im-error" role="alert">{error}</p>}
      {!files.length && <p className="im-muted">No files attached to this module.</p>}
      <ul className="im-pending-files">{files.map(file => <li key={file.id}><ModuleIcon name="file" /><div><strong>{file.filename}</strong><span>{file.file_size > 0 ? formatSize(file.file_size) : 'Size not recorded'}</span></div><div className="im-file-actions"><button className="ir-secondary" disabled={Boolean(busy)} onClick={() => download(file)}>{busy === file.id ? 'Working…' : 'Download'}</button><button className="ir-secondary im-danger" disabled={Boolean(busy)} onClick={() => setRemove(file)}>Remove</button></div></li>)}</ul>
      {remove && <div className="im-message im-error"><p>Remove “{remove.filename}”? This permanently deletes this attachment.</p><div className="im-inline-actions"><button className="ir-secondary" disabled={Boolean(busy)} onClick={() => setRemove(null)}>Keep file</button><button className="ir-secondary im-danger" disabled={Boolean(busy)} onClick={removeFile}>Delete attachment</button></div></div>}
    </div>
  </dialog>
}

export default function CourseMaterials({ classId, subjectId, classInfo, onEditingChange }) {
  const [lessons, setLessons] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState('all')
  const [editor, setEditor] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(null)
  const busyRef = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const heading = useRef(null)
  const setEditing = useCallback(value => { setEditor(value); onEditingChange?.(Boolean(value)) }, [onEditingChange])

  useEffect(() => {
    if (!classId) return
    const controller = new AbortController()
    let current = true
    async function load() {
      setLoadState('loading')
      try {
        const data = await moduleJson(`/api/lessons?class_id=${classId}`, { signal: controller.signal })
        if (!Array.isArray(data)) throw new Error('Invalid module list')
        if (current) { setLessons(data.filter(lesson => lesson.section_id === Number(classId))); setLoadState('ready') }
      } catch { if (current) setLoadState('error') }
    }
    load()
    return () => { current = false; controller.abort() }
  }, [classId, reload])

  async function toggle(lesson) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(lesson.id); setError(''); setMessage('')
    try {
      await moduleJson(`/api/lessons/${lesson.id}`, jsonOptions('PUT', { is_published: !lesson.is_published }))
      setLessons(previous => previous.map(item => item.id === lesson.id ? { ...item, is_published: !lesson.is_published } : item))
      setMessage(lesson.is_published ? 'Module returned to Draft. It is hidden from students.' : 'Module published. Students in this class can now access it.')
    } catch (failure) { setError(failure.message); setReload(value => value + 1) }
    finally { busyRef.current = false; setBusy(null) }
  }
  async function deleteModule() {
    if (busyRef.current || !deleteTarget) return
    busyRef.current = true; setBusy(deleteTarget.id); setError('')
    try {
      await moduleJson(`/api/lessons/${deleteTarget.id}`, { method: 'DELETE' })
      setLessons(previous => previous.filter(lesson => lesson.id !== deleteTarget.id))
      setMessage('Module deleted.'); setDeleteTarget(null)
    } catch (failure) { setError(failure.message) }
    finally { busyRef.current = false; setBusy(null) }
  }
  function closeEditor(success) {
    setEditing(null)
    if (success) setMessage(success)
    setReload(value => value + 1)
    requestAnimationFrame(() => heading.current?.focus())
  }
  function startEditor(lesson = null) { setError(''); setMessage(''); setEditing({ lesson }) }
  const filtered = lessons.filter(lesson => filter === 'all' || (filter === 'published' ? lesson.is_published : !lesson.is_published)).sort((a, b) => a.week_number - b.week_number || a.id - b.id)

  if (!classId || !subjectId) return <div className="ir-empty ir-surface"><h2>Select an assigned class first</h2><p>Open My Classes, choose a subject and then its class code.</p></div>
  if (editor) return <ModuleEditor key={editor.lesson?.id || 'new'} classId={classId} subjectId={subjectId} classInfo={classInfo} lesson={editor.lesson} onCancel={() => closeEditor()} onSaved={closeEditor} />

  return <section className="im-modules" aria-labelledby="module-list-heading">
    <header className="im-list-heading"><div><h2 id="module-list-heading" ref={heading} tabIndex={-1}>Learning Modules</h2><p>Organize lessons and resources for this class.</p></div><button className="im-primary" onClick={() => startEditor()}><ModuleIcon name="plus" />New Module</button></header>
    {message && <p className="im-message im-success" role="status">{message}</p>}
    {error && <p className="im-message im-error" role="alert">{error}</p>}
    {loadState === 'loading' ? <div className="ir-surface ir-empty" role="status">Loading modules…</div>
      : loadState === 'error' ? <div className="ir-surface ir-empty" role="alert"><h3>Unable to load modules</h3><p>We could not retrieve this class’s modules. Check your connection and try again.</p><button className="ir-secondary" onClick={() => setReload(value => value + 1)}>Retry</button></div>
      : !lessons.length ? <div className="ir-surface im-module-empty"><img src={emptyBook} alt="" width="1747" height="894" /><h3>Your first module starts here</h3><p>Share lesson notes, slides, and resources with your class.<br />Save a draft now, or publish when you are ready.</p><button className="im-primary" onClick={() => startEditor()}><ModuleIcon name="plus" />Create First Module</button><span><ModuleIcon name="lock" size={18} />Drafts stay hidden from students.</span></div>
      : <>
        <div className="im-filters" aria-label="Filter modules">{[['all', 'All', lessons.length], ['published', 'Published', lessons.filter(lesson => lesson.is_published).length], ['drafts', 'Drafts', lessons.filter(lesson => !lesson.is_published).length]].map(([key, label, total]) => <button key={key} className="ir-secondary" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} ({total})</button>)}</div>
        {!filtered.length ? <div className="ir-empty ir-surface"><h3>No modules match this filter</h3><button className="ir-secondary" onClick={() => setFilter('all')}>Show all modules</button></div>
          : <div className="im-module-list">{filtered.map(lesson => <article className="ir-surface im-module-card" key={lesson.id}>
            <div className="im-module-book"><ModuleIcon size={30} /></div>
            <div className="im-module-copy"><p className="im-week">Week {String(lesson.week_number).padStart(2, '0')}</p><h3>{lesson.title}</h3><p className="im-module-description">{lesson.description}</p>
              <div className="im-attachment-list">{lesson.files?.length ? lesson.files.map(file => <button key={file.id} className="im-attachment" onClick={() => setViewing(lesson)} aria-label={`View attachment ${file.filename}`}><ModuleIcon name="file" size={16} /><span>{file.filename}{file.file_size > 0 ? ` · ${formatSize(file.file_size)}` : ''}</span></button>) : <span className="im-muted">No attachments</span>}</div>
            </div>
            <div className="im-module-visibility"><span className={`im-status ${lesson.is_published ? 'published' : 'draft'}`}>{lesson.is_published ? 'Published' : 'Draft'}</span><p><ModuleIcon name={lesson.is_published ? 'eye' : 'lock'} size={18} />{lesson.is_published ? 'Visible to students' : 'Hidden from students'}</p></div>
            <div className="im-module-actions"><button className="ir-secondary" onClick={() => setViewing(lesson)}>View</button><button className="ir-secondary" disabled={Boolean(busy)} onClick={() => startEditor(lesson)}>Edit</button><button className="ir-secondary" disabled={Boolean(busy)} onClick={() => toggle(lesson)}>{busy === lesson.id ? 'Saving…' : lesson.is_published ? 'Unpublish' : 'Publish'}</button><button className="ir-secondary im-danger" disabled={Boolean(busy)} onClick={() => setDeleteTarget(lesson)}>Delete</button></div>
          </article>)}</div>}
        <p className="im-private-note"><ModuleIcon name="lock" size={18} />Draft modules stay private until you publish them.</p>
      </>}
    {viewing && <ModuleDialog lesson={viewing} onClose={() => setViewing(null)} onFileDeleted={(lessonId, fileId) => setLessons(previous => previous.map(lesson => lesson.id === lessonId ? { ...lesson, files: lesson.files.filter(file => file.id !== fileId) } : lesson))} />}
    {deleteTarget && <DeleteModuleDialog lesson={deleteTarget} busy={Boolean(busy)} error={error} onClose={() => setDeleteTarget(null)} onDelete={deleteModule} />}
  </section>
}
