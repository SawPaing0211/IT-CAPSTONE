import { useId, useLayoutEffect, useRef, useState } from 'react'
import { API_BASE } from '../api/client'
import passwordEmblem from '../assets/account-password.png'
import PasswordField from './PasswordField'
import './AccountPanels.css'

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
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const rulesId = useId()
  const currentId = useId()
  const nextId = useId()
  const confirmId = useId()
  const currentLabel = forced ? 'Temporary password' : 'Current password'

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (loading || done) return
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

  return (
    <dialog ref={dialogRef} className="forge-password-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={e => { e.preventDefault(); if (!forced && !loading) onClose?.() }}>
      <form onSubmit={submit}>
        <header className="forge-password-header">
          <img src={passwordEmblem} alt="" />
          <div>
            <h2 id={titleId} className="font-cinzel">{forced ? 'Choose a new password' : 'Change password'}</h2>
            <p id={descriptionId}>
              {forced
                ? 'You are using a temporary password. Set your own to continue.'
                : 'Changing it signs you out of your other devices.'}
            </p>
          </div>
        </header>
        <div className="forge-password-fields">
          {error && <div role="alert" className="rounded-lg border border-red-600/40 bg-red-600/20 p-3 text-sm text-red-200">{error}</div>}
          {done && <div role="status" className="rounded-lg border border-green-600/40 bg-green-600/20 p-3 text-sm text-green-200">Password changed.</div>}
          <div>
            <label htmlFor={currentId}>{currentLabel}</label>
            <PasswordField id={currentId} visibilityLabel={currentLabel.toLowerCase()} autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div>
            <label htmlFor={nextId}>New password</label>
            <PasswordField id={nextId} visibilityLabel="new password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} aria-describedby={rulesId} />
            <span id={rulesId} className="forge-password-hint">8+ characters with a letter and a number.</span>
          </div>
          <div>
            <label htmlFor={confirmId}>Confirm new password</label>
            <PasswordField id={confirmId} visibilityLabel="password confirmation" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
        </div>
        <footer className="forge-password-actions">
          <button type="button" disabled={loading} onClick={forced ? onLogout : onClose}>{forced ? 'Sign out' : 'Cancel'}</button>
          <button type="submit" disabled={loading || done || !current || !next || !confirm}>
            {loading ? 'Saving…' : 'Change password'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
