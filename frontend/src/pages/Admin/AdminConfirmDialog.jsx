import { useId, useLayoutEffect, useRef, useState } from 'react'
import AdminIcon from './AdminIcons'

// One confirmation dialog for every destructive admin action (delete a user, delete all
// students, delete a class code, delete empty class codes). Built on the native <dialog>
// so it always sits above the page header and the scroll locks behind it.
//
// requiredPhrase is optional: when it is given, the confirm button stays disabled until
// the administrator types it exactly.
export default function AdminConfirmDialog({
  title,
  message,
  requiredPhrase,
  confirmLabel = 'Confirm Delete',
  busyLabel = 'Deleting…',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const messageId = useId()
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const ready = !requiredPhrase || typed === requiredPhrase

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  const submit = event => {
    event.preventDefault()
    if (ready && !busy) onConfirm()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={event => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="admin-confirm-dialog"
    >
      <form onSubmit={submit} className="admin-confirm-panel">
        <header className="admin-confirm-header">
          <div className="admin-confirm-icon" aria-hidden="true"><AdminIcon name="alert" className="size-6" /></div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-black text-white">{title}</h2>
            <p className="text-xs text-slate-400">This action cannot be undone</p>
          </div>
        </header>

        <div className="admin-action-scroll space-y-4 p-4 sm:p-6">
          <p id={messageId} className="text-sm leading-relaxed text-slate-300">{message}</p>
          {requiredPhrase && (
            <div>
              <label htmlFor={inputId} className="mb-1.5 block text-sm text-slate-400">
                Type <span className="font-mono font-bold text-red-400">{requiredPhrase}</span> to confirm
              </label>
              <input
                id={inputId}
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                autoFocus
                autoComplete="off"
                disabled={busy}
                placeholder={requiredPhrase}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-white outline-none transition placeholder-slate-600 focus:border-red-500"
              />
            </div>
          )}
        </div>

        <footer className="admin-confirm-footer">
          <button type="button" onClick={onCancel} disabled={busy} className="admin-button min-w-24 flex-1 px-3 py-2.5 text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready || busy}
            className="admin-button admin-button-danger flex min-w-36 flex-1 items-center justify-center gap-2 px-3 py-2.5 text-sm font-black"
          >
            {busy
              ? <><span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> {busyLabel}</>
              : <><AdminIcon name="trash" className="size-4" /> {confirmLabel}</>}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
