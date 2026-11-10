import { useState, useRef } from 'react'
import { parseCSV } from '../../utils/enrollmentCsv'
import { API_BASE, authFetch } from '../../api/client'
import AdminActionDialog from './AdminActionDialog'
import classCodeSeal from '../../assets/admin/class-code-seal.svg'

// Import Class Codes dialog. Same flow as Bulk Enrollment: choose a file, preview it,
// upload, read the result. The preview only checks the layout and what this page already
// knows (existing class codes and subjects). The server stays the authority and its
// answer is final.
//
// Server rules (backend admin_bulk_upload_sections):
//   - columns section_no and subject_code must exist; schedule, room, capacity, semester
//     and academic_year are optional
//   - subject_code must match an existing, supported subject (case-insensitive)
//   - a section_no that already exists is skipped, not overwritten
//   - capacity that is not a whole number becomes 40; otherwise it is kept between 1 and 200
const REQUIRED_COLS = ['section_no', 'subject_code']
const OPTIONAL_COLS = ['schedule', 'room', 'capacity', 'semester', 'academic_year']
const MAX_ROWS = 2000
const MAX_BYTES = 5 * 1024 * 1024

function Icon({ children, className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}
const IconUpload = p => <Icon {...p}><polyline points="7 10 12 5 17 10" /><line x1="12" y1="5" x2="12" y2="16" /><path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" /></Icon>
const IconDownload = p => <Icon {...p}><polyline points="7 11 12 16 17 11" /><line x1="12" y1="4" x2="12" y2="16" /><path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" /></Icon>
const IconCheck = p => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>
const IconX = p => <Icon {...p}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></Icon>
const IconSkip = p => <Icon {...p}><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></Icon>
const IconWarn = p => <Icon {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>
const IconInfo = p => <Icon {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Icon>
const IconArrowLeft = p => <Icon {...p}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Icon>

function ColPill({ name, required }) {
  return (
    <span className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-xs
      ${required ? 'border-purple-600/40 bg-purple-600/20 text-purple-300' : 'border-slate-600 bg-slate-700 text-slate-400'}`}>
      {name}
      {required && <span className="text-[10px] text-red-400">*</span>}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    created: ['border-green-600/40 bg-green-600/20 text-green-300', IconCheck, 'Created'],
    skipped: ['border-yellow-600/40 bg-yellow-600/20 text-yellow-300', IconSkip, 'Skipped'],
    error: ['border-red-600/40 bg-red-600/20 text-red-300', IconX, 'Error'],
  }
  const [cls, Ico, label] = map[status] ?? map.error
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${cls}`}>
      <Ico className="h-3.5 w-3.5" /> {label}
    </span>
  )
}

function StatCard({ label, value, color, bg }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${bg}`}>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  )
}

// Row-by-row preview of what the server will most likely do with each row.
// status: 'ok' (will be created), 'skip' (already exists or repeated in the file), 'error'
function checkRows(rows, subjects, sections) {
  const knownSubjects = new Set(subjects.map(s => String(s.subject_code || '').toUpperCase()).filter(Boolean))
  const existingCodes = new Set(sections.map(s => String(s.section_no || '').toLowerCase()))
  const seen = new Set()
  return rows.map((row, i) => {
    const rowNo = i + 2 // header is row 1, like the spreadsheet and the server
    const sectionNo = (row.section_no || '').trim()
    const subject = (row.subject_code || '').trim().toUpperCase()
    const notes = []
    let status = 'ok'
    if (!sectionNo || !subject) {
      status = 'error'; notes.push('section_no and subject_code are required')
    } else if (knownSubjects.size && !knownSubjects.has(subject)) {
      status = 'error'; notes.push(`subject_code '${subject}' was not found`)
    } else if (existingCodes.has(sectionNo.toLowerCase())) {
      status = 'skip'; notes.push('this class code already exists')
    } else if (seen.has(sectionNo.toLowerCase())) {
      status = 'skip'; notes.push('repeated in this file, only the first row is used')
    }
    if (sectionNo) seen.add(sectionNo.toLowerCase())
    const cap = (row.capacity || '').trim()
    if (cap && status === 'ok') {
      if (!/^-?\d+$/.test(cap)) notes.push('capacity is not a whole number, 40 will be used')
      else if (Number(cap) < 1 || Number(cap) > 200) notes.push('capacity will be kept between 1 and 200')
    }
    return { rowNo, status, notes, sectionNo }
  })
}

export default function UploadSectionsModal({ subjects = [], sections = [], onClose, onDone }) {
  const fileRef = useRef(null)
  const uploadPending = useRef(false)
  const readGeneration = useRef(0)
  const uploaded = useRef(false)

  // steps: 'select' | 'preview' | 'uploading' | 'done'
  const [step, setStep] = useState('select')
  const [file, setFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [checks, setChecks] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const [fileError, setFileError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [showAllRows, setShowAllRows] = useState(false)

  const close = () => {
    if (uploadPending.current) return
    if (uploaded.current || uncertain) onDone(result?.summary || null)
    onClose()
  }

  const readAndParse = (f) => {
    if (!f) return
    setFileError('')
    if (!f.name.toLowerCase().endsWith('.csv')) { setFileError('Only .csv files are accepted.'); return }
    if (f.size > MAX_BYTES) { setFileError('File exceeds the 5 MB limit.'); return }
    const generation = ++readGeneration.current
    const reader = new FileReader()
    reader.onload = (e) => {
      if (generation !== readGeneration.current) return
      const { headers, rows } = parseCSV(e.target.result)
      const missing = REQUIRED_COLS.filter(h => !headers.includes(h))
      if (missing.length) { setFileError(`Missing columns: ${missing.join(', ')}`); return }
      if (!rows.length) { setFileError('Add at least one class code row.'); return }
      if (rows.length > MAX_ROWS) { setFileError('Maximum 2,000 rows per upload.'); return }
      setFile(f)
      setParsed({ headers, rows })
      setChecks(checkRows(rows, subjects, sections))
      setUploadError('')
      setStep('preview')
    }
    reader.onerror = () => {
      if (generation !== readGeneration.current) return
      setFileError('Could not read the file. Choose it again.')
    }
    reader.readAsText(f)
  }

  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    readAndParse(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (uploadPending.current || uncertain || !file) return
    uploadPending.current = true
    setUploadError('')
    setStep('uploading')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await authFetch(`${API_BASE}/api/admin/sections/bulk-upload`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => null)
      if (res.status >= 500 || (res.ok && !data?.summary)) {
        setUncertain(true)
        setStep('preview')
        return
      }
      if (!res.ok) {
        const missing = data?.missing?.length ? ` Missing columns: ${data.missing.join(', ')}.` : ''
        setUploadError(`${data?.error || `Upload failed (HTTP ${res.status})`}.${missing}`.replace('..', '.'))
        setStep('preview')
        return
      }
      uploaded.current = true
      setResult(data)
      setStep('done')
    } catch {
      setUncertain(true)
      setStep('preview')
    } finally {
      uploadPending.current = false
    }
  }

  const downloadTemplate = () => {
    const codes = subjects.map(s => s.subject_code).filter(Boolean)
    const a = codes[0] || 'IT115L'
    const b = codes[1] || a
    const csv = [
      'section_no,subject_code,schedule,room,capacity,semester,academic_year',
      `29144,${a},Mon 18:00-21:00,Room 1,40,1st Semester,2026-2027`,
      `29145,${b},Tue 08:00-11:00,Room 2,40,1st Semester,2026-2027`,
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: 'class_codes_template.csv' })
    link.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    readGeneration.current++
    setStep('select'); setFile(null); setParsed(null); setChecks([])
    setResult(null); setFileError(''); setUploadError(''); setShowAllRows(false)
  }

  const createCount = checks.filter(c => c.status === 'ok').length
  const skipCount = checks.filter(c => c.status === 'skip').length
  const errorCount = checks.filter(c => c.status === 'error').length
  const rowStatus = new Map(checks.map(c => [c.rowNo, c]))
  const visibleRows = parsed ? (showAllRows ? parsed.rows : parsed.rows.slice(0, 8)) : []
  const problems = checks.filter(c => c.status === 'error' || c.notes.length)

  const description = {
    select: 'Upload a CSV to create many class codes at once',
    preview: `${parsed?.rows.length ?? 0} rows · ${createCount} ready to create`,
    uploading: 'Creating class codes…',
    done: `Done · ${result?.summary?.created ?? 0} class code${result?.summary?.created === 1 ? '' : 's'} created`,
  }[step]

  return (
    <AdminActionDialog
      title="Import Class Codes"
      description={description}
      emblem={classCodeSeal}
      onClose={close}
      busy={step === 'uploading'}
    >
      {/* ── SELECT ─────────────────────────────────────────────── */}
      {step === 'select' && (
        <>
          <div className="admin-action-scroll flex-1 space-y-4 p-4 sm:p-6">
            {fileError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-600/15 p-3 text-sm text-red-200">
                <IconX className="mt-0.5 h-4 w-4 shrink-0" /> {fileError}
              </p>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`rounded-xl border border-dashed p-5 text-center transition-colors sm:p-8
                ${isDragging ? 'border-purple-400 bg-purple-600/10' : 'border-amber-300/45 bg-[#141a30]'}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { readAndParse(e.currentTarget.files[0]); e.currentTarget.value = '' }}
              />
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/10">
                <IconUpload className="h-7 w-7 text-purple-400" />
              </div>
              <p className="text-lg font-bold text-white">{isDragging ? 'Drop it!' : 'Drag & drop your class codes CSV here'}</p>
              <p className="mt-1 text-sm text-slate-300">CSV only · up to 5 MB and 2,000 rows</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="admin-button admin-button-primary mt-4 px-5 text-sm font-semibold">
                Choose CSV file
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-sm font-semibold text-slate-300">CSV columns:</p>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">Required</p>
                <div className="flex flex-wrap gap-2">{REQUIRED_COLS.map(c => <ColPill key={c} name={c} required />)}</div>
              </div>
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">Optional</p>
                <div className="flex flex-wrap gap-2">{OPTIONAL_COLS.map(c => <ColPill key={c} name={c} />)}</div>
              </div>
              <ul className="space-y-1 border-t border-slate-700 pt-3 text-xs leading-relaxed text-slate-400">
                <li>subject_code must match an existing subject, such as IT115L.</li>
                <li>A section_no that already exists is skipped, never overwritten.</li>
                <li>Capacity defaults to 40 and is kept between 1 and 200.</li>
              </ul>
            </div>

            <button type="button" onClick={downloadTemplate} className="admin-button flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold">
              <IconDownload className="h-4 w-4" /> Download Sample CSV Template
            </button>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-700 p-4 sm:p-6">
            <button type="button" onClick={close} className="admin-button min-w-24 flex-1 px-3 py-2.5 text-sm font-medium">Cancel</button>
          </div>
        </>
      )}

      {/* ── PREVIEW ────────────────────────────────────────────── */}
      {step === 'preview' && parsed && (
        <>
          <div className="admin-action-scroll flex-1 space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total Rows" value={parsed.rows.length} color="text-white" bg="border-slate-700 bg-slate-800/60" />
              <StatCard label="To create" value={createCount} color="text-green-400" bg="border-green-600/30 bg-green-900/20" />
              <StatCard label="Will skip" value={skipCount} color={skipCount ? 'text-yellow-400' : 'text-slate-500'} bg={skipCount ? 'border-yellow-600/30 bg-yellow-900/20' : 'border-slate-700 bg-slate-800/60'} />
              <StatCard label="Issues" value={errorCount} color={errorCount ? 'text-red-400' : 'text-slate-500'} bg={errorCount ? 'border-red-600/30 bg-red-900/20' : 'border-slate-700 bg-slate-800/60'} />
            </div>

            {problems.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-600/30 bg-amber-900/20 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                  <IconWarn className="h-4 w-4" /> Check these rows ({problems.length}):
                </p>
                {problems.slice(0, 6).map(p => (
                  <p key={p.rowNo} className="break-words font-mono text-xs text-amber-200">
                    Row {p.rowNo} · {p.sectionNo || '(empty)'} — {p.notes.join(', ')}
                  </p>
                ))}
                {problems.length > 6 && <p className="text-xs text-amber-400">…and {problems.length - 6} more</p>}
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-slate-400">
              <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              This preview checks the file against the class codes and subjects loaded on this page. The server checks again when you upload, and its result is final.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>{showAllRows ? `All ${parsed.rows.length} rows` : 'Preview — first 8 rows'}</span>
                {parsed.rows.length > 8 && (
                  <button type="button" onClick={() => setShowAllRows(v => !v)} className="font-semibold normal-case text-purple-300 transition hover:text-purple-200">
                    {showAllRows ? '▲ Show fewer' : `▼ Show all ${parsed.rows.length} rows`}
                  </button>
                )}
              </div>
              <div className={`overflow-x-auto ${showAllRows ? 'max-h-72 overflow-y-auto' : ''}`}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-800">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
                      {parsed.headers.map(h => <th key={h} scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">{h}</th>)}
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {visibleRows.map((row, i) => {
                      const c = rowStatus.get(i + 2)
                      const tone = c?.status === 'error' ? 'bg-red-900/10 text-red-300' : c?.status === 'skip' ? 'bg-yellow-900/10 text-yellow-200' : 'text-slate-300'
                      return (
                        <tr key={i} className={tone}>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{i + 1}</td>
                          {parsed.headers.map(h => (
                            <td key={h} className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                              {row[h] || <span className="italic text-slate-600">—</span>}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold">
                            {c?.status === 'error' ? 'Error' : c?.status === 'skip' ? 'Skip' : 'Create'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {!showAllRows && parsed.rows.length > 8 && (
                <button type="button" onClick={() => setShowAllRows(true)} className="w-full py-2 text-center text-xs text-purple-400 transition hover:text-purple-300">
                  …and {parsed.rows.length - 8} more rows — click to view all
                </button>
              )}
            </div>

            {uploadError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-600/15 p-3 text-sm text-red-200">
                <IconX className="mt-0.5 h-4 w-4 shrink-0" /> {uploadError}
              </p>
            )}
            {uncertain && (
              <p role="alert" className="rounded-lg border border-amber-300/40 bg-amber-950/35 p-3 text-sm text-amber-100">
                The server did not confirm the result. Close this window and check the class code list before uploading again.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-700 p-4 sm:p-6">
            <button type="button" onClick={uncertain ? close : reset} className="admin-button flex min-w-24 flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium">
              <IconArrowLeft className="h-4 w-4" /> {uncertain ? 'Close' : 'Back'}
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uncertain || createCount === 0}
              title={createCount === 0 ? 'No row in this file would create a new class code' : undefined}
              className="admin-button admin-button-primary flex min-w-36 flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconUpload className="h-4 w-4" /> Upload and create
            </button>
          </div>
        </>
      )}

      {/* ── UPLOADING ──────────────────────────────────────────── */}
      {step === 'uploading' && (
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12">
          <div className="h-16 w-16 rounded-full border-4 border-purple-600/30 border-t-purple-500 motion-safe:animate-spin" />
          <div className="text-center">
            <p className="text-lg font-bold text-white">Creating class codes…</p>
            <p className="mt-1 text-sm text-slate-400">Processing {parsed?.rows.length} rows</p>
          </div>
        </div>
      )}

      {/* ── DONE ───────────────────────────────────────────────── */}
      {step === 'done' && result && (
        <>
          <div className="admin-action-scroll flex-1 space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total" value={result.summary?.total_rows ?? 0} color="text-white" bg="border-slate-700 bg-slate-800/60" />
              <StatCard label="Created" value={result.summary?.created ?? 0} color="text-green-400" bg="border-green-600/30 bg-green-900/20" />
              <StatCard label="Skipped" value={result.summary?.skipped ?? 0} color="text-yellow-400" bg="border-yellow-600/30 bg-yellow-900/20" />
              <StatCard label="Errors" value={result.summary?.errors ?? 0} color="text-red-400" bg="border-red-600/30 bg-red-900/20" />
            </div>

            {result.results?.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-700">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-800">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">Row</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">Class code</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">Status</th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-slate-400">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.results.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.row}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-300">{r.section_no || parsed?.rows[r.row - 2]?.section_no || '—'}</td>
                        <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                        <td className="min-w-40 px-3 py-2 text-xs text-slate-400">{r.subject || r.reason || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-700 p-4 sm:p-6">
            <button type="button" onClick={reset} className="admin-button min-w-32 flex-1 px-3 py-2.5 text-sm font-medium">Upload Another</button>
            <button type="button" onClick={close} className="admin-button admin-button-primary min-w-24 flex-1 px-3 py-2.5 text-sm font-semibold">Done</button>
          </div>
        </>
      )}
    </AdminActionDialog>
  )
}
