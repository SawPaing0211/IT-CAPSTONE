import { useState, useEffect, useRef, useCallback } from 'react'

const API = 'http://localhost:5000'

function token() { return localStorage.getItem('token') }

// ── tiny helpers ──────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return active
    ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-600/20 text-green-300 border border-green-600/40">Active</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600/20 text-red-300 border border-red-600/40">Inactive</span>
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl flex items-center gap-2
      ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
      {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
    </div>
  )
}

// ── CSV Upload Modal ──────────────────────────────────────────────────
function CSVUploadModal({ onClose, onSuccess }) {
  const fileRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) { showToast('Only .csv files accepted', 'error'); return }
    if (f.size > 5 * 1024 * 1024) { showToast('File exceeds 5 MB limit', 'error'); return }
    setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/api/admin/sections/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Upload failed', 'error'); return }
      setResult(data)
    } catch {
      showToast('Network error', 'error')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = [
      'section_no,subject_code,schedule,room,capacity,semester,academic_year',
      '29144,IT115,Mon 18:00-21:00,CL5,40,1st Semester,2024-2025',
      '29145,IT116,Tue 13:00-16:00,CL3,35,1st Semester,2024-2025',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'sections_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Toast toast={toast} />
      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-xl">📤</div>
            <div>
              <h2 className="text-xl font-black text-white">Bulk Upload Sections</h2>
              <p className="text-purple-300/70 text-xs">Upload a CSV to create multiple sections at once</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                  ${isDragging ? 'border-purple-400 bg-purple-600/10 scale-[1.01]' : 'border-slate-600 hover:border-purple-500 hover:bg-purple-600/5'}
                  ${file ? 'border-green-500 bg-green-600/5' : ''}`}
              >
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                <div className="text-4xl mb-2">{file ? '📄' : '📂'}</div>
                {file
                  ? <p className="text-green-400 font-bold">{file.name}</p>
                  : <p className="text-white font-bold">Drop CSV here or click to browse</p>
                }
                <p className="text-slate-400 text-xs mt-1">max 5 MB</p>
              </div>

              {/* Columns info */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-1">
                <p className="text-slate-300 text-sm font-semibold mb-2">Required CSV columns:</p>
                <div className="flex flex-wrap gap-2">
                  {['section_no', 'subject_code'].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs font-mono border border-purple-600/40">{c} *</span>
                  ))}
                  {['schedule', 'room', 'capacity', 'semester', 'academic_year'].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs font-mono border border-slate-600">{c}</span>
                  ))}
                </div>
              </div>

              <button onClick={downloadTemplate} className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-semibold border border-slate-700 transition flex items-center justify-center gap-2">
                ⬇️ Download Template CSV
              </button>

              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition">Cancel</button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-black transition shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
                >
                  {uploading ? <><span className="animate-spin">⟳</span> Uploading…</> : '📤 Upload'}
                </button>
              </div>
            </>
          ) : (
            /* Result */
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Total', value: result.summary?.total_rows ?? 0, color: 'text-white', bg: 'bg-slate-800/60 border-slate-700' },
                  { label: 'Created', value: result.summary?.created ?? 0, color: 'text-green-400', bg: 'bg-green-900/20 border-green-600/30' },
                  { label: 'Skipped', value: result.summary?.skipped ?? 0, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-600/30' },
                  { label: 'Errors', value: result.summary?.errors ?? 0, color: 'text-red-400', bg: 'bg-red-900/20 border-red-600/30' },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl p-3 border text-center ${c.bg}`}>
                    <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                    <p className="text-slate-400 text-xs">{c.label}</p>
                  </div>
                ))}
              </div>

              {result.results?.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-slate-700 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800/80 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-400">Row</th>
                        <th className="text-left px-3 py-2 text-slate-400">Section</th>
                        <th className="text-left px-3 py-2 text-slate-400">Status</th>
                        <th className="text-left px-3 py-2 text-slate-400">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {result.results.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{r.row}</td>
                          <td className="px-3 py-1.5 text-slate-300 font-mono">{r.section_no || '—'}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold
                              ${r.status === 'created' ? 'bg-green-600/20 text-green-300' :
                                r.status === 'skipped' ? 'bg-yellow-600/20 text-yellow-300' : 'bg-red-600/20 text-red-300'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-400">{r.reason || r.subject || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setResult(null); setFile(null) }} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition">Upload Another</button>
                <button onClick={() => { onSuccess(); onClose() }} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-black transition">Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Create / Edit Modal ───────────────────────────────────────────────
function SectionFormModal({ section, subjects, onClose, onSuccess }) {
  const isEdit = !!section
  const [form, setForm] = useState({
    section_no:    section?.section_no    ?? '',
    subject_id:    section?.subject_id    ?? '',
    schedule:      section?.schedule      ?? '',
    room:          section?.room          ?? '',
    capacity:      section?.capacity      ?? 40,
    semester:      section?.semester      ?? '',
    academic_year: section?.academic_year ?? '',
    is_active:     section?.is_active     ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  const handleSubmit = async () => {
    if (!form.section_no.trim()) { showToast('Section number is required', 'error'); return }
    if (!form.subject_id) { showToast('Subject is required', 'error'); return }

    setLoading(true)
    try {
      const url = isEdit ? `${API}/api/admin/sections/${section.id}` : `${API}/api/admin/sections`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          subject_id: parseInt(form.subject_id),
          capacity:   parseInt(form.capacity) || 40,
        })
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed', 'error'); return }
      onSuccess()
      onClose()
    } catch {
      showToast('Network error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition text-sm"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Toast toast={toast} />
      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
              {isEdit ? '✏️' : '➕'}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{isEdit ? 'Edit Section' : 'Create Section'}</h2>
              <p className="text-purple-300/70 text-xs">{isEdit ? `Editing section ${section.section_no}` : 'Add a new subject section'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Section No + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Class Code *</label>
              <input value={form.section_no} onChange={e => setForm({ ...form, section_no: e.target.value })}
                placeholder="e.g., 29144" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Capacity</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                min="1" max="200" className={inputCls} />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject *</label>
            <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} className={inputCls}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule + Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Schedule</label>
              <input value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}
                placeholder="e.g., Mon 18:00-21:00" className={inputCls} />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Room</label>
              <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g., CL5" className={inputCls} />
            </div>
          </div>

          {/* Semester + Academic Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Semester</label>
              <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} className={inputCls}>
                <option value="">— Select —</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Academic Year</label>
              <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                placeholder="e.g., 2024-2025" className={inputCls} />
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <span className="text-slate-300 text-sm font-semibold flex-1">Section Active</span>
              <button
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition border border-slate-700">Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-xl text-white font-black transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin">⟳</span> Saving…</> : isEdit ? '💾 Save Changes' : '✅ Create Section'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Enrollments Modal ─────────────────────────────────────────────────
function EnrollmentsModal({ section, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/admin/sections/${section.id}/enrollments`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    }).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [section.id])

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-xl">👥</div>
            <div>
              <h2 className="text-xl font-black text-white">Section {section.section_no}</h2>
              <p className="text-purple-300/70 text-xs">{data?.enrolled_count ?? '…'} students enrolled</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent" /></div>
          ) : data?.students?.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👤</div>
              <p className="text-slate-400">No students enrolled yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto will-change-scroll overscroll-contain">
              {data?.students?.map(s => (
                <div key={s.enrollment_id} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700 transform-gpu">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(s.full_name || s.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{s.full_name || s.username}</p>
                    <p className="text-slate-400 text-xs truncate">{s.username} · {s.email}</p>
                  </div>
                  <p className="text-slate-500 text-xs">{new Date(s.enrolled_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={onClose} className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function SectionsManagement() {
  const [sections, setSections]           = useState([])
  const [subjects, setSubjects]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [toast, setToast]                 = useState(null)

  // modals
  const [createModal, setCreateModal]         = useState(false)
  const [editModal, setEditModal]             = useState(null)   // section object
  const [enrollModal, setEnrollModal]         = useState(null)   // section object
  const [csvModal, setCSVModal]               = useState(false)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API}/api/admin/sections`, { headers: { 'Authorization': `Bearer ${token()}` } })
      if (res.ok) setSections(await res.json())
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API}/api/admin/subjects`, { headers: { 'Authorization': `Bearer ${token()}` } })
      if (res.ok) setSubjects(await res.json())
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchSections(); fetchSubjects() }, [])

  const handleDelete = async (section) => {
    if (!confirm(`Delete section ${section.section_no}?\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch(`${API}/api/admin/sections/${section.id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token()}` }
      })
      const data = await res.json()
      if (res.ok) { showToast('Section deleted'); fetchSections() }
      else showToast(data.error || 'Failed to delete', 'error')
    } catch { showToast('Network error', 'error') }
  }

  // ── Filtered list ────────────────────────────────────────────────────
  const filtered = sections.filter(s => {
    if (subjectFilter !== 'all' && String(s.subject_id) !== subjectFilter) return false
    if (statusFilter === 'active' && !s.is_active) return false
    if (statusFilter === 'inactive' && s.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.section_no.toLowerCase().includes(q) ||
        (s.subject_name || '').toLowerCase().includes(q) ||
        (s.subject_code || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q) ||
        (s.schedule || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Stats ────────────────────────────────────────────────────────────
  const totalEnrolled  = sections.reduce((s, sec) => s + (sec.current_count || 0), 0)
  const totalCapacity  = sections.reduce((s, sec) => s + (sec.capacity || 0), 0)
  const activeSections = sections.filter(s => s.is_active).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Subject Sections</h1>
          <p className="text-slate-400 mt-1">
            Manage <strong className="text-purple-300">Class Codes</strong> (e.g., 29144) per subject — used for regular &amp; irregular student enrollment
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={fetchSections}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition flex items-center gap-2">
            🔄 Refresh
          </button>
          <button onClick={() => setCSVModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold transition shadow-lg shadow-green-600/30 flex items-center gap-2">
            📤 Upload CSV
          </button>
          <button onClick={() => setCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-2">
            ➕ Create Section
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Sections</p>
          <p className="text-3xl font-bold text-purple-300 mt-1">{sections.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active</p>
          <p className="text-3xl font-bold text-green-300 mt-1">{activeSections}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Enrolled</p>
          <p className="text-3xl font-bold text-blue-300 mt-1">{totalEnrolled}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 border border-yellow-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Capacity</p>
          <p className="text-3xl font-bold text-yellow-300 mt-1">{totalCapacity}</p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input type="text" placeholder="Search sections…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-purple-500 transition" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition">
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500 transition">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-slate-400">Showing <span className="text-white font-bold">{filtered.length}</span> of <span className="text-white font-bold">{sections.length}</span> sections</span>
          {(search || subjectFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setSubjectFilter('all'); setStatusFilter('all') }}
              className="text-purple-400 hover:text-purple-300 text-xs">Clear filters</button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/80 rounded-2xl border border-dashed border-slate-700 p-12 text-center">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-slate-400 text-lg font-semibold">
            {sections.length === 0 ? 'No sections yet — create your first one!' : 'No sections match your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80 border-b border-purple-600/30">
                <tr>
                  {['Class Code', 'Subject', 'Block Code', 'Schedule', 'Room', 'Enrolled', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(s => {
                  const pct = s.capacity > 0 ? Math.round((s.current_count / s.capacity) * 100) : 0
                  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/50 transition group">
                      {/* Section No */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-purple-300 text-sm">{s.section_no}</span>
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3">
                        <div>
                          {s.subject_code && (
                            <span className="font-mono text-xs font-bold bg-slate-800 text-purple-300 border border-purple-600/30 px-1.5 py-0.5 rounded mr-1">{s.subject_code}</span>
                          )}
                          <span className="text-white text-sm">{s.subject_name || '—'}</span>
                        </div>
                      </td>

                      {/* Block Code (e.g., IT101) */}
                      <td className="px-4 py-3">
                        {s.block_code
                          ? <span className="px-2 py-0.5 bg-blue-600/20 text-blue-300 border border-blue-600/30 rounded text-xs font-bold">{s.block_code}</span>
                          : <span className="text-slate-500 text-xs italic">Irregular</span>
                        }
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">{s.schedule || '—'}</td>

                      {/* Room */}
                      <td className="px-4 py-3">
                        {s.room
                          ? <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono">{s.room}</span>
                          : <span className="text-slate-500 text-xs">—</span>
                        }
                      </td>

                      {/* Enrolled */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <span className="text-white text-xs font-bold">{s.current_count} / {s.capacity}</span>
                          <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge active={s.is_active} /></td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => setEnrollModal(s)}
                            className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-bold transition"
                            title="View enrollments">
                            👥
                          </button>
                          <button onClick={() => setEditModal(s)}
                            className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-xs font-bold transition"
                            title="Edit section">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(s)}
                            className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-xs font-bold transition"
                            title="Delete section">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {createModal && (
        <SectionFormModal subjects={subjects} onClose={() => setCreateModal(false)}
          onSuccess={() => { fetchSections(); showToast('Section created!') }} />
      )}
      {editModal && (
        <SectionFormModal section={editModal} subjects={subjects} onClose={() => setEditModal(null)}
          onSuccess={() => { fetchSections(); showToast('Section updated!') }} />
      )}
      {enrollModal && (
        <EnrollmentsModal section={enrollModal} onClose={() => setEnrollModal(null)} />
      )}
      {csvModal && (
        <CSVUploadModal onClose={() => setCSVModal(false)}
          onSuccess={() => { fetchSections(); showToast(`Sections uploaded!`) }} />
      )}
    </div>
  )
}
