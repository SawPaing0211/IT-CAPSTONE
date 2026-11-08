import AdminActionDialog from './AdminActionDialog'
import createUsers from '../../assets/admin/create-users.png'
import classCodes from '../../assets/admin/class-codes.png'
import studentRole from '../../assets/admin/role-student.png'
import instructorRole from '../../assets/admin/role-instructor.png'
import adminRole from '../../assets/admin/role-admin.png'
import { useState, useEffect } from 'react'
import { API_BASE, authFetch } from '../../api/client'

import PasswordField from '../../components/PasswordField'

const API = API_BASE


// ── password strength scorer — same logic we use everywhere ──────────────────
function scorePassword(pw) {
  let s = 0
  if (pw.length >= 8)            s++
  if (pw.length >= 12)           s++
  if (/[A-Z]/.test(pw))         s++
  if (/[0-9]/.test(pw))         s++
  if (/[^A-Za-z0-9]/.test(pw))  s++
  return s
}

const STRENGTH_LABEL = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e']

// ── required CSV columns for the enrollment upload ───────────────────────────
const REQUIRED_CSV_COLS = ['student_id', 'firstname', 'lastname', 'student_type', 'section_no']

// tiny delay helper for animation timing

// ── sample csv so admins can download a template and not guess the format ─────
const SAMPLE_CSV = [
  'student_id,firstname,middlename,lastname,suffix,student_type,section_no',
  '2024-00001,Juan,Santos,Dela Cruz,,regular,29017',
  '2024-00002,Maria,Reyes,Garcia,,regular,29017',
  '2024-30001,Pedro,Jose,Reyes,,irregular,29017',
  '2024-30001,Pedro,Jose,Reyes,,irregular,29018',
].join('\n')

// ── tiny csv parser we lifted from UploadCSVModal — keeps things consistent ───
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    const row = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? '' })
    rows.push(row)
  }
  return { headers, rows }
}

// ── status badge for the csv result table ────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    created:  { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', label: '✅ Created'  },
    enrolled: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: '🔗 Enrolled' },
    skipped:  { bg: 'rgba(234,179,8,0.15)',  color: '#facc15', label: '⏭ Skipped'  },
    error:    { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', label: '❌ Error'    },
  }
  const s = styles[status] ?? styles.error
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      fontSize: '0.7rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── the main modal ────────────────────────────────────────────────────────────
export default function CreateUserModal({ sections = [], onClose, onSuccess }) {

  // 'single' = create one user, 'bulk' = upload enrollment csv
  const [activeTab, setActiveTab] = useState('single')

  // ── SINGLE USER STATE ─────────────────────────────────────────────────────
  const [step, setStep]                   = useState(1) // 1=form, 2=success
  const [loading, setLoading]             = useState(false)
  const [errors, setErrors]               = useState({})
  const [toast, setToast]                 = useState(null)
  const [createdUser, setCreatedUser]     = useState(null)
  const [pwStrength, setPwStrength]       = useState(0)

  const [form, setForm] = useState({
    username:   '',
    password:   '',
    role:       'student',
    section_id: '',
  })

  // ── BULK CSV STATE ────────────────────────────────────────────────────────
  const [csvFile, setCsvFile]               = useState(null)
  const [csvParsed, setCsvParsed]           = useState(null)
  const [csvStep, setCsvStep]               = useState('select') // select | preview | uploading | done
  const [csvResult, setCsvResult]           = useState(null)
  const [isDragging, setIsDragging]         = useState(false)
  const [csvToast, setCsvToast]             = useState(null)

  // Institution settings come from the server, so nothing here hardcodes a school.
  // The server enforces both rules; this only decides what the form offers.
  const [policy, setPolicy] = useState({ student_email_domain: 'laconsolacion.edu', can_create_admins: false })
  const headAdmin = policy.can_create_admins
  const busy = loading || csvStep === 'uploading'
  const emailLocal = form.username.trim().toLowerCase()
  const generatedEmailLocal = form.role === 'student' ? emailLocal : emailLocal.replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/api/admin/policy`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !cancelled) setPolicy(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // ── helpers ───────────────────────────────────────────────────────────────
  // Show a temporary toast for the single-user form
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Show a temporary toast for the csv upload flow
  const showCsvToast = (msg, type = 'success') => {
    setCsvToast({ msg, type })
    setTimeout(() => setCsvToast(null), 4000)
  }

  // Clear the single-user form back to its defaults
  const resetForm = () => {
    setForm({ username: '', password: '', role: 'student', section_id: '' })
    setPwStrength(0)
    setCreatedUser(null)
    setStep(1)
    setErrors({})
  }

  // Clear the csv upload state back to the select step
  const resetCsv = () => {
    setCsvFile(null)
    setCsvParsed(null)
    setCsvStep('select')
    setCsvResult(null)
  }

  // generate a secure random password — same pool as our backend
  const generatePassword = () => {
    const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    const limit = 256 - (256 % pool.length)
    let pw
    do {
      pw = ''
      while (pw.length < 14) {
        for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
          if (byte < limit) pw += pool[byte % pool.length]
          if (pw.length === 14) break
        }
      }
    } while (!/[A-Za-z]/.test(pw) || !/\d/.test(pw))
    setForm(f => ({ ...f, password: pw }))
    setPwStrength(scorePassword(pw))
  }

  // ── single user validation ────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.username.trim())         errs.username = 'Username is required'
    else if (form.username.length < 3) errs.username = 'Min 3 characters'
    if (!form.password)                errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Min 8 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── create single user — hits our backend POST /api/admin/users ───────────
  const handleSubmit = async () => {
    if (loading || !validate()) return
    setLoading(true)
    try {
      const res = await authFetch(`${API}/api/admin/users`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:    form.username.trim(),
          password:    form.password,
          role:        form.role,
          section_ids: form.role === 'student' && form.section_id ? [Number(form.section_id)] : [],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreatedUser({ ...data.user, password: form.password })
        setStep(2)
      } else {
        showToast(data.error || 'Failed to create user', 'error')
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── csv file reading + validation ─────────────────────────────────────────
  const readCsvFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      showCsvToast('Only .csv files are accepted', 'error'); return
    }
    if (f.size > 5 * 1024 * 1024) {
      showCsvToast('File exceeds 5 MB limit', 'error'); return
    }
    setCsvFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result)
      const missing = REQUIRED_CSV_COLS.filter(h => !headers.includes(h))
      if (missing.length) {
        showCsvToast(`Missing columns: ${missing.join(', ')}`, 'error')
        setCsvFile(null); return
      }
      setCsvParsed({ headers, rows })
      setCsvStep('preview')
    }
    reader.readAsText(f)
  }

  // Read the file dropped onto the drop zone
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    readCsvFile(e.dataTransfer.files[0])
  }

  // ── bulk upload — same endpoint as UploadCSVModal ─────────────────────────
  const handleCsvUpload = async () => {
    if (csvStep !== 'preview' || !csvFile) return
    setCsvStep('uploading')
    try {
      const fd = new FormData()
      fd.append('file', csvFile)
      const res  = await authFetch(`${API}/api/admin/enrollment/bulk-upload`, {
        method:  'POST',
        body:    fd,
      })
      const data = await res.json()
      if (!res.ok && res.status !== 207) {
        showCsvToast(data.error || 'Upload failed', 'error')
        setCsvStep('preview'); return
      }
      setCsvResult(data)
      setCsvStep('done')
    } catch {
      showCsvToast('Network error — please try again', 'error')
      setCsvStep('preview')
    }
  }

  // ── download the credential csv the backend returns after bulk upload ──────
  const downloadCredentials = () => {
    const bytes = Uint8Array.from(atob(csvResult.credential_csv), char => char.charCodeAt(0))
    const blob  = new Blob([bytes], { type: 'text/csv' })
    const url   = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credentials_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // download the sample template so admins know the exact column format
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'enrollment_template.csv'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // ── group sections by subject for the dropdown — way easier to scan ────────
  // before this it was just a flat list of 31 items which was chaos
  const groupedSections = sections.reduce((acc, s) => {
    const key = s.subject_name || s.subject_code || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  // Count regular vs irregular rows for the preview summary
  const regularCount   = csvParsed?.rows.filter(r => r.student_type?.toLowerCase() === 'regular').length   ?? 0
  const irregularCount = csvParsed?.rows.filter(r => r.student_type?.toLowerCase() === 'irregular').length ?? 0

  // ── shared input style so everything looks consistent ─────────────────────
  const inputCls = (hasError) =>
    `w-full bg-slate-800/80 border rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all text-sm ${
      hasError ? 'border-red-500 focus:border-red-400' : 'border-slate-700/60 focus:border-purple-500'
    }`

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminActionDialog title="Create / Enroll Users" description="Create one account or enroll students from a CSV." emblem={createUsers} onClose={onClose} busy={busy}>
      {/* global toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-xl font-semibold text-sm text-white shadow-2xl flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

        {/* ── tab switcher ── */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-amber-300/20 px-3 py-3 sm:px-6">
          <button
            type="button"
            disabled={busy}
            aria-pressed={activeTab === 'single'}
            onClick={() => setActiveTab('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-purple-600/30 border border-purple-500/60 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <img src={createUsers} alt="" className="size-6" /> Single User
          </button>
          <button
            type="button"
            disabled={busy}
            aria-pressed={activeTab === 'bulk'}
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-purple-600/30 border border-purple-500/60 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <img src={classCodes} alt="" className="size-6" /> Bulk CSV
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB: SINGLE USER
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'single' && (
          <div className="admin-action-scroll flex-1">
            <div className="space-y-5 p-4 sm:p-6">

              {step === 1 && (
                <>
                  {/* role selector — only head admin sees the Admin tile */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Account Role
                    </p>
                    <div className={`grid gap-2 ${headAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {[
                        { val: 'student',       label: 'Student',     icon: studentRole, desc: 'Enrolled learner'    },
                        { val: 'instructor',    label: 'Instructor',  icon: instructorRole, desc: 'Course facilitator' },
                        // only the head admin can create other admins (decided by the server)
                        ...(headAdmin ? [{ val: 'administrator', label: 'Admin', icon: adminRole, desc: 'Full access' }] : []),
                      ].map(r => (
                        <button
                          key={r.val}
                          type="button"
                          aria-pressed={form.role === r.val}
                          disabled={loading}
                          onClick={() => setForm(f => ({ ...f, role: r.val }))}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm ${
                            form.role === r.val
                              ? r.val === 'administrator'
                                ? 'bg-yellow-600/20 border-yellow-500/70 text-white shadow-lg shadow-yellow-600/20'
                                : 'bg-purple-600/25 border-purple-500/70 text-white shadow-lg shadow-purple-600/20'
                              : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <img src={r.icon} alt="" className="size-11 object-contain" width="44" height="44" />
                          <span className="font-bold leading-tight">{r.label}</span>
                          <span className="text-xs text-slate-300">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                    {/* reminder for non-head admins so they know why admin option is missing */}
                    {!headAdmin && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                        <span>🔒</span> Administrator accounts can only be created by the Head Administrator.
                      </p>
                    )}
                  </div>

                  {/* username */}
                  <div>
                    <label htmlFor="create-user-username" className="mb-2 block text-xs font-semibold text-slate-300">
                      Username *
                    </label>
                    <input
                      id="create-user-username"
                      type="text"
                      disabled={loading}
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="e.g., john_doe or 2024-00001"
                      autoComplete="off"
                      className={inputCls(errors.username)}
                    />
                    {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-300">Generated sign-in email</span>
                    <input type="text" readOnly className={inputCls(false)} placeholder={'@' + policy.student_email_domain}
                      value={generatedEmailLocal ? generatedEmailLocal + '@' + policy.student_email_domain : ''} />
                  </label>

                  {/* password + strength bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="create-user-password" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Password *
                      </label>
                      <button
                        onClick={generatePassword}
                        disabled={loading}
                        className="text-xs text-purple-400 hover:text-purple-300 transition font-semibold flex items-center gap-1"
                      >
                        ⚡ Auto-generate
                      </button>
                    </div>
                    <PasswordField
                      key={form.role}
                      id="create-user-password"
                      disabled={loading}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={e => {
                        setForm(f => ({ ...f, password: e.target.value }))
                        setPwStrength(scorePassword(e.target.value))
                      }}
                      placeholder="Min. 8 characters"
                      className={`${inputCls(errors.password)} font-mono`}
                    />

                    {/* strength indicator */}
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ background: i <= pwStrength ? STRENGTH_COLOR[pwStrength] : 'rgba(255,255,255,0.08)' }}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-medium" style={{ color: STRENGTH_COLOR[pwStrength] || '#64748b' }}>
                          {STRENGTH_LABEL[pwStrength]}
                        </p>
                      </div>
                    )}
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  </div>

                  {/* class code dropdown — only for students, grouped by subject */}
                  {form.role === 'student' && (
                    <div>
                      <label htmlFor="create-user-class-code" className="mb-2 block text-xs font-semibold text-slate-300">
                        Assign to Class Code
                        <span className="ml-1 normal-case font-normal text-slate-600">(optional)</span>
                      </label>

                      {/* grouped select — way more readable than the old flat list */}
                      <select
                        id="create-user-class-code"
                        disabled={loading}
                        value={form.section_id}
                        onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                        size={1}
                      >
                        <option value="">— None / Assign Later —</option>
                        {Object.entries(groupedSections).map(([subjectName, secs]) => (
                          <optgroup key={subjectName} label={subjectName}>
                            {secs.map(s => (
                              <option key={s.id} value={s.id}>
                                {/* format: CODE — Schedule (Semester) so you can scan fast */}
                                {s.section_no}
                                {s.schedule ? ` · ${s.schedule}` : ''}
                                {s.semester  ? ` (${s.semester})` : ''}
                                {s.student_count != null ? ` — ${s.student_count} enrolled` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Class codes are grouped by subject. You can assign more from Manage User later.
                      </p>
                    </div>
                  )}

                  {/* action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={onClose}
                      disabled={loading}
                      className="admin-button flex-1 py-2.5 border rounded-xl text-white font-semibold text-sm transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="admin-button admin-button-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                      {loading
                        ? <><span className="animate-spin">⟳</span> Creating…</>
                        : 'Create Account'
                      }
                    </button>
                  </div>
                </>
              )}

              {/* ── step 2: success screen ── */}
              {step === 2 && createdUser && (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto bg-emerald-600/15 border-2 border-emerald-500/40 rounded-full flex items-center justify-center text-3xl">
                      ✅
                    </div>
                    <h3 className="text-lg font-black text-white">Account Created!</h3>
                    <p className="text-slate-500 text-xs">Save these credentials — the password won't be shown again.</p>
                  </div>

                  {/* credential card */}
                  <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-1">
                    {[
                      { label: 'Username', value: createdUser.username },
                      { label: createdUser.role === 'student' ? 'Sign-in email (generated)' : 'Email', value: createdUser.email },
                      { label: 'Role',     value: (
                        <span className="capitalize px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">
                          {createdUser.role}
                        </span>
                      )},
                      { label: 'Password', value: (
                        <span className="font-mono text-emerald-300 text-xs">{createdUser.password}</span>
                      )},
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
                        <span className="text-xs text-slate-500">{row.label}</span>
                        <span className="text-sm text-white">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetForm}
                      className="admin-button flex-1 py-2.5 border rounded-xl text-slate-300 font-semibold text-sm transition"
                    >
                      + Create Another
                    </button>
                    <button
                      onClick={() => { onSuccess(); resetForm() }}
                      className="admin-button admin-button-primary flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB: BULK CSV — mirrors UploadCSVModal but lives inline here
            so admins don't have to go to User Management for quick uploads
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'bulk' && (
          <div className="admin-action-scroll flex-1">
            <div className="space-y-5 p-4 sm:p-6">

              {/* csv toast */}
              {csvToast && (
                <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  csvToast.type === 'error'
                    ? 'bg-red-600/20 border border-red-600/40 text-red-300'
                    : 'bg-emerald-600/20 border border-emerald-600/40 text-emerald-300'
                }`}>
                  {csvToast.type === 'error' ? '❌' : '✅'} {csvToast.msg}
                </div>
              )}

              {/* ── SELECT step: drop zone + info ── */}
              {csvStep === 'select' && (
                <>
                  {/* drag and drop zone */}
                  <label
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    className={`block border border-dashed rounded-xl p-6 focus-within:outline focus-within:outline-2 focus-within:outline-amber-300 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-purple-400 bg-purple-600/10 scale-[1.01]'
                        : 'border-slate-600 hover:border-purple-500 hover:bg-purple-600/5'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      aria-label="Choose enrollment CSV"
                      onChange={e => readCsvFile(e.target.files[0])}
                    />
                    <img src={classCodes} alt="" className="mx-auto mb-3 size-14 object-contain" />
                    <p className="text-white font-bold text-sm">
                      {isDragging ? 'Drop it!' : 'Drop your enrollment CSV here'}
                    </p>
                    <p className="text-slate-300 text-xs mt-1">or browse for a file · max 5 MB · max 2,000 rows</p>
                  </label>

                  {/* two-column explainer */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-emerald-600/20">
                      <p className="text-emerald-400 font-bold text-xs mb-1">🏫 Regular</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Set <code className="text-purple-300">student_type=regular</code> and fill <code className="text-purple-300">section_no</code> with their class code.
                      </p>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3 border border-blue-600/20">
                      <p className="text-blue-400 font-bold text-xs mb-1">📋 Irregular</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Set <code className="text-purple-300">student_type=irregular</code> and fill <code className="text-purple-300">section_no</code>. One row per section.
                      </p>
                    </div>
                  </div>

                  {/* required columns reference */}
                  <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-400 font-semibold mb-2">Required columns:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REQUIRED_CSV_COLS.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-lg text-purple-300 text-[11px] font-mono">
                          {c} <span className="text-red-400">*</span>
                        </span>
                      ))}
                      {['middlename','suffix'].map(c => (                        <span key={c} className="px-2 py-0.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-[11px] font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* download sample template */}
                  <button
                    onClick={downloadSample}
                    className="admin-button w-full py-2.5 border rounded-xl text-slate-300 text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    <span>⬇️</span> Download Sample Template
                  </button>
                </>
              )}

              {/* ── PREVIEW step: show parsed rows before uploading ── */}
              {csvStep === 'preview' && csvParsed && (
                <>
                  {/* row counts */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Total',      val: csvParsed.rows.length, color: 'text-white'     },
                      { label: 'Regular',    val: regularCount,           color: 'text-emerald-400' },
                      { label: 'Irregular',  val: irregularCount,         color: 'text-blue-400'  },
                      { label: 'Ready',      val: csvParsed.rows.length,  color: 'text-purple-400' },
                    ].map(c => (
                      <div key={c.label} className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/40">
                        <p className={`text-xl font-black ${c.color}`}>{c.val}</p>
                        <p className="text-slate-500 text-[11px]">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* preview table — first 6 rows */}
                  <div className="rounded-xl overflow-hidden border border-slate-700/50">
                    <p className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/60">
                      Preview — first 6 rows
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-700/50">
                            {csvParsed.headers.map(h => (
                              <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {csvParsed.rows.slice(0, 6).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-800/30 transition">
                              {csvParsed.headers.map(h => (
                                <td key={h} className="px-3 py-2 text-slate-400 font-mono">
                                  {row[h] || <span className="text-slate-700">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvParsed.rows.length > 6 && (
                        <p className="text-center text-slate-600 text-xs py-2">
                          …and {csvParsed.rows.length - 6} more rows
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetCsv}
                      className="admin-button flex-1 py-2.5 border rounded-xl text-white font-semibold text-sm transition"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleCsvUpload}
                      className="admin-button admin-button-primary flex-1 py-2.5 rounded-xl text-white font-black text-sm transition flex items-center justify-center gap-2"
                    >
                      📤 Upload {csvParsed.rows.length} Rows
                    </button>
                  </div>
                </>
              )}

              {/* ── UPLOADING step: spinner while we wait ── */}
              {csvStep === 'uploading' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-600/30 border-t-purple-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">📤</div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold">Processing enrollment…</p>
                    <p className="text-slate-500 text-sm mt-1">Creating accounts and enrolling {csvParsed?.rows.length} rows</p>
                  </div>
                </div>
              )}

              {/* ── DONE step: results + credential download ── */}
              {csvStep === 'done' && csvResult && (
                <>
                  {/* summary counts */}
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { label: 'Total',    val: csvResult.summary?.total_rows ?? 0, color: 'text-white'      },
                      { label: 'Created',  val: csvResult.summary?.created    ?? 0, color: 'text-emerald-400' },
                      { label: 'Enrolled', val: csvResult.summary?.enrolled   ?? 0, color: 'text-blue-400'   },
                      { label: 'Skipped',  val: csvResult.summary?.skipped    ?? 0, color: 'text-yellow-400' },
                      { label: 'Errors',   val: csvResult.summary?.errors     ?? 0, color: 'text-red-400'    },
                    ].map(c => (
                      <div key={c.label} className="bg-slate-800/60 rounded-xl p-2.5 text-center border border-slate-700/40">
                        <p className={`text-lg font-black ${c.color}`}>{c.val}</p>
                        <p className="text-slate-600 text-[10px]">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* server-side errors if any */}
                  {csvResult.errors?.length > 0 && (
                    <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-3 max-h-28 overflow-y-auto overscroll-contain">
                      <p className="text-red-300 text-xs font-bold mb-1">⚠️ Rows skipped:</p>
                      {csvResult.errors.map((e, i) => (
                        <p key={i} className="text-red-400 text-[11px] font-mono">{e}</p>
                      ))}
                    </div>
                  )}

                  {/* credential csv download — this is the important one */}
                  {csvResult.credential_csv && (
                    <div className="flex items-center gap-3 p-3.5 bg-blue-900/20 border border-blue-600/30 rounded-xl">
                      <span className="text-2xl flex-shrink-0">🔐</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-300 font-bold text-sm">Credentials ready</p>
                        <p className="text-slate-500 text-xs mt-0.5">Emails + temporary passwords for all created accounts</p>
                      </div>
                      <button
                        onClick={downloadCredentials}
                        className="admin-button admin-button-primary px-3 py-1.5 rounded-lg text-white text-xs font-bold transition flex-shrink-0"
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={resetCsv}
                      className="admin-button flex-1 py-2.5 border rounded-xl text-slate-300 font-semibold text-sm transition"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={() => { onSuccess?.(); resetCsv() }}
                      className="admin-button admin-button-primary flex-1 py-2.5 rounded-xl text-white font-black text-sm transition"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

    </AdminActionDialog>
  )
}
