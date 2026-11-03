import { useState } from 'react'
import { API_BASE } from '../api/client'

// Same rule the server enforces (it is the one that decides).
const ruleError = (pw) => {
  if (pw.length < 8) return 'At least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.'
  return ''
}

// forced=true: a temporary/reset password is in use, so this cannot be dismissed.
export default function ChangePasswordModal({ forced = false, onClose, onChanged, onLogout }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const rule = ruleError(next)
    if (rule) return setError(rule)
    if (next !== confirm) return setError('The two new passwords do not match.')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || data.message || 'Could not change the password.')
        return
      }
      // other sessions were ended by the server; keep this one
      localStorage.setItem('token', data.access_token)
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      setDone(true)
      onChanged && onChanged()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const input = 'w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none'

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="bg-slate-900 border border-purple-600/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
        <div>
          <h2 className="text-xl font-black text-white">{forced ? 'Choose a new password' : 'Change password'}</h2>
          <p className="text-slate-400 text-sm mt-1">
            {forced
              ? 'You are using a temporary password. Set your own to continue.'
              : 'Changing it signs you out of your other devices.'}
          </p>
        </div>
        {error && <div role="alert" className="p-3 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm">{error}</div>}
        {done && <div className="p-3 bg-green-600/20 border border-green-600/40 rounded-lg text-green-300 text-sm">Password changed.</div>}
        <label className="block text-sm text-slate-400">{forced ? 'Temporary password' : 'Current password'}
          <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="block text-sm text-slate-400">New password
          <input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} className={`${input} mt-1`} />
          <span className="text-xs text-slate-500">8+ characters with a letter and a number.</span>
        </label>
        <label className="block text-sm text-slate-400">Confirm new password
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={`${input} mt-1`} />
        </label>
        <div className="flex gap-3 pt-2">
          {forced ? (
            <button type="button" onClick={onLogout} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">Sign out</button>
          ) : (
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300">Cancel</button>
          )}
          <button type="submit" disabled={loading || !current || !next || !confirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 disabled:opacity-50 rounded-lg text-white font-black">
            {loading ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
