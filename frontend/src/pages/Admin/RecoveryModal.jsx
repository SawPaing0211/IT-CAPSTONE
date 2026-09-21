import { useState } from 'react'
import { API_BASE } from '../../api/client'

// minimalist line-art eye icons for the password show/hide toggle
function EyeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function RecoveryModal({ user, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Reset the user's password on the backend
  const handleReset = async () => {
    setError('')
    setSuccess('')

    // Require at least 6 characters before hitting the backend
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(`✅ Password reset successfully for ${user.username}.`)
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setError(data.error || 'Failed to reset password.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Rate the new password's strength by length for the meter below the field
  const passwordStrength = () => {
    const len = newPassword.length
    if (len === 0) return null
    if (len < 4) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
    if (len < 7) return { label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' }
    if (len < 10) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' }
  }

  const strength = passwordStrength()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-600/50 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/50">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-xl">
              🔐
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Reset Password</h2>
              <p className="text-slate-400 text-xs">
                Account: <span className="text-purple-300 font-semibold">{user.full_name || user.username}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl transition leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Adamson email notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <span className="text-blue-400 mt-0.5">ℹ️</span>
            <div>
              <p className="text-blue-300 text-xs font-semibold">Adamson Email Address</p>
              <p className="text-slate-400 text-xs mt-0.5">{user.email}</p>
              <p className="text-slate-500 text-xs mt-1">Institutional emails are permanent and cannot be changed.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm">
              <span>❌</span> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-600/20 border border-green-600/40 rounded-lg text-green-300 text-sm">
              <span>✅</span> {success}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5 font-medium">
              New Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 pr-11 text-white outline-none transition placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">{strength.label}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-purple-600/30">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleReset}
            disabled={loading || !newPassword}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-black transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
            ) : (
              <><span>🔐</span> Reset Password</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}