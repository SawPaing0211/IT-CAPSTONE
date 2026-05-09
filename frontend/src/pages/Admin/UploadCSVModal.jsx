import { useState, useRef, useCallback } from 'react'

const API = 'http://localhost:5000'

// ─── tiny CSV parser (no external deps) ──────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // handle quoted fields
    const cells = []
    let cur = '', inQ = false
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
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

// ─── client-side row validation ──────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
function validateRow(row, idx) {
  const errs = []
  if (!row.username?.trim())           errs.push('username required')
  if (!row.email?.trim())              errs.push('email required')
  else if (!EMAIL_RE.test(row.email))  errs.push('invalid email')
  return errs.length ? { row: idx + 2, username: row.username, errors: errs } : null
}

// ─── status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    created:  'bg-green-600/20  text-green-300  border-green-600/40',
    skipped:  'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
    error:    'bg-red-600/20    text-red-300    border-red-600/40',
  }
  const label = { created: '✅ Created', skipped: '⏭ Skipped', error: '❌ Error' }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${map[status] ?? map.error}`}>
      {label[status] ?? status}
    </span>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────
export default function UploadCSVModal({ blocks = [], onClose, onSuccess }) {
  const fileRef = useRef(null)

  // steps: 'select' | 'preview' | 'uploading' | 'done'
  const [step,       setStep]       = useState('select')
  const [file,       setFile]       = useState(null)
  const [parsed,     setParsed]     = useState(null)   // { headers, rows }
  const [clientErrs, setClientErrs] = useState([])     // pre-upload validation
  const [blockId,    setBlockId]    = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [result,     setResult]     = useState(null)   // server response
  const [toast,      setToast]      = useState(null)

  // ── helpers ──────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const readAndParse = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      showToast('Only .csv files are accepted', 'error'); return
    }
    if (f.size > 5 * 1024 * 1024) {
      showToast('File exceeds 5 MB limit', 'error'); return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result)
      const required = ['username', 'email']
      const missing  = required.filter(h => !headers.includes(h))
      if (missing.length) {
        showToast(`Missing columns: ${missing.join(', ')}`, 'error')
        setFile(null); return
      }
      const errs = rows.map((r, i) => validateRow(r, i)).filter(Boolean)
      setParsed({ headers, rows })
      setClientErrs(errs)
      setStep('preview')
    }
    reader.readAsText(f)
  }

  // ── drag & drop ───────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false)
    readAndParse(e.dataTransfer.files[0])
  }, [])

  // ── upload ────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    setStep('uploading')
    try {
      const token = localStorage.getItem('token')
      const fd    = new FormData()
      fd.append('file',      file)
      fd.append('role_type', 'student')
      if (blockId) fd.append('block_id', blockId)

      const res  = await fetch(`${API}/api/admin/users/bulk-upload-csv`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    fd,
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Upload failed', 'error')
        setStep('preview'); return
      }
      setResult(data)
      setStep('done')
    } catch {
      showToast('Network error — please try again', 'error')
      setStep('preview')
    }
  }

  // ── download sample CSV ───────────────────────────────────────────────
  const downloadSample = () => {
    const csv = [
      'username,email,student_id_number,block_code',
      '2024-00001,2024-00001@adamson.edu.ph,2024-00001,101',
      '2024-00002,2024-00002@adamson.edu.ph,2024-00002,101',
      '2024-00003,2024-00003@adamson.edu.ph,2024-00003,102',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'bulk_students_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setStep('select'); setFile(null); setParsed(null)
    setClientErrs([]); setBlockId(''); setResult(null)
  }

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-2xl shadow-2xl shadow-purple-900/40 overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-xl">
              📤
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Bulk Upload Students</h2>
              <p className="text-purple-300/70 text-xs">
                {step === 'select'    && 'Upload a CSV to create multiple accounts at once'}
                {step === 'preview'   && `${parsed?.rows.length ?? 0} rows detected — review before uploading`}
                {step === 'uploading' && 'Creating accounts…'}
                {step === 'done'      && `Done — ${result?.summary?.created ?? 0} accounts created`}
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); reset() }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg"
          >×</button>
        </div>

        {/* ── Step: SELECT ─────────────────────────────────────────────── */}
        {step === 'select' && (
          <div className="p-6 space-y-5 overflow-y-auto">

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
                ${isDragging
                  ? 'border-purple-400 bg-purple-600/10 scale-[1.01]'
                  : 'border-slate-600 hover:border-purple-500 hover:bg-purple-600/5'}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => readAndParse(e.target.files[0])}
              />
              <div className="text-5xl mb-3">📂</div>
              <p className="text-white font-bold text-lg">
                {isDragging ? 'Drop it!' : 'Drag & drop your CSV here'}
              </p>
              <p className="text-slate-400 text-sm mt-1">or click to browse — max 5 MB</p>
            </div>

            {/* Required columns info */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 space-y-2">
              <p className="text-slate-300 text-sm font-semibold">Required CSV columns:</p>
              <div className="flex flex-wrap gap-2">
                {['username', 'email'].map(c => (
                  <span key={c} className="px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-xs font-mono border border-purple-600/40">
                    {c} <span className="text-red-400">*</span>
                  </span>
                ))}
                {['student_id_number', 'block_code'].map(c => (
                  <span key={c} className="px-2.5 py-1 bg-slate-700 text-slate-400 rounded-lg text-xs font-mono border border-slate-600">
                    {c} (optional)
                  </span>
                ))}
              </div>
              <p className="text-slate-500 text-xs">
                Passwords are auto-generated and returned in the results.
              </p>
            </div>

            {/* Sample download */}
            <button
              onClick={downloadSample}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-semibold border border-slate-700 hover:border-slate-600 transition flex items-center justify-center gap-2"
            >
              <span>⬇️</span> Download Sample CSV Template
            </button>
          </div>
        )}

        {/* ── Step: PREVIEW ─────────────────────────────────────────────── */}
        {step === 'preview' && parsed && (
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-center">
                  <p className="text-2xl font-black text-white">{parsed.rows.length}</p>
                  <p className="text-slate-400 text-xs">Total Rows</p>
                </div>
                <div className="bg-green-900/20 rounded-xl p-3 border border-green-600/30 text-center">
                  <p className="text-2xl font-black text-green-400">{parsed.rows.length - clientErrs.length}</p>
                  <p className="text-slate-400 text-xs">Valid</p>
                </div>
                <div className={`rounded-xl p-3 border text-center ${clientErrs.length ? 'bg-red-900/20 border-red-600/30' : 'bg-slate-800/60 border-slate-700'}`}>
                  <p className={`text-2xl font-black ${clientErrs.length ? 'text-red-400' : 'text-slate-500'}`}>{clientErrs.length}</p>
                  <p className="text-slate-400 text-xs">Issues</p>
                </div>
              </div>

              {/* Client-side errors */}
              {clientErrs.length > 0 && (
                <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 space-y-1.5">
                  <p className="text-red-300 text-sm font-bold">⚠️ Validation issues (rows will be skipped):</p>
                  {clientErrs.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-red-400 text-xs font-mono">
                      Row {e.row} · {e.username || '(empty)'} — {e.errors.join(', ')}
                    </p>
                  ))}
                  {clientErrs.length > 5 && (
                    <p className="text-red-500 text-xs">…and {clientErrs.length - 5} more</p>
                  )}
                </div>
              )}

              {/* Block assignment (optional override) */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Assign ALL students to block <span className="text-slate-500 normal-case">(overrides CSV block_code)</span>
                </label>
                <select
                  value={blockId}
                  onChange={e => setBlockId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition"
                >
                  <option value="">— Use block_code from CSV —</option>
                  {blocks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.section_code}{b.semester ? ` · ${b.semester}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview table */}
              <div className="rounded-xl overflow-hidden border border-slate-700">
                <div className="bg-slate-800/80 px-4 py-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Preview (first 8 rows)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/60">
                      <tr>
                        <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">#</th>
                        {parsed.headers.map(h => (
                          <th key={h} className="text-left px-4 py-2 text-slate-400 font-medium text-xs capitalize">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {parsed.rows.slice(0, 8).map((row, i) => {
                        const hasErr = clientErrs.some(e => e.row === i + 2)
                        return (
                          <tr key={i} className={`${hasErr ? 'bg-red-900/10' : 'hover:bg-slate-800/40'} transition`}>
                            <td className="px-4 py-2 text-slate-500 font-mono text-xs">{i + 1}</td>
                            {parsed.headers.map(h => (
                              <td key={h} className={`px-4 py-2 font-mono text-xs ${hasErr ? 'text-red-300' : 'text-slate-300'}`}>
                                {row[h] || <span className="text-slate-600 italic">—</span>}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {parsed.rows.length > 8 && (
                    <p className="text-center text-slate-500 text-xs py-2">
                      …and {parsed.rows.length - 8} more rows
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex gap-3 p-6 border-t border-purple-600/30 flex-shrink-0">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={handleUpload}
                disabled={parsed.rows.length === 0 || parsed.rows.length === clientErrs.length}
                className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-black transition shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
              >
                📤 Upload {parsed.rows.length - clientErrs.length} Students
              </button>
            </div>
          </div>
        )}

        {/* ── Step: UPLOADING ───────────────────────────────────────────── */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-purple-600/30 border-t-purple-500 animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-2xl">📤</span>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Creating accounts…</p>
              <p className="text-slate-400 text-sm mt-1">Processing {parsed?.rows.length} rows</p>
            </div>
            <div className="w-full max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse w-2/3 rounded-full" />
            </div>
          </div>
        )}

        {/* ── Step: DONE ────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="p-6 space-y-4 overflow-y-auto">

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total',   value: result.summary?.total_rows ?? 0, color: 'text-white',        bg: 'bg-slate-800/60   border-slate-700' },
                { label: 'Created', value: result.summary?.created    ?? 0, color: 'text-green-400',   bg: 'bg-green-900/20  border-green-600/30' },
                { label: 'Skipped', value: result.summary?.skipped    ?? 0, color: 'text-yellow-400',  bg: 'bg-yellow-900/20 border-yellow-600/30' },
                { label: 'Errors',  value: result.summary?.errors     ?? 0, color: 'text-red-400',     bg: 'bg-red-900/20    border-red-600/30' },
              ].map(c => (
                <div key={c.label} className={`rounded-xl p-3 border text-center ${c.bg}`}>
                  <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-slate-400 text-xs">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Per-row results */}
            {result.results?.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-700 max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/80 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Row</th>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Email</th>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Status</th>
                      <th className="text-left px-4 py-2 text-slate-400 font-medium text-xs">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{r.row}</td>
                        <td className="px-4 py-2 text-slate-300 font-mono text-xs truncate max-w-[180px]">{r.email || '—'}</td>
                        <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-2 text-slate-400 text-xs">{r.reason || r.errors?.join(', ') || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Credential CSV download */}
            {result.credential_csv && (
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4 flex items-center gap-4">
                <span className="text-3xl flex-shrink-0">🔐</span>
                <div className="flex-1">
                  <p className="text-blue-300 font-bold text-sm">Auto-generated credentials ready</p>
                  <p className="text-slate-400 text-xs mt-0.5">Download the CSV with usernames and temporary passwords.</p>
                </div>
                <button
                  onClick={() => {
                    const bytes = atob(result.credential_csv)
                    const blob  = new Blob([bytes], { type: 'text/csv' })
                    const url   = URL.createObjectURL(blob)
                    const a     = document.createElement('a')
                    a.href = url
                    a.download = `credentials_${new Date().toISOString().slice(0,10)}.csv`
                    a.click(); URL.revokeObjectURL(url)
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold transition flex-shrink-0"
                >
                  ⬇️ Download
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={reset}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                Upload Another
              </button>
              <button
                onClick={() => { onSuccess?.(); reset() }}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-black transition shadow-lg shadow-purple-600/30"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
