import { useEffect, useLayoutEffect, useRef } from 'react'
import FormBanner from './FormBanner'

// One page notification for the whole admin side. Pass the current toast object
// ({ message | msg, type: 'success' | 'warning' | 'error' }) or null; a new object
// restarts the timer. It sits in the browser's top layer, so it stays visible
// even while a dialog is open.
export default function AdminToast({ toast, onDone, duration }) {
  const ref = useRef(null)
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !toast) return
    if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) el.showPopover()
  }, [toast])

  useEffect(() => {
    if (!toast) return
    const ms = duration ?? (toast.type === 'warning' || toast.type === 'error' ? 6500 : 4000)
    const timer = setTimeout(() => doneRef.current?.(), ms)
    return () => clearTimeout(timer)
  }, [toast, duration])

  if (!toast) return null
  const tone = toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'success'
  return (
    <div ref={ref} popover="manual" className="admin-toast">
      <FormBanner tone={tone} className="admin-toast-card">{toast.message ?? toast.msg}</FormBanner>
      <button type="button" className="admin-toast-close" aria-label="Dismiss notification" onClick={() => doneRef.current?.()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
  )
}
