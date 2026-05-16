import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const API = 'http://localhost:5000'

/** Helper: retrieve the JWT from storage. */
const token = () => localStorage.getItem('token')

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
  const isError = toast.type === 'error'
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
      fontWeight: 600, fontSize: '0.875rem', color: '#fff',
      background: isError ? '#b91c1c' : '#15803d',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      animation: 'toastIn 0.2s ease',
    }}>
      {isError ? <Icon.X size={14} color="#fff" /> : <Icon.Check size={14} color="#fff" />}
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
function ActionBtn({ IconComponent, color, title, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8,
        background: hov ? `${color}35` : `${color}18`,
        border: `1px solid ${color}50`,
        color: hov ? '#f1f5f9' : '#94a3b8',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
      aria-label={title}
    >
      <IconComponent size={14} color={hov ? '#f1f5f9' : color} />
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
        maxHeight: '90vh',
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
  const isEdit = !!section

  const [form, setForm] = useState({
    section_no:    section?.section_no    ?? '',
    subject_id:    section?.subject_id    ?? '',
    schedule:      section?.schedule      ?? '',
    room:          section?.room          ?? '',
    capacity:      section?.capacity      ?? 40,
    semester:      section?.semester      ?? '',
    academic_year: section?.academic_year ?? '',
    is_active:     section?.is_active     ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const inputStyle = {
    background: '#1e293b',
    border: '1px solid rgba(100,116,139,0.4)',
    borderRadius: 10,
    padding: '0.625rem 0.875rem',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    fontSize: '0.7rem', fontWeight: 600,
    letterSpacing: '0.07em', color: '#94a3b8',
    textTransform: 'uppercase', marginBottom: 6, display: 'block',
  }

  const handleSubmit = async () => {
    if (!form.section_no.trim()) { setError('Class Code is required'); return }
    if (!form.subject_id)        { setError('Subject is required');    return }
    setError(''); setLoading(true)
    try {
      const url    = isEdit ? `${API}/api/admin/sections/${section.id}` : `${API}/api/admin/sections`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject_id: parseInt(form.subject_id), capacity: parseInt(form.capacity) || 40 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Request failed'); return }
      onSuccess(); onClose()
    } catch { setError('Network error — please try again') }
    finally { setLoading(false) }
  }

  return (
    <Modal
      onClose={onClose}
      title={isEdit ? 'Edit Class Code' : 'Create Class Code'}
      subtitle={isEdit ? `Editing section ${section.section_no}` : 'Add a new section for a subject'}
      icon={isEdit ? <Icon.Edit size={18} color="#fff" /> : <Icon.Plus size={18} color="#fff" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Class Code + Capacity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Class Code *</label>
            <input type="text" value={form.section_no} placeholder="e.g., 29144"
              onChange={(e) => setForm({ ...form, section_no: e.target.value })}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>
          <div>
            <label style={labelStyle}>Capacity</label>
            <input type="number" value={form.capacity} placeholder="40"
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>
        </div>

        {/* Subject dropdown */}
        <div>
          <label style={labelStyle}>Subject *</label>
          <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            style={{ ...inputStyle, color: form.subject_id ? '#f1f5f9' : '#64748b' }}>
            <option value="">— Select Subject —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule + Room */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Schedule</label>
            <input type="text" value={form.schedule} placeholder="Mon 18:00–21:00"
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>
          <div>
            <label style={labelStyle}>Room</label>
            <input type="text" value={form.room} placeholder="CL 5"
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>
        </div>

        {/* Semester + Academic Year */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Semester</label>
            <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
              style={inputStyle}>
              <option value="">— Select —</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Academic Year</label>
            <input type="text" value={form.academic_year} placeholder="2024–2025"
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>
        </div>

        {/* Active toggle — edit mode only */}
        {isEdit && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)',
          }}>
            <span style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 500 }}>Section Active</span>
            <button
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              style={{
                position: 'relative', width: 48, height: 24, borderRadius: 9999,
                background: form.is_active ? '#16a34a' : '#475569',
                border: 'none', cursor: 'pointer', transition: 'background 0.2s', padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2,
                left: form.is_active ? 26 : 2,
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        )}

        {/* Inline error */}
        {error && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.AlertCircle size={14} color="#f87171" /> {error}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600, transition: 'background 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <><Spinner size={16} color="#fff" /> Saving…</> : isEdit ? 'Save Changes' : 'Create Section'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EnrolledStudentsModal
// Smooth, hardware-accelerated scroll — no jank even with 50+ students.
// ─────────────────────────────────────────────────────────────────────────────
function EnrolledStudentsModal({ section, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/admin/sections/${section.id}/enrollments`, {
      headers: { 'Authorization': `Bearer ${token()}` },
    })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [section.id])

  return (
    <Modal
      onClose={onClose}
      title={`Class Code ${section.section_no}`}
      subtitle={`${data?.enrolled_count ?? '…'} students enrolled`}
      icon={<Icon.Users size={18} color="#fff" />}
      iconBg="#1d4ed8"
      maxWidth={540}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size={32} />
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
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.15s',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Class Code */}
      <td style={{ padding: '0.625rem 1rem' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: '#a78bfa' }}>
          {section.section_no}
        </span>
      </td>

      {/* Schedule */}
      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
        {section.schedule || <span style={{ color: '#475569' }}>—</span>}
      </td>

      {/* Room */}
      <td style={{ padding: '0.625rem 0.75rem' }}>
        {section.room ? (
          <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
            {section.room}
          </span>
        ) : <span style={{ color: '#475569', fontSize: '0.8rem' }}>—</span>}
      </td>

      {/* Enrolled / capacity */}
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <CapacityBar enrolled={section.current_count} capacity={section.capacity} />
      </td>

      {/* Semester */}
      <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
        {section.semester || '—'}
      </td>

      {/* Status */}
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <StatusPill active={section.is_active} />
      </td>

      {/* Actions — only 2 buttons now: View Students + Edit + Delete */}
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <ActionBtn IconComponent={Icon.Users} color="#1d4ed8" title="View enrolled students" onClick={onStudents} />
          <ActionBtn IconComponent={Icon.Edit}  color="#7c3aed" title="Edit section"           onClick={onEdit} />
          <ActionBtn IconComponent={Icon.Trash} color="#b91c1c" title="Delete section"         onClick={onDelete} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Table — CSS max-height transition for smooth open/close */}
      <div style={{
        maxHeight: open ? '9999px' : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          aria-label={`Sections for ${subjectName}`}>
          <colgroup>
            <col style={{ width: 110 }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Class Code', 'Schedule', 'Room', 'Enrolled', 'Semester', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{
                  padding: '0.5rem 0.75rem', textAlign: 'left',
                  fontSize: '0.65rem', fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
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

  const handleFile = (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.csv')) return
    setFile(f)
  }
  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDrag(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const downloadTemplate = () => {
    const csv = ['section_no,subject_code,schedule,room,capacity,semester,academic_year', '29144,IT115L,Mon 18:00-21:00,CL5,40,1st Semester,2024-2025'].join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'sections_template.csv' })
    a.click()
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API}/api/admin/sections/bulk-upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token()}` }, body: fd,
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
            <button onClick={onClose} style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={!file || uploading}
              style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'linear-gradient(135deg, #15803d, #166534)', border: 'none', color: '#fff', cursor: file && !uploading ? 'pointer' : 'not-allowed', fontWeight: 700, opacity: !file || uploading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {uploading ? <><Spinner size={16} color="#fff" /> Uploading…</> : 'Upload CSV'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => { setResult(null); setFile(null) }} style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}>
              Upload Another
            </button>
            <button onClick={() => { onSuccess(); onClose() }} style={{ flex: 1, padding: '0.625rem', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
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
function HeaderBtn({ icon: IconComponent, label, onClick, bg = 'rgba(255,255,255,0.05)', border = '1px solid rgba(255,255,255,0.1)', color = '#cbd5e1' }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0.5rem 1rem', borderRadius: 10,
        background: bg, border, color,
        cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
        transition: 'opacity 0.15s, filter 0.15s',
        opacity: hov ? 0.85 : 1,
        filter: hov ? 'brightness(1.1)' : 'none',
      }}>
      <IconComponent size={14} color={color} />
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
  const [toast, setToast]                 = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/sections`, { headers: { 'Authorization': `Bearer ${token()}` } })
      if (res.ok) setSections(await res.json())
    } catch (err) { console.error('fetchSections:', err) }
    finally { setLoading(false) }
  }, [])

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/subjects`, { headers: { 'Authorization': `Bearer ${token()}` } })
      if (res.ok) setSubjects(await res.json())
    } catch (err) { console.error('fetchSubjects:', err) }
  }, [])

  useEffect(() => { fetchSections(); fetchSubjects() }, [fetchSections, fetchSubjects])

  // ── Single delete (only delete path — no bulk) ───────────────────────────
  const handleDelete = async (section) => {
    if (!confirm(`Delete class code ${section.section_no}?\n\nThis cannot be undone.`)) return
    try {
      const res  = await fetch(`${API}/api/admin/sections/${section.id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token()}` },
      })
      const data = await res.json()
      if (res.ok) { showToast(`Section ${section.section_no} deleted`); fetchSections() }
      else showToast(data.error || 'Delete failed', 'error')
    } catch { showToast('Network error', 'error') }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0 3rem' }}>

      {/* ── Global styles injected once ──────────────────────────────── */}
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes overlayIn{ from { opacity:0 } to { opacity:1 } }
        @keyframes modalIn  { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes spin     { to   { transform:rotate(360deg) } }
        * { box-sizing: border-box; }
        /* Smooth scroll on the student list rows — CSS hover, not JS */
        .student-row:hover { background: rgba(255,255,255,0.06) !important; }
        ::-webkit-scrollbar       { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.4); border-radius:3px; }
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
          <HeaderBtn icon={Icon.Refresh}  label="Refresh"        onClick={fetchSections}           bg="rgba(255,255,255,0.05)" />
          <HeaderBtn icon={Icon.Upload}   label="Upload CSV"     onClick={() => setCSVModal(true)} bg="rgba(22,163,74,0.15)"  color="#4ade80" border="1px solid rgba(74,222,128,0.3)" />
          <HeaderBtn icon={Icon.Plus}     label="Create Section" onClick={() => setCreateModal(true)} bg="linear-gradient(135deg,#7c3aed,#db2777)" border="none" color="#fff" />
        </div>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon.Search size={15} color="#475569" />
            </div>
            <input type="text" placeholder="Search class codes…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem 0.5rem 2.25rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}
              onFocus={(e) => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(100,116,139,0.4)' }} />
          </div>

          {/* Subject filter */}
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none' }}>
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
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
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px dashed rgba(100,116,139,0.3)', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center' }}>
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
          onSuccess={() => { fetchSections(); showToast('Class code created!') }} />
      )}
      {editModal && (
        <SectionFormModal section={editModal} subjects={subjects}
          onClose={() => setEditModal(null)}
          onSuccess={() => { fetchSections(); showToast('Class code updated!') }} />
      )}
      {enrollModal && (
        <EnrolledStudentsModal section={enrollModal} onClose={() => setEnrollModal(null)} />
      )}
      {csvModal && (
        <CSVUploadModal
          onClose={() => setCSVModal(false)}
          onSuccess={() => { fetchSections(); showToast('Sections uploaded!') }} />
      )}
    </div>
  )
}
