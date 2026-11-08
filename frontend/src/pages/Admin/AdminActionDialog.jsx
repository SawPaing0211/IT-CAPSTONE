import { useId, useLayoutEffect, useRef } from 'react'

export default function AdminActionDialog({ title, description, emblem, onClose, busy, children }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className="admin-action-dialog"
    >
      <div className="admin-action-panel">
        <header className="admin-action-header">
          <img src={emblem} alt="" width="56" height="56" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-cinzel text-xl font-semibold text-white sm:text-2xl">{title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-300">{description}</p>
          </div>
          <button type="button" className="admin-button admin-action-close" aria-label="Close dialog" onClick={onClose} disabled={busy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
