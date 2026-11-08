import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { API_BASE, authFetch } from '../../api/client'
import AdminActionDialog from './AdminActionDialog'
import classCodeSeal from '../../assets/admin/class-code-seal.svg'

const API = API_BASE

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icons — no icon font dependency whatsoever.
// Each returns a plain <svg> element sized to `size` px.
// ─────────────────────────────────────────────────────────────────────────────
const Icon = {
  Check: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Users: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Edit: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Plus: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Refresh: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Upload: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  Download: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  Search: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ChevronRight: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  UserOff: ({ size = 36, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  File: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  FileCheck: ({ size = 32, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
    </svg>
  ),
  Loader: ({ size = 24, color = '#7c3aed' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  AlertCircle: ({ size = 14, color = '#f87171' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Grid: ({ size = 48, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable atoms
// ─────────────────────────────────────────────────────────────────────────────

/** Toast notification — self-dismisses via parent timeout. */
function Toast({ toast }) {
  if (!toast) return null
  const isError   = toast.type === 'error'
  const isWarning = toast.type === 'warning'
  const bg   = isError ? '#b91c1c' : isWarning ? '#b45309' : '#15803d'
  const icon = isError
    ? <Icon.X size={14} color="#fff" />
    : isWarning
      ? <Icon.AlertCircle size={14} color="#fff" />
      : <Icon.Check size={14} color="#fff" />
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
      fontWeight: 600, fontSize: '0.875rem', color: '#fff',
      background: bg,
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      animation: 'toastIn 0.2s ease',
    }}>
      {icon}
      {toast.msg}
    </div>
  )
}

/** Active / Inactive pill badge. */
function StatusPill({ active }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '9999px',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
      background: active ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
      color: active ? '#4ade80' : '#f87171',
      border: `1px solid ${active ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

/** Enrollment capacity bar with color-coded fill. */
function CapacityBar({ enrolled, capacity }) {
  const pct = capacity > 0 ? Math.min(Math.round((enrolled / capacity) * 100), 100) : 0
  const color = pct >= 90 ? '#f87171' : pct >= 70 ? '#facc15' : '#4ade80'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
        {enrolled} / {capacity}
      </span>
      <div style={{ height: 5, borderRadius: 9999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 9999, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinning loader — CSS animation, no icon font needed
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ size = 24, color = '#7c3aed' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `3px solid rgba(124,58,237,0.2)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny icon button — used in the SectionRow actions cell
// ─────────────────────────────────────────────────────────────────────────────
function ActionBtn({ IconComponent, title, onClick, destructive = false }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className={`admin-button inline-flex size-10 shrink-0 items-center justify-center ${destructive ? 'admin-button-danger' : ''}`}>
      <IconComponent size={16} color="currentColor" />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ onClose, title, subtitle, icon, iconBg = '#7c3aed', children, maxWidth = 520 }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: '1rem',
        animation: 'overlayIn 0.15s ease',
      }}
    >
      <div style={{
        background: '#0f172a',
        border: '2px solid rgba(124,58,237,0.45)',
        borderRadius: '1rem',
        width: '100%', maxWidth,
        maxHeight: 'calc(100dvh - 2rem)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(88,28,235,0.4) 0%, rgba(157,23,77,0.3) 100%)',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>{title}</h2>
              {subtitle && <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(196,181,253,0.7)' }}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#f1f5f9' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
            aria-label="Close modal"
          >
            <Icon.X size={14} color="currentColor" />
          </button>
        </div>

        {/* Scrollable body — smooth, hardware-accelerated */}
        <div style={{
          overflowY: 'auto',
          padding: '1.5rem',
          flex: 1,
          // Smooth momentum scrolling on all platforms
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          // GPU-composited layer so scroll doesn't trigger repaints
          willChange: 'scroll-position',
          scrollBehavior: 'smooth',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionFormModal — create or edit a section
// ─────────────────────────────────────────────────────────────────────────────
function SectionFormModal({ section, subjects, onClose, onSuccess }) {
  const isEdit = Boolean(section)
  const [form, setForm] = useState({
    section_no: section?.section_no ?? '',
    subject_id: section?.subject_id ?? '',
    schedule: section?.schedule ?? '',
    room: section?.room ?? '',
    capacity: section?.capacity ?? 40,
    semester: section?.semester ?? '',
    academic_year: section?.academic_year ?? '',
    is_active: section?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef(null)

  const change = ({ target }) => {
    target.setCustomValidity('')
    const { name, type, checked, value } = target
    setForm(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  const handleSubmit = async event => {
    event.preventDefault()
    if (loading) return
    const code = form.section_no.trim()
    if (!code) {
      codeRef.current.setCustomValidity('Enter a class code.')
      codeRef.current.reportValidity()
      return
    }

    setError('')
    setLoading(true)
    try {
      const url = isEdit ? `${API}/api/admin/sections/${section.id}` : `${API}/api/admin/sections`
      const response = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, section_no: code, subject_id: Number(form.subject_id), capacity: Number(form.capacity || 40) }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error || `Could not save the class code (HTTP ${response.status}). Try again.`)
        return
      }
      onSuccess()
      onClose()
    } catch {
      setError('Could not confirm the save. Check the class list before trying again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminActionDialog
      title={isEdit ? 'Edit Class Code' : 'Create Class Code'}
      description={isEdit ? `Update class ${section.section_no}.` : 'Add a class section to an existing subject.'}
      emblem={classCodeSeal}
      onClose={onClose}
      busy={loading}
    >
      <form className="admin-section-form" onSubmit={handleSubmit} aria-busy={loading}>
        <div className="admin-action-scroll admin-section-fields">
          <fieldset disabled={loading}>
            <legend>Class details</legend>
            <label>
              Subject <span aria-hidden="true">*</span>
              <select name="subject_id" required value={form.subject_id} onChange={change}>
                <option value="" disabled>Choose a subject</option>
                {isEdit && !subjects.some(subject => subject.id === section.subject_id) && (
                  <option value={section.subject_id}>{section.subject_name || 'Current subject'}</option>
                )}
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_code ? `${subject.subject_code} · ` : ''}{subject.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-section-grid">
              <label>
                Class code <span aria-hidden="true">*</span>
                <input ref={codeRef} name="section_no" required maxLength={20} value={form.section_no} placeholder="e.g. 29144" onChange={change} />
                <small>Unique across all subjects.</small>
              </label>
              <label>
                Capacity
                <input name="capacity" type="number" min={1} max={200} step={1} value={form.capacity} placeholder="40" onChange={change} />
                <small>1–200 students. Default is 40.</small>
              </label>
            </div>
          </fieldset>
          <fieldset disabled={loading}>
            <legend>Schedule and term <small>Optional</small></legend>
            <div className="admin-section-grid">
              <label>
                Schedule
                <input name="schedule" maxLength={100} value={form.schedule} placeholder="e.g. Mon 18:00–21:00" onChange={change} />
              </label>
              <label>
                Room
                <input name="room" maxLength={50} value={form.room} placeholder="e.g. CL 5" onChange={change} />
              </label>
              <label>
                Semester
                <select name="semester" value={form.semester} onChange={change}>
                  <option value="">Choose a semester</option>
                  {form.semester && !['1st Semester', '2nd Semester', 'Summer'].includes(form.semester) && (
                    <option value={form.semester}>{form.semester}</option>
                  )}
                  <option>1st Semester</option>
                  <option>2nd Semester</option>
                  <option>Summer</option>
                </select>
              </label>
              <label>
                Academic year
                <input name="academic_year" maxLength={9} value={form.academic_year} placeholder="e.g. 2026–2027" onChange={change} />
              </label>
            </div>
            {isEdit && (
              <label className="admin-section-active">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={change} />
                Class is active
              </label>
            )}
          </fieldset>
        </div>
        <footer className="admin-section-footer">
          {error && <p role="alert">{error}</p>}
          <div>
            <button type="button" onClick={onClose} disabled={loading} className="admin-button px-4 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="admin-button admin-button-primary px-4 text-sm font-semibold">
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create class code'}
            </button>
          </div>
        </footer>
      </form>
    </AdminActionDialog>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// EnrolledStudentsModal
// Smooth, hardware-accelerated scroll — no jank even with 50+ students.
// ─────────────────────────────────────────────────────────────────────────────
function EnrolledStudentsModal({ section, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const response = await authFetch(`${API}/api/admin/sections/${section.id}/enrollments`, { signal: controller.signal })
        if (!response.ok) throw new Error()
        const roster = await response.json()
        if (!controller.signal.aborted) setData(roster)
      } catch {
        if (!controller.signal.aborted) setLoadError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [section.id, retry])

  return (
    <Modal
      onClose={onClose}
      title={`Class Code ${section.section_no}`}
      subtitle={loadError ? 'Roster unavailable' : loading ? 'Loading roster…' : `${data?.enrolled_count ?? 0} students enrolled`}
      icon={<Icon.Users size={18} color="#fff" />}
      iconBg="#1d4ed8"
      maxWidth={540}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size={32} />
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-amber-100">
          <span>The class roster could not be loaded.</span>
          <button type="button" className="admin-button px-4" onClick={() => setRetry(value => value + 1)}>Retry</button>
        </div>
      ) : !data?.students?.length ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon.UserOff size={40} color="#334155" />
          </div>
          No students enrolled yet
        </div>
      ) : (
        /*
         * Student list container.
         * - `contain: strict` tells the browser this element is self-contained
         *   — improves scroll performance significantly.
         * - Hover is handled via CSS class injected in the <style> block below,
         *   NOT via JS onMouseEnter/Leave, which causes per-frame style mutations
         *   and is the main source of scroll jank.
         */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, contain: 'content' }}>
          {data.students.map((s) => (
            <div key={s.enrollment_id} className="student-row" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '0.625rem 0.875rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              border: '1px solid rgba(100,116,139,0.2)',
              transition: 'background 0.15s',
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem', color: '#fff',
                flexShrink: 0,
              }}>
                {(s.full_name || s.username)?.[0]?.toUpperCase() ?? '?'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.full_name || s.username}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'anywhere' }}>
                  {s.username} · {s.email}
                </p>
              </div>

              <span style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0 }}>
                {new Date(s.enrolled_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionRow — one row inside a SubjectGroup accordion
//
// CHANGE FROM ORIGINAL: checkboxes and selection logic removed entirely.
// The only delete path is the trash button in the Actions column.
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({ section, onStudents, onEdit, onDelete }) {
  return (
    <tr role="row" className="border-b border-white/5 hover:bg-white/[0.03]">
      {/* Class Code */}
      <td role="cell" className="admin-record-heading" style={{ padding: '0.625rem 1rem' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#a78bfa' }}>
          {section.section_no}
        </span>
      </td>

      {/* Schedule */}
      <td role="cell" data-label="Schedule" style={{ padding: '0.625rem 0.75rem', fontSize: '0.8rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
        {section.schedule || <span style={{ color: '#475569' }}>—</span>}
      </td>

      {/* Room */}
      <td role="cell" data-label="Room" style={{ padding: '0.625rem 0.75rem' }}>
        {section.room ? (
          <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
            {section.room}
          </span>
        ) : <span style={{ color: '#475569', fontSize: '0.8rem' }}>—</span>}
      </td>

      {/* Enrolled / capacity */}
      <td role="cell" data-label="Enrolled" style={{ padding: '0.625rem 0.75rem' }}>
        <CapacityBar enrolled={section.current_count} capacity={section.capacity} />
      </td>

      {/* Semester */}
      <td role="cell" data-label="Semester" style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
        {section.semester || '—'}
      </td>

      {/* Status */}
      <td role="cell" data-label="Status" style={{ padding: '0.625rem 0.75rem' }}>
        <StatusPill active={section.is_active} />
      </td>

      <td role="cell" className="admin-record-actions" style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ActionBtn IconComponent={Icon.Users} title="View enrolled students" onClick={onStudents} />
          <ActionBtn IconComponent={Icon.Edit}  title="Edit section"           onClick={onEdit} />
          <ActionBtn IconComponent={Icon.Trash} destructive title="Delete section"         onClick={onDelete} />
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SubjectGroup — collapsible accordion card for all sections of one subject
// ─────────────────────────────────────────────────────────────────────────────
function SubjectGroup({ subjectName, subjectCode, sections, onStudents, onEdit, onDelete, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  const totalEnrolled = sections.reduce((s, sec) => s + (sec.current_count || 0), 0)
  const totalCapacity = sections.reduce((s, sec) => s + (sec.capacity || 0), 0)
  const activeCount   = sections.filter((s) => s.is_active).length

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(124,58,237,0.2)',
      borderRadius: '0.875rem',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)' }}
    >
      {/* Accordion header */}
      <button
        type="button"
        aria-expanded={open}
        className="admin-subject-toggle"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '0.875rem 1.25rem',
          background: open ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
          border: 'none',
          borderBottom: open ? '1px solid rgba(124,58,237,0.15)' : 'none',
          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
        }}
      >
        {/* Rotating chevron */}
        <div style={{ transition: 'transform 0.25s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <Icon.ChevronRight size={16} color="#7c3aed" />
        </div>

        {/* Subject code badge */}
        {subjectCode && (
          <span style={{
            padding: '2px 10px',
            background: 'rgba(124,58,237,0.2)',
            border: '1px solid rgba(165,122,252,0.35)',
            borderRadius: 6, fontFamily: 'monospace',
            fontWeight: 700, fontSize: '0.8rem', color: '#a78bfa', flexShrink: 0,
          }}>
            {subjectCode}
          </span>
        )}

        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f1f5f9', flex: 1, textAlign: 'left' }}>
          {subjectName}
        </span>

        {/* Stats pills */}
        <div className="admin-subject-totals flex flex-wrap items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
          <span style={{
            padding: '2px 10px',
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
            borderRadius: 9999, fontSize: '0.7rem', color: '#4ade80', fontWeight: 600,
          }}>
            {totalEnrolled}/{totalCapacity} enrolled
          </span>
          {activeCount < sections.length && (
            <span style={{
              padding: '2px 10px',
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 9999, fontSize: '0.7rem', color: '#f87171', fontWeight: 600,
            }}>
              {sections.length - activeCount} inactive
            </span>
          )}
        </div>
      </button>

      <div hidden={!open}>
        <table role="table" className="admin-record-table w-full border-collapse"
          aria-label={`Sections for ${subjectName}`}>
          <thead role="rowgroup">
            <tr role="row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Class Code', 'Schedule', 'Room', 'Enrolled', 'Semester', 'Status', 'Actions'].map((h) => (
                <th role="columnheader" scope="col" key={h} style={{
                  padding: '0.5rem 0.75rem', textAlign: 'left',
                  fontSize: '0.65rem', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {sections.map((sec) => (
              <SectionRow
                key={sec.id}
                section={sec}
                onStudents={() => onStudents(sec)}
                onEdit={() => onEdit(sec)}
                onDelete={() => onDelete(sec)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CSVUploadModal
// ─────────────────────────────────────────────────────────────────────────────
function CSVUploadModal({ onClose, onSuccess }) {
  const fileRef = useRef(null)
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]       = useState(null)
  const [isDrag, setIsDrag]       = useState(false)

  // Accept a csv file from the file picker or drop zone
  const handleFile = (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.csv')) return
    setFile(f)
  }
  // Read the file dropped onto the drop zone
  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDrag(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  // Download a sample csv so admins know the expected column format
  const downloadTemplate = () => {
    const csv = ['section_no,subject_code,schedule,room,capacity,semester,academic_year', '29144,IT115L,Mon 18:00-21:00,CL5,40,1st Semester,2024-2025'].join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'sections_template.csv' })
    a.click()
  }

  // Upload the csv and show the per-row results
  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await authFetch(`${API}/api/admin/sections/bulk-upload`, {
        method: 'POST', body: fd,
      })
      setResult(await res.json())
    } catch { setResult({ error: 'Network error' }) }
    finally { setUploading(false) }
  }

  return (
    <Modal onClose={onClose} title="Upload Sections CSV" subtitle="Create multiple class codes at once"
      icon={<Icon.Upload size={18} color="#fff" />} iconBg="#15803d">
      {!result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDrag(true) }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? '#16a34a' : isDrag ? '#7c3aed' : 'rgba(100,116,139,0.4)'}`,
              borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
              background: file ? 'rgba(22,163,74,0.05)' : isDrag ? 'rgba(124,58,237,0.05)' : 'transparent',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              {file ? <Icon.FileCheck size={32} color="#4ade80" /> : <Icon.File size={32} color="#64748b" />}
            </div>
            <p style={{ margin: 0, color: file ? '#4ade80' : '#94a3b8', fontWeight: 600 }}>
              {file ? file.name : 'Drop CSV here or click to browse'}
            </p>
          </div>

          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
            Required: <code style={{ color: '#a78bfa' }}>section_no</code>, <code style={{ color: '#a78bfa' }}>subject_code</code> — optional: schedule, room, capacity, semester, academic_year
          </p>

          <button onClick={downloadTemplate}
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon.Download size={14} color="#94a3b8" /> Download Template
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="admin-button flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold">
              Cancel
            </button>
            <button onClick={handleUpload} disabled={!file || uploading}
              className="admin-button admin-button-primary flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold">
              {uploading ? <><Spinner size={16} color="#fff" /> Uploading…</> : 'Upload CSV'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {result.error ? (
            // hard failure — backend never got far enough to produce a
            // summary (missing columns, empty file, bad CSV, DB error).
            // used to fall through to the zeros grid below with no
            // explanation at all — this is the fix for that.
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '1rem' }}>
              <p style={{ margin: 0, color: '#f87171', fontWeight: 700, fontSize: '0.9rem' }}>❌ Upload failed</p>
              <p style={{ margin: '0.35rem 0 0', color: '#fca5a5', fontSize: '0.8rem' }}>{result.error}</p>
              {result.missing && (
                <p style={{ margin: '0.35rem 0 0', color: '#fca5a5', fontSize: '0.75rem' }}>
                  Missing columns: {result.missing.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Total',   val: result.summary?.total_rows ?? 0, color: '#e2e8f0' },
                { label: 'Created', val: result.summary?.created    ?? 0, color: '#4ade80' },
                { label: 'Skipped', val: result.summary?.skipped    ?? 0, color: '#facc15' },
                { label: 'Errors',  val: result.summary?.errors     ?? 0, color: '#f87171' },
              ].map((c) => (
                <div key={c.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.625rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: c.color }}>{c.val}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* per-row results — the backend already sends this for every
              row (created/skipped/error + a reason), it just wasn't being
              shown here before. without this, "3 errors" told you nothing
              about which 3 rows or why. */}
          {result.results?.length > 0 && (
            <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', maxHeight: 210, overflow: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(255,255,255,0.06)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem' }}>Row</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem' }}>Section</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: '#94a3b8', fontWeight: 600, fontSize: '0.7rem' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => {
                    const statusColor = r.status === 'created' ? '#4ade80' : r.status === 'skipped' ? '#facc15' : '#f87171'
                    return (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.row}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.75rem' }}>{r.section_no || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: statusColor, fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>{r.subject || r.reason || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setResult(null); setFile(null) }} className="admin-button flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold">
              Upload Another
            </button>
            <button onClick={() => { onSuccess(); onClose() }} className="admin-button admin-button-primary flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderBtn — top-right action buttons
// ─────────────────────────────────────────────────────────────────────────────
function HeaderBtn({ icon: IconComponent, label, onClick, tone = '' }) {
  return (
    <button type="button" onClick={onClick}
      className={`admin-button inline-flex items-center gap-2 px-4 text-sm font-semibold ${tone}`}>
      <IconComponent size={16} color="currentColor" />
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component: ClassCodesManagement
//
// CHANGES FROM ORIGINAL:
//   - Removed checkboxes, selectedIds state, and bulk-delete bar entirely.
//     Delete now only happens via the trash button on each row.
//   - All icons replaced with inline SVGs — no Tabler icon font required.
//   - Student list scroll is smooth (CSS containment, no JS hover mutations).
// ─────────────────────────────────────────────────────────────────────────────
export default function ClassCodesManagement() {
  const [sections, setSections]           = useState([])
  const [subjects, setSubjects]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [createModal, setCreateModal]     = useState(false)
  const [editModal, setEditModal]         = useState(null)
  const [enrollModal, setEnrollModal]     = useState(null)
  const [csvModal, setCSVModal]           = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [bulkDeleteInput, setBulkDeleteInput] = useState('')
  const [bulkDeleting, setBulkDeleting]       = useState(false)
  const [toast, setToast]                 = useState(null)

  // Show a temporary toast notification
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const [sectionsError, setSectionsError] = useState(false)
  const [subjectsError, setSubjectsError] = useState(false)

  // Fetch all class code sections
  const fetchSections = useCallback(async ({ keepView = false } = {}) => {
    if (!keepView) setLoading(true)
    setSectionsError(false)
    try {
      const res = await authFetch(`${API}/api/admin/sections`)
      if (!res.ok) throw new Error()
      setSections(await res.json())
    } catch { setSectionsError(true) }
    finally { if (!keepView) setLoading(false) }
  }, [])

  // Fetch all subjects for the filter dropdown and form
  const fetchSubjects = useCallback(async () => {
    setSubjectsError(false)
    try {
      const res = await authFetch(`${API}/api/admin/subjects`)
      if (!res.ok) throw new Error()
      setSubjects(await res.json())
    } catch { setSubjectsError(true) }
  }, [])

  const reload = useCallback(() => { fetchSections(); fetchSubjects() }, [fetchSections, fetchSubjects])
  useEffect(() => {
    const timer = setTimeout(reload, 0)
    return () => clearTimeout(timer)
  }, [reload])

  // ── Single class code deletion ────────────────────────────────────────
  const handleDelete = (section) => {
    setDeleteTarget(section)
  }

  // Delete the section once the admin confirms in the dialog
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res  = await authFetch(`${API}/api/admin/sections/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) { showToast(`Section ${deleteTarget.section_no} deleted`); fetchSections() }
      else showToast(data.error || 'Delete failed', 'error')
    } catch { showToast('Network error', 'error') }
    finally { setDeleteTarget(null) }
  }

  // The server skips class codes that still have people or class content.
  const performBulkDelete = async () => {
    if (bulkDeleting || bulkDeleteInput !== 'DELETE EMPTY CLASS CODES') return
    setBulkDeleting(true)
    try {
      const res  = await authFetch(`${API}/api/admin/sections/bulk-delete`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        const skippedMsg = data.skipped?.length ? ` (${data.skipped.length} protected)` : ''
        if (data.deleted === 0 && data.skipped?.length) {
          showToast('Nothing deleted. All class codes still have enrollments, assignments, or content.', 'warning')
        } else {
          showToast(`Deleted ${data.deleted} class code(s)${skippedMsg}`)
        }
        fetchSections()
      } else {
        showToast(data.error || 'Bulk delete failed', 'error')
      }
    } catch { showToast('Network error', 'error') }
    finally { setBulkDeleting(false); setBulkDeleteModal(false); setBulkDeleteInput('') }
  }

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => sections.filter((s) => {
    if (subjectFilter !== 'all' && String(s.subject_id) !== subjectFilter) return false
    if (statusFilter === 'active'   && !s.is_active) return false
    if (statusFilter === 'inactive' &&  s.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.section_no.toLowerCase().includes(q) ||
        (s.subject_name || '').toLowerCase().includes(q) ||
        (s.subject_code || '').toLowerCase().includes(q) ||
        (s.room         || '').toLowerCase().includes(q) ||
        (s.schedule     || '').toLowerCase().includes(q)
      )
    }
    return true
  }), [sections, search, subjectFilter, statusFilter])

  /** Group filtered sections by subject, sorted by subject code. */
  const grouped = useMemo(() => {
    const map = {}
    for (const sec of filtered) {
      const key = sec.subject_id ?? 'unknown'
      if (!map[key]) map[key] = { subjectId: sec.subject_id, subjectName: sec.subject_name || 'Unknown Subject', subjectCode: sec.subject_code || '', sections: [] }
      map[key].sections.push(sec)
    }
    return Object.values(map).sort((a, b) => (a.subjectCode || a.subjectName).localeCompare(b.subjectCode || b.subjectName))
  }, [filtered])

  // ── Summary stats ────────────────────────────────────────────────────────
  const totalEnrolled  = sections.reduce((a, s) => a + (s.current_count || 0), 0)
  const totalCapacity  = sections.reduce((a, s) => a + (s.capacity     || 0), 0)
  const activeSections = sections.filter((s) => s.is_active).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Spinner size={40} />
      </div>
    )
  }

  if (sectionsError || subjectsError) {
    return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/25 bg-slate-900 p-4 text-sm text-amber-100">
      <span>Class codes or subjects could not be loaded.</span>
      <button type="button" className="admin-button px-4" onClick={reload}>Retry</button>
    </div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0 3rem' }}>

      {/* ── Global styles injected once ──────────────────────────────── */}
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes overlayIn{ from { opacity:0 } to { opacity:1 } }
        @keyframes modalIn  { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes spin     { to   { transform:rotate(360deg) } }
        /* Smooth scroll on the student list rows — CSS hover, not JS */
        .student-row:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      <Toast toast={toast} />

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9' }}>Class Codes</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            Manage class codes (e.g., 29022) grouped by subject — used for regular &amp; irregular student enrollment
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <HeaderBtn icon={Icon.Refresh}  label="Refresh"        onClick={reload} />
          <HeaderBtn icon={Icon.Upload}   label="Import Class Codes" onClick={() => setCSVModal(true)} />
          <HeaderBtn icon={Icon.Plus}     label="Create Class Code" onClick={() => setCreateModal(true)} tone="admin-button-primary" />
          <HeaderBtn icon={Icon.Trash}    label="Delete Empty Class Codes"     onClick={() => setBulkDeleteModal(true)} tone="admin-button-danger" />
        </div>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 8rem), 1fr))', gap: 12 }}>
        {[
          { label: 'Total Sections', value: sections.length,  color: '#a78bfa', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.25)' },
          { label: 'Active',         value: activeSections,   color: '#4ade80', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(74,222,128,0.25)' },
          { label: 'Total Enrolled', value: totalEnrolled,    color: '#60a5fa', bg: 'rgba(29,78,216,0.1)',   border: 'rgba(96,165,250,0.25)' },
          { label: 'Total Capacity', value: totalCapacity,    color: '#fbbf24', bg: 'rgba(180,131,23,0.1)',  border: 'rgba(251,191,36,0.25)' },
        ].map((s) => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '0.75rem', padding: '1rem 1.25rem' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters bar ─────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '0.875rem', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon.Search size={15} color="#475569" />
            </div>
            <input type="text" aria-label="Search class codes" placeholder="Search class codes…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem 0.5rem 2.25rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>

          {/* Subject filter */}
          <select aria-label="Filter by subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}>
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Result count + clear */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong style={{ color: '#f1f5f9' }}>{filtered.length}</strong> of{' '}
            <strong style={{ color: '#f1f5f9' }}>{sections.length}</strong> sections
            {grouped.length > 0 && ` across ${grouped.length} subject${grouped.length !== 1 ? 's' : ''}`}
          </span>
          {(search || subjectFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setSubjectFilter('all'); setStatusFilter('all') }}
              style={{ fontSize: '0.75rem', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Content: grouped accordion cards ────────────────────────── */}
      {grouped.length === 0 ? (
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(100,116,139,0.3)', borderRadius: '0.875rem', padding: '2rem 1rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon.Grid size={48} color="#334155" />
          </div>
          <p style={{ margin: 0, fontSize: '1rem', color: '#475569', fontWeight: 600 }}>
            {sections.length === 0 ? 'No class codes yet — create your first one!' : 'No class codes match your filters'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {grouped.map((group) => (
            <SubjectGroup
              key={group.subjectId ?? group.subjectName}
              subjectName={group.subjectName}
              subjectCode={group.subjectCode}
              sections={group.sections}
              onStudents={(sec) => setEnrollModal(sec)}
              onEdit={(sec) => setEditModal(sec)}
              onDelete={handleDelete}
              defaultOpen={grouped.length <= 5}
            />
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {createModal && (
        <SectionFormModal subjects={subjects}
          onClose={() => setCreateModal(false)}
          onSuccess={() => { fetchSections({ keepView: true }); showToast('Class code created!') }} />
      )}
      {editModal && (
        <SectionFormModal section={editModal} subjects={subjects}
          onClose={() => setEditModal(null)}
          onSuccess={() => { fetchSections({ keepView: true }); showToast('Class code updated!') }} />
      )}
      {enrollModal && (
        <EnrolledStudentsModal section={enrollModal} onClose={() => setEnrollModal(null)} />
      )}
      {csvModal && (
        <CSVUploadModal
          onClose={() => setCSVModal(false)}
          onSuccess={() => { fetchSections(); showToast('Sections uploaded!') }} />
      )}
      {bulkDeleteModal && (
        <Modal
          onClose={() => { setBulkDeleteModal(false); setBulkDeleteInput('') }}
          title="Delete All Empty Class Codes"
          subtitle="This action cannot be undone"
          icon={<Icon.Trash size={18} color="#fff" />}
          iconBg="#b91c1c"
          maxWidth={440}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              This permanently deletes class codes only when they have no enrolled students, instructor assignment, quests, modules, or announcements.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 }}>
                Type <span style={{ fontFamily: 'monospace', color: '#f87171', fontWeight: 700 }}>DELETE EMPTY CLASS CODES</span> to confirm
              </label>
              <input
                type="text"
                value={bulkDeleteInput}
                onChange={(e) => setBulkDeleteInput(e.target.value)}
                autoFocus
                autoComplete="off"
                placeholder="DELETE EMPTY CLASS CODES"
                style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8, padding: '0.625rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setBulkDeleteModal(false); setBulkDeleteInput('') }}
                disabled={bulkDeleting}
                className="admin-button flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={performBulkDelete}
                disabled={bulkDeleteInput !== 'DELETE EMPTY CLASS CODES' || bulkDeleting}
                className="admin-button admin-button-danger flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                {bulkDeleting
                  ? <><Spinner size={14} /> Deleting…</>
                  : <><Icon.Trash size={14} color="#fff" /> Confirm Delete</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          onClose={() => setDeleteTarget(null)}
          title="Delete Class Code"
          subtitle={`Section ${deleteTarget.section_no}`}
          icon={<Icon.Trash size={18} color="#fff" />}
          iconBg="#b91c1c"
          maxWidth={420}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              Delete class code <strong style={{ color: '#f1f5f9' }}>{deleteTarget.section_no}</strong>?
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="admin-button flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="admin-button admin-button-danger flex-1 inline-flex items-center justify-center gap-2 px-4 text-sm font-semibold"
              >
                <Icon.Trash size={14} color="#fff" /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
