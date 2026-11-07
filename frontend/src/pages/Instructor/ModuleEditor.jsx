import { useEffect, useRef, useState } from 'react'
import ModuleIcon from './ModuleIcon'
import { FILE_ACCEPT, fileError, formatSize, moduleJson } from './moduleApi'
import { saveModule } from './saveModule'

export default function ModuleEditor({ classId, subjectId, classInfo, lesson, onCancel, onSaved }) {
  const [form, setForm] = useState({ title: lesson?.title || '', description: lesson?.description || '', week: lesson?.week_number || 1, published: lesson?.is_published || false })
  const [files, setFiles] = useState([])
  const [savedId, setSavedId] = useState(lesson?.id || null)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const busy = useRef(false)
  const heading = useRef(null)
  const className = classInfo?.subjects?.join(' · ') || classInfo?.name || 'Assigned class'

  useEffect(() => { heading.current?.focus() }, [])
  useEffect(() => {
    if (!dirty && !saving) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  function change(field, value) { setForm(previous => ({ ...previous, [field]: value })); setDirty(true) }
  function cancel() {
    if (busy.current) return
    if (dirty || uncertain) { setDiscarding(true); return }
    onCancel()
  }
  function pickFiles(event) {
    const incoming = Array.from(event.target.files)
    const rejected = incoming.map(fileError).filter(Boolean)
    setError(rejected.join(' '))
    setFiles(previous => [...previous, ...incoming.filter(file => !fileError(file)).map(file => ({ file, uploaded: false }))])
    if (incoming.length) setDirty(true)
    event.target.value = ''
  }
  async function save(event) {
    event.preventDefault()
    if (busy.current || uncertain) return
    if (!form.title.trim() || form.title.trim().length > 200 || !form.description.trim() || !Number.isInteger(Number(form.week)) || Number(form.week) < 1 || Number(form.week) > 18) {
      setError('Enter a title, description and a whole-number week from 1 to 18.'); return
    }
    busy.current = true; setSaving(true); setError('')
    try {
      const details = { title: form.title.trim(), description: form.description.trim(), week_number: Number(form.week) }
      await saveModule({ savedId, details, subjectId, classId, files, published: form.published, request: moduleJson, onCreated: setSavedId,
        onUploaded: index => setFiles(previous => previous.map((item, current) => current === index ? { ...item, uploaded: true } : item)) })
      setDirty(false)
      onSaved(form.published ? 'Module published. Students in this class can now access it.' : 'Module saved as Draft. It is hidden from students.')
    } catch (failure) {
      setUncertain(Boolean(failure.uncertain))
      setError(`${failure.message} Your entered values are preserved.${failure.uncertain ? ' Saving is paused to avoid duplicate records; return to the module list to inspect what was saved.' : ' Retry will reuse the same module and skip confirmed uploads.'}`)
    } finally { busy.current = false; setSaving(false) }
  }

  return <section className="im-editor" aria-labelledby="module-editor-heading">
    <nav className="im-breadcrumb" aria-label="Module location"><span>My Classes</span><span>/</span><button type="button" onClick={cancel} disabled={saving}>Class {classInfo?.section_no || classId}</button><span>/</span><strong>{lesson ? 'Edit Module' : 'New Module'}</strong></nav>
    <header className="im-editor-heading"><h1 id="module-editor-heading" ref={heading} tabIndex={-1}>{lesson ? 'Edit Module' : 'Create a Module'}</h1><p>{className} · Class {classInfo?.section_no || classId}</p></header>
    <form onSubmit={save}>
      <fieldset disabled={saving || uncertain} className="im-editor-grid">
        <div className="im-editor-main">
          <section className="ir-surface im-form-section"><h2>Module Details</h2>
            <div className="im-title-week"><label>Title <span aria-hidden="true">*</span><input required maxLength={200} value={form.title} onChange={event => change('title', event.target.value)} autoComplete="off" /></label>
              <label>Week #<input required type="number" min="1" max="18" step="1" value={form.week} onChange={event => change('week', event.target.value)} /></label></div>
            <label>Description <span aria-hidden="true">*</span><textarea required rows="5" value={form.description} onChange={event => change('description', event.target.value)} /></label>
          </section>
          <section className="ir-surface im-form-section"><h2>Learning Materials</h2>
            <label className="im-upload"><ModuleIcon name="clip" size={28} /><strong>Click to select files</strong><span>PDF, PPT/PPTX, DOC/DOCX, JPG/JPEG, PNG, ZIP · Max 16 MiB each</span><input type="file" multiple accept={FILE_ACCEPT} onChange={pickFiles} /></label>
            {lesson?.files?.length > 0 && <p className="im-muted">{lesson.files.length} existing attachment(s) remain unchanged. View the module to download or remove them.</p>}
            {files.length > 0 && <ul className="im-pending-files">{files.map((entry, index) => <li key={index}><ModuleIcon name="file" /><div><strong>{entry.file.name}</strong><span>{formatSize(entry.file.size)}{entry.uploaded ? ' · Uploaded' : ' · Ready to upload'}</span></div>{!entry.uploaded && <button type="button" className="ir-secondary" aria-label={`Remove ${entry.file.name}`} onClick={() => { setFiles(previous => previous.filter((_, i) => i !== index)); setDirty(true) }}>Remove</button>}</li>)}</ul>}
          </section>
        </div>
        <section className="ir-surface im-form-section im-visibility"><h2>Visibility</h2>
          <label className={!form.published ? 'im-choice selected' : 'im-choice'}><input type="radio" name="visibility" checked={!form.published} onChange={() => change('published', false)} /><span><strong>Draft</strong><span>Hidden from students. Publish when you are ready.</span></span></label>
          <label className={form.published ? 'im-choice selected' : 'im-choice'}><input type="radio" name="visibility" checked={form.published} onChange={() => change('published', true)} /><span><strong>Publish</strong><span>Students can see it after a successful save.</span></span></label>
          <div className="im-class-scope"><ModuleIcon /><div><strong>For this class only</strong><p>{className} · {classInfo?.section_no || classId}</p></div></div>
        </section>
      </fieldset>
      {error && <div className="im-message im-error" role="alert">{error}</div>}
      {savedId && !lesson && error && <p className="im-muted">Draft #{savedId} is saved on the server. Confirmed uploads are retained.</p>}
      <footer className="im-action-bar"><p><ModuleIcon name={form.published ? 'eye' : 'lock'} />{saving ? 'Saving module and attachments…' : form.published ? 'Visible to students after publishing' : 'Drafts stay hidden from students'}</p><div><button type="button" className="ir-secondary" disabled={saving} onClick={cancel}>{uncertain ? 'Return to modules' : 'Cancel'}</button><button type="submit" className="im-primary" disabled={saving || uncertain || !subjectId}>{saving ? 'Saving…' : form.published ? 'Publish Module' : 'Save as Draft'}</button></div></footer>
    </form>
    {discarding && <DiscardModuleDialog savedDraft={savedId && !lesson} onKeep={() => setDiscarding(false)} onDiscard={onCancel} />}
  </section>
}

function DiscardModuleDialog({ savedDraft, onKeep, onDiscard }) {
  const dialog = useRef(null)
  useEffect(() => {
    const opener = document.activeElement
    const node = dialog.current
    node.showModal()
    return () => { node.close(); if (opener?.isConnected) opener.focus() }
  }, [])
  return <dialog ref={dialog} className="im-dialog" aria-labelledby="module-discard-title" onCancel={event => { event.preventDefault(); onKeep() }}>
    <div className="im-dialog-inner"><h2 id="module-discard-title">Discard unsaved module changes?</h2>
      <p>{savedDraft ? 'The saved draft and confirmed attachments will remain in the module list. Only your unsaved changes will be discarded.' : 'This module has not been saved. Keep editing to preserve your changes.'}</p>
      <div className="im-inline-actions"><button type="button" className="ir-secondary" autoFocus onClick={onKeep}>Keep editing</button><button type="button" className="ir-secondary im-danger" onClick={onDiscard}>Discard changes</button></div>
    </div>
  </dialog>
}
