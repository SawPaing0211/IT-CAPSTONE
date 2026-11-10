import { useId, useState } from 'react'
import { API_BASE, authFetch } from '../../api/client'
import AdminActionDialog from './AdminActionDialog'
import passwordEmblem from '../../assets/account-password.png'

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
  const [issued, setIssued] = useState('')   // generated temporary password, shown once, never stored
  const passwordId = useId()
  const formId = useId()
  const closeDialog = success ? onSuccess : onClose

  // Reset the user's password on the backend. With generate=true the server
  // creates the temporary password and returns it once.
  const handleReset = async (generate = false) => {
    if (loading || success) return
    setError('')

    // Same rule the server enforces: 8+ characters with a letter and a number
    if (!generate && (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword))) {
      setError('Password must be at least 8 characters and include a letter and a number.')
      return
    }

    setLoading(true)
    try {
      const res = await authFetch(`${API_BASE}/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generate ? { generate: true } : { new_password: newPassword })
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.message && (!generate || data.temporary_password)) {
        setSuccess(`Password reset for ${user.username}. They must choose a new password the next time they sign in.`)
        if (generate) setIssued(data.temporary_password)
        setNewPassword('')
      } else {
        setError(data?.error || 'The server did not confirm the password reset. Check the account before trying again.')
      }
    } catch {
      setError('Could not confirm the password reset. Check your connection and the account before trying again.')
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
    <AdminActionDialog
      title="Reset Password"
      description={user.full_name || user.username}
      emblem={passwordEmblem}
      onClose={closeDialog}
      busy={loading}
    >
        <form
          id={formId}
          onSubmit={event => { event.preventDefault(); void handleReset() }}
          className="admin-action-scroll admin-account-dialog-body flex-1 space-y-4 px-4 py-5 sm:px-6"
        >

          {/* Institutional email notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
            <span className="text-blue-400 mt-0.5">ℹ️</span>
            <div>
              <p className="text-blue-300 text-xs font-semibold">Sign-in email (identifier)</p>
              <p className="break-all text-slate-300 text-xs mt-0.5">{user.email}</p>
              <p className="text-slate-300 text-xs mt-1">
                This may be a generated identifier, not a working inbox. Nothing is emailed:
                give the temporary password to the user in person.
              </p>
            </div>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="p-3 bg-green-600/20 border border-green-600/40 rounded-lg text-green-300 text-sm">
              {success}
            </div>
          )}

          {!success && (
            <fieldset disabled={loading} className="min-w-0 space-y-4">
              <div>
                <label htmlFor={passwordId} className="block text-sm text-slate-300 mb-1.5 font-medium">
                  Temporary password
                </label>
                <div className="relative">
                  <input
                    id={passwordId}
                    autoComplete="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    aria-describedby={`${passwordId}-rules`}
                    className="min-h-11 w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 pr-12 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-slate-300 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <p id={`${passwordId}-rules`} className="mt-2 text-xs text-slate-300">At least 8 characters with a letter and a number.</p>
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
              <button
                type="button"
                onClick={() => handleReset(true)}
                className="admin-button w-full px-3 py-2 text-sm font-medium"
              >
                Generate a temporary password instead
              </button>
            </fieldset>
          )}

          {issued && (
            <div className="p-3 bg-yellow-600/10 border border-yellow-600/40 rounded-lg">
              <p className="text-yellow-300 text-xs font-semibold mb-1">Temporary password (shown once)</p>
              <p className="break-all font-mono text-white text-lg select-all">{issued}</p>
              <p className="text-slate-400 text-xs mt-1">Give it to the user in person. It is not stored or emailed, and they must replace it at sign-in.</p>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-700 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={closeDialog}
            disabled={loading}
            className="admin-button min-w-24 flex-1 px-3 py-2.5 text-sm font-medium"
          >
            {success ? 'Done' : 'Cancel'}
          </button>
          {!success && <button
            type="submit"
            form={formId}
            disabled={loading || !newPassword}
            className="admin-button admin-button-primary min-w-36 flex-1 px-3 py-2.5 text-sm font-semibold"
          >
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>}
        </div>
    </AdminActionDialog>
  )
}
