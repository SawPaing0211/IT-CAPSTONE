import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function CreateBlockModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1=form, 2=success
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [instructors, setInstructors] = useState([])
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [createdBlock, setCreatedBlock] = useState(null)

  const [form, setForm] = useState({
    section_code: '',
    semester: '',
    academic_year: '',
    instructor_id: '',
    max_capacity: '',
    selected_subjects: [], // array of subject names
  })

  useEffect(() => {
    fetchSubjects()
    fetchInstructors()
  }, [])

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/subjects`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setSubjects(Array.isArray(data) ? data : []) }
    } catch (err) { console.error(err) }
  }

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/users?role=instructor`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setInstructors(Array.isArray(data) ? data : []) }
    } catch (err) { console.error(err) }
  }

  const SECTION_SUBJECT_MAP = {
    '1': ['Introduction to Computing Lec', 'Introduction to Computing Lab', 'Fundamentals of Programming Lec', 'Fundamentals of Programming Lab'],
    '2': ['Computer Programming 1 Lec', 'Computer Programming 1 Lab', 'Data Structure & Algorithm Lec', 'Data Structure & Algorithm Lab'],
    '3': ['Database Management System Lec', 'Database Management System Lab', 'Computer Programming 2 Lec', 'Computer Programming 2 Lab'],
    '4': ['Object Oriented Programming Lec', 'Object Oriented Programming Lab', 'Adv. Database Mgt System Lec', 'Adv. Database Mgt System Lab'],
  }

  const handleSectionCodeChange = (code) => {
    setForm(prev => ({ ...prev, section_code: code }))
    const yearDigit = code.replace(/\D/g, '')[0]  // e.g. "IT101" → "1"
    const suggested = SECTION_SUBJECT_MAP[yearDigit] || []
    const available = subjects.map(s => s.name)
    const matched = suggested.filter(name => available.includes(name))
    if (matched.length > 0) {
      setForm(prev => ({ ...prev, section_code: code, selected_subjects: matched }))
    }
  }

  const toggleSubject = (name) => {
    setForm(prev => ({
      ...prev,
      selected_subjects: prev.selected_subjects.includes(name)
        ? prev.selected_subjects.filter(s => s !== name)
        : [...prev.selected_subjects, name]
    }))
  }

  const validate = () => {
    const errs = {}
    if (!form.section_code.trim()) errs.section_code = 'Section code is required'
    if (!form.semester) errs.semester = 'Semester is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const semesterLabel = form.academic_year ? `${form.semester} ${form.academic_year}` : form.semester
      const payload = {
        section_code: form.section_code.trim().toUpperCase(),
        semester: semesterLabel,
        subjects: form.selected_subjects,
        instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
      }
      const res = await fetch(`${API}/api/admin/blocks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        setCreatedBlock({ ...payload, id: data.block_id })
        setStep(2)
      } else {
        showToast(data.error || 'Failed to create block', 'error')
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const semesterOptions = ['1st Semester', '2nd Semester', 'Summer']
  const currentYear = new Date().getFullYear()
  const yearOptions = [`${currentYear-1}-${currentYear}`, `${currentYear}-${currentYear+1}`, `${currentYear+1}-${currentYear+2}`]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">📚</div>
            <div>
              <h2 className="text-xl font-black text-white">Create New Class Code</h2>
              <p className="text-purple-300/70 text-xs">{step === 1 ? 'Set up a new class code' : 'Block created successfully'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
        </div>

        {step === 1 ? (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Section Code */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Class Code *</label>
              <input type="text" value={form.section_code} onChange={e => handleSectionCodeChange(e.target.value)}
                placeholder="e.g., IT101, IT102, IT201"
                className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest ${errors.section_code ? 'border-red-500' : 'border-slate-700'}`} />
              {errors.section_code && <p className="text-red-400 text-xs mt-1">{errors.section_code}</p>}
            </div>

            {/* Semester + Academic Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Semester *</label>
                <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition ${errors.semester ? 'border-red-500' : 'border-slate-700'}`}>
                  <option value="">Select</option>
                  {semesterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.semester && <p className="text-red-400 text-xs mt-1">{errors.semester}</p>}
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Academic Year</label>
                <select value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition">
                  <option value="">Select</option>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Instructor */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Assign Instructor</label>
              <select value={form.instructor_id} onChange={e => setForm({ ...form, instructor_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition">
                <option value="">— None / Assign Later —</option>
                {instructors.map(i => <option key={i.id} value={i.id}>{i.username} ({i.email})</option>)}
              </select>
            </div>

            {/* Max Capacity */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Maximum Capacity</label>
              <input type="number" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: e.target.value })}
                placeholder="e.g., 40"  min="1" max="200"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition" />
            </div>

            {/* Subjects */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Assign Subjects</label>
                <span className="text-xs text-slate-500">{form.selected_subjects.length} selected</span>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 max-h-44 overflow-y-auto space-y-1">
                {subjects.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-3">No subjects found. Create subjects first in Subjects Management.</p>
                ) : subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-700 cursor-pointer transition">
                    <input type="checkbox" checked={form.selected_subjects.includes(s.name)} onChange={() => toggleSubject(s.name)}
                      className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500" />
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {s.internal_subject_no && (
                        <span className="shrink-0 px-1.5 py-0.5 bg-slate-600 text-slate-200 rounded text-[10px] font-mono font-semibold">
                          {s.internal_subject_no}
                        </span>
                      )}
                      {s.subject_code && (
                        <span className="shrink-0 px-1.5 py-0.5 bg-purple-700/60 text-purple-200 rounded text-[10px] font-mono font-semibold border border-purple-600/40">
                          {s.subject_code}
                        </span>
                      )}
                      <span className="text-sm text-white truncate">{s.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Selected subjects preview */}
            {form.selected_subjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.selected_subjects.map(name => {
                  const subject = subjects.find(s => s.name === name)
                  return (
                    <span key={name} className="flex items-center gap-1 px-2 py-1 bg-purple-600/20 border border-purple-600/40 rounded-lg text-purple-300 text-xs">
                      {subject?.subject_code && (
                        <span className="font-mono text-purple-400">{subject.subject_code}</span>
                      )}
                      <span>{name}</span>
                      <button onClick={() => toggleSubject(name)} className="text-purple-400 hover:text-white ml-1">×</button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition">Cancel</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
                {loading ? <><span className="animate-spin">⟳</span> Creating…</> : '✅ Create Block'}
              </button>
            </div>
          </div>
        ) : (
          /* Success */
          <div className="p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-purple-600/20 border-2 border-purple-500/50 rounded-full flex items-center justify-center text-4xl mx-auto">📚</div>
            <h3 className="text-2xl font-black text-white">Class Code Created!</h3>
            <div className="bg-slate-800/80 rounded-xl p-4 text-left space-y-2 border border-slate-700">
              <InfoRow label="Class Code" value={<span className="font-mono font-bold text-purple-300">{createdBlock?.section_code}</span>} />
              <InfoRow label="Semester" value={createdBlock?.semester} />
              <InfoRow label="Subjects" value={createdBlock?.subjects?.length > 0 ? createdBlock.subjects.join(', ') : '—'} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStep(1); setForm({ section_code:'',semester:'',academic_year:'',instructor_id:'',max_capacity:'',selected_subjects:[] }); setCreatedBlock(null) }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition">+ Create Another</button>
              <button onClick={onSuccess} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold transition">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  )
}
