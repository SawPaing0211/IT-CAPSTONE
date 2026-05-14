import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function CreateUserModal({ sections = [], onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [createdUser, setCreatedUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    section_id: '',
    auto_generate_password: false,
  })

  const resetForm = () => {
    setForm({ username: '', email: '', password: '', role: 'student', section_id: '', auto_generate_password: false })
    setPasswordStrength(0)
    setCreatedUser(null)
    setStep(1)
    setErrors({})
    setToast(null)
  }

  const calcPasswordStrength = pw => {
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const handlePasswordChange = val => {
    setForm({ ...form, password: val })
    setPasswordStrength(calcPasswordStrength(val))
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm({ ...form, password: pw, auto_generate_password: true })
    setPasswordStrength(calcPasswordStrength(pw))
    setShowPassword(true)
  }

  const validate = () => {
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    else if (form.username.length < 3) errs.username = 'Min 3 characters'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Min 8 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        section_ids: form.section_id ? [parseInt(form.section_id)] : [],
      }
      const res = await fetch(`${API}/api/admin/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-xl">👤</div>
            <div>
              <h2 className="text-xl font-black text-white">Create New User</h2>
              <p className="text-purple-300/70 text-xs">
                {step === 1 ? 'Fill in the account details below' : 'Account created successfully'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); resetForm() }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg"
          >×</button>
        </div>

        {step === 1 ? (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Role selector */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Account Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'student', label: 'Student', icon: '🎓' },
                  { val: 'instructor', label: 'Instructor', icon: '👨‍🏫' },
                  { val: 'administrator', label: 'Admin', icon: '🛡️' },
                ].map(r => (
                  <button
                    key={r.val}
                    onClick={() => setForm({ ...form, role: r.val })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition text-sm font-semibold ${
                      form.role === r.val
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl">{r.icon}</span>{r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="e.g., john_doe or 2024-00001"
                autoComplete="off"
                className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition ${errors.username ? 'border-red-500' : 'border-slate-700'}`}
              />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="user@adamson.edu.ph"
                className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition ${errors.email ? 'border-red-500' : 'border-slate-700'}`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Password *</label>
                <button onClick={generatePassword} className="text-xs text-purple-400 hover:text-purple-300 transition">⚡ Auto-generate</button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 pr-10 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono ${errors.password ? 'border-red-500' : 'border-slate-700'}`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor[passwordStrength] : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength >= 4 ? 'text-green-400' : passwordStrength >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {strengthLabel[passwordStrength]}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Class Code assignment (students only) */}
            {form.role === 'student' && (
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Assign to Class Code <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <select
                  value={form.section_id}
                  onChange={e => setForm({ ...form, section_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition"
                >
                  <option value="">— None / Assign Later —</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.section_no}
                      {s.subject_name ? ` — ${s.subject_name}` : ''}
                      {s.semester ? ` (${s.semester})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-1">
                  Class code is the student's section number (e.g. 29144). You can assign more from Manage User.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { onClose(); resetForm() }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
              >
                {loading ? <><span className="animate-spin">⟳</span> Creating…</> : '✅ Create Account'}
              </button>
            </div>
          </div>
        ) : (
          /* Success screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-green-600/20 border-2 border-green-500/50 rounded-full flex items-center justify-center text-4xl mx-auto">✅</div>
            <h3 className="text-2xl font-black text-white">Account Created!</h3>
            <div className="bg-slate-800/80 rounded-xl p-4 text-left space-y-2 border border-slate-700">
              <Row label="Username" value={createdUser?.username} />
              <Row label="Email" value={createdUser?.email} />
              <Row label="Role" value={
                <span className="capitalize px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">
                  {createdUser?.role === 'administrator' ? 'Administrator' : createdUser?.role}
                </span>
              } />
              <Row label="Password" value={<span className="font-mono text-green-300 text-sm">{createdUser?.password}</span>} />
            </div>
            <p className="text-slate-500 text-xs">Save these credentials — the password won't be shown again.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                + Create Another
              </button>
              <button
                onClick={() => { onSuccess(); resetForm() }}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition"
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  )
}
