// admin page for assigning an instructor to teach a subject in a class code.
// picking a subject filters the class code list down to sections for just that subject.
//
// Dropdowns are positioned against their triggers and stay inside the modal's
// focus boundary while rendering outside its scrolling content.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { API_BASE, authFetch } from '../../api/client'
import AdminActionDialog from './AdminActionDialog'
import AdminConfirmDialog from './AdminConfirmDialog'
import AdminToast from './AdminToast'
import assignmentSeal from '../../assets/admin/instructor-assignment-seal.svg'
import subjectEditSeal from '../../assets/admin/subject-edit-seal.svg'

// The backend base URL — change this when deploying to a real server
const API = API_BASE

const jsonHeaders = { 'Content-Type': 'application/json' }

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL DROPDOWN
// The core fix for dropdowns getting clipped by overflow:hidden on the modal.
//
// HOW IT WORKS:
//   - Portals into the enclosing dialog when there is one.
//   - Uses the trigger button's getBoundingClientRect() to position itself
//     in the exact right spot on screen.
//   - Auto-flips upward if there isn't enough space below the trigger.
//   - Auto-shifts left if the panel would go off the right edge of the screen.
//   - Outside clicks close it (but clicks INSIDE the panel are stopped from
//     bubbling to the document listener, preventing race conditions).
//
// Props:
//   triggerRef  — ref attached to the button that opens the dropdown
//   open        — whether the dropdown is currently visible
//   onClose     — called when user clicks outside
//   minWidth    — minimum width of the panel in px (default 320)
// ─────────────────────────────────────────────────────────────────────────────
function PortalDropdown({ triggerRef, open, onClose, children, minWidth = 320 }) {
  const [pos, setPos] = useState(null)

  // Recalculate position every time the dropdown opens or the window changes
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const update = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const viewport = window.visualViewport
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8
      const topEdge = (viewport?.offsetTop ?? 0) + 8
      const rightEdge = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - 8
      const bottomEdge = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 8
      const below = Math.max(0, bottomEdge - rect.bottom - 4)
      const above = Math.max(0, rect.top - topEdge - 4)
      const showAbove = below < 380 && above > below
      const height = Math.min(380, showAbove ? above : below)
      const width = Math.min(Math.max(rect.width, minWidth), rightEdge - leftEdge)
      setPos({
        top: showAbove ? Math.max(topEdge, rect.top - height - 4) : Math.min(bottomEdge, rect.bottom + 4),
        left: Math.max(leftEdge, Math.min(rect.left, rightEdge - width)),
        width,
        height,
        host: trigger.closest('dialog') ?? document.body,
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [open, triggerRef, minWidth])

  // Close when clicking anywhere outside the panel
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return
      onClose()
    }
    const onEscape = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handler)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open, onClose, triggerRef])

  if (!open || !pos) return null

  return createPortal(
    <div
      // stopPropagation here means clicks inside the panel NEVER reach the
      // document listener above — no accidental closures, no race conditions
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.height,
        zIndex: 99999,
        animation: 'dropIn 0.15s ease-out',
      }}
      className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-y-auto overscroll-contain"
    >
      {children}
    </div>,
    pos.host
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// this is my own searchable dropdown instead of the ugly native <select>
// A custom searchable dropdown for picking an instructor.
// Renders via PortalDropdown so it's never clipped by the modal.
//
// Why replace the native select?
//   The browser's default <select> ignores any custom CSS and renders as a
//   white box that looks completely wrong in the dark theme.
//
// Props:
//   value      — currently selected instructor ID (string or number)
//   onChange   — called with the new instructor ID when one is picked
//   instructors — array of { id, username, full_name } from the backend
// ─────────────────────────────────────────────────────────────────────────────
function InstructorPicker({ value, onChange, instructors }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  // Which instructor object matches the currently selected ID
  const selected = instructors.find(i => String(i.id) === String(value))

  // Filter the list by whatever the admin typed
  const filtered = instructors.filter(i => {
    const q = query.toLowerCase()
    return (
      (i.username  || '').toLowerCase().includes(q) ||
      (i.full_name || '').toLowerCase().includes(q)
    )
  })

  // Open the dropdown and focus the search box
  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Select an instructor — update state then close the panel
  const handleSelect = (e, id) => {
    e.preventDefault()
    onChange(id)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div>
      {/* The trigger button — looks like a select box */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        className="admin-button w-full border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between outline-none focus:border-purple-500 transition-all"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>
          {selected ? (selected.full_name || selected.username) : 'Select Instructor'}
        </span>
        <span className={`text-slate-500 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      <PortalDropdown triggerRef={triggerRef} open={open} onClose={() => setOpen(false)}>
        {/* Search box at the top */}
        <div className="p-2 border-b border-slate-700">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search instructor..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-600 outline-none focus:border-purple-500"
          />
        </div>

        {/* Instructor list */}
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No instructors found</p>
          ) : filtered.map(inst => (
            <button
              key={inst.id}
              type="button"
              onClick={e => handleSelect(e, inst.id)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-slate-700/50 transition-colors ${
                String(value) === String(inst.id) ? 'bg-purple-900/30' : ''
              }`}
            >
              {/* Avatar circle with the first letter of their name */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {(inst.full_name || inst.username || '?')[0].toUpperCase()}
              </div>
              <span className={`flex-1 ${String(value) === String(inst.id) ? 'text-purple-200 font-medium' : 'text-slate-300'}`}>
                {inst.full_name || inst.username}
              </span>
              {/* Checkmark on the currently selected item */}
              {String(value) === String(inst.id) && (
                <span className="text-purple-400 font-bold text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </PortalDropdown>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT PICKER
// Searchable dropdown for choosing a subject, grouped by year level.
// Uses PortalDropdown so it's never clipped.
// ─────────────────────────────────────────────────────────────────────────────
function SubjectPicker({ value, onChange, subjects }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = subjects.find(s => s.id == value)

  const filtered = subjects.filter(s => {
    const q = query.toLowerCase()
    return (
      (s.name         || '').toLowerCase().includes(q) ||
      (s.subject_code || '').toLowerCase().includes(q)
    )
  })

  // Group the filtered subjects by year level for nicer visual organization
  // e.g. { 'Year 1': [...], 'Year 2': [...] }
  const grouped = filtered.reduce((acc, s) => {
    const yr = s.year_level ? `Year ${s.year_level}` : 'Other'
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(s)
    return acc
  }, {})

  // Open the dropdown and focus the search box
  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (e) => {
    e.preventDefault()
    onChange(Number(e.currentTarget.dataset.subjectId))
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        className="admin-button w-full border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between outline-none focus:border-purple-500 transition-all"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.subject_code && (
                <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-700 rounded text-purple-300">
                  {selected.subject_code}
                </span>
              )}
              {selected.name}
            </span>
          ) : 'Select Subject'}
        </span>
        <span className={`text-slate-500 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      <PortalDropdown triggerRef={triggerRef} open={open} onClose={() => setOpen(false)}>
        <div className="p-2 border-b border-slate-700">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by subject name or code..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-600 outline-none focus:border-purple-500"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No subjects found</p>
          ) : Object.entries(grouped).map(([yr, items]) => (
            <div key={yr}>
              <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-700/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{yr}</span>
              </div>
              {items.map(s => (
                <button
                  key={s.id}
                  type="button"
                  data-subject-id={s.id}
                  onClick={handleSelect}
                  className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-700/50 transition-colors ${value == s.id ? 'bg-purple-900/30' : ''}`}
                >
                  {s.subject_code && (
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-700 rounded text-purple-300 flex-shrink-0 w-14 text-center">
                      {s.subject_code}
                    </span>
                  )}
                  <span className={`truncate ${value == s.id ? 'text-purple-200 font-medium' : 'text-slate-300'}`}>
                    {s.name}
                  </span>
                  {value == s.id && <span className="ml-auto text-purple-400 font-bold text-xs flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PortalDropdown>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// CLASS CODE PICKER  (KEY FIX: now receives sectionsBySubject, not ALL sections)
// Shows only the class codes that belong to the currently selected subject.
//
// Before this fix: all 31 sections appeared regardless of which subject was chosen.
// After this fix:  the list is pre-filtered to only sections for that subject.
//
// How the filtering works:
//   The parent component (AssignmentModal) passes in sectionsBySubject, which is
//   already the filtered subset. This component just displays what it receives —
//   no extra filtering needed here.
//
// Props:
//   value            — currently selected section ID
//   onChange         — called with the new section ID
//   sectionsBySubject — array of sections already filtered for the chosen subject
//   subjectSelected  — boolean, true when a subject has been chosen
// ─────────────────────────────────────────────────────────────────────────────
function ClassCodePicker({ value, onChange, sectionsBySubject, subjectSelected }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = sectionsBySubject.find(s => s.id == value)

  // Local search within the already-filtered list
  const filtered = sectionsBySubject.filter(s => {
    const q = query.toLowerCase()
    return (
      (s.section_no   || '').toLowerCase().includes(q) ||
      (s.schedule     || '').toLowerCase().includes(q) ||
      (s.semester     || '').toLowerCase().includes(q)
    )
  })

  // Sort numerically so 29101 comes before 29110
  const sorted = [...filtered].sort((a, b) =>
    (parseInt(a.section_no) || 0) - (parseInt(b.section_no) || 0)
  )

  const handleOpen = () => {
    // Don't open if no subject is selected yet — guide the admin to pick subject first
    if (!subjectSelected) return
    setOpen(o => !o)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (e, id) => {
    e.preventDefault()
    onChange(id)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        disabled={!subjectSelected}
        className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between outline-none transition-all ${
          !subjectSelected
            ? 'border-slate-700/40 opacity-50 cursor-not-allowed'
            : 'border-slate-700 hover:border-slate-600 focus:border-purple-500'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2 text-white min-w-0">
            <span className="font-mono font-bold text-purple-300 flex-shrink-0">{selected.section_no}</span>
            {selected.schedule && (
              <span className="text-slate-400 text-xs truncate">{selected.schedule}</span>
            )}
            {selected.semester && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 font-mono flex-shrink-0">
                {selected.semester}
              </span>
            )}
          </span>
        ) : (
          <span className="text-slate-500">
            {subjectSelected ? 'Select Class Code' : 'Select a subject first'}
          </span>
        )}
        <span className={`text-slate-500 text-xs transition-transform duration-200 flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      <PortalDropdown triggerRef={triggerRef} open={open} onClose={() => setOpen(false)} minWidth={480}>
        {/* Search bar */}
        <div className="p-2 border-b border-slate-700 bg-slate-800">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search section no, schedule..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-600 outline-none focus:border-purple-500"
          />
        </div>

        {/* Section list */}
        <div className="max-h-72 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm">
                {query ? `No results for "${query}"` : 'No class codes for this subject'}
              </p>
            </div>
          ) : sorted.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={e => handleSelect(e, s.id)}
              className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-slate-700/40 transition-colors ${value == s.id ? 'bg-purple-900/25' : ''}`}
            >
              {/* Section number */}
              <span className={`font-mono font-bold text-sm flex-shrink-0 w-16 ${value == s.id ? 'text-purple-300' : 'text-slate-200'}`}>
                {s.section_no}
              </span>

              {/* Schedule and room */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {s.schedule && (
                  <span className="text-xs text-slate-400 flex-shrink-0">🕐 {s.schedule}</span>
                )}
                {s.semester && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500 flex-shrink-0">
                    {s.semester}
                  </span>
                )}
                {s.room && (
                  <span className="text-xs text-slate-500 flex-shrink-0">📍 {s.room}</span>
                )}
              </div>

              {/* Capacity bar — color goes red as it fills up */}
              {s.student_count !== undefined && s.capacity && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.student_count / s.capacity > 0.85 ? 'bg-red-500'
                        : s.student_count / s.capacity > 0.6  ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (s.student_count / s.capacity) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right tabular-nums">
                    {s.student_count}/{s.capacity}
                  </span>
                </div>
              )}

              {value == s.id && <span className="text-purple-400 font-bold text-xs flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>

        {/* Footer: how many sections are shown */}
        <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-800/60 flex items-center justify-between">
          <span className="text-slate-600 text-xs">
            {sorted.length} of {sectionsBySubject.length} class codes
            {query && ` matching "${query}"`}
          </span>
          {query && (
            <button type="button" onClick={() => setQuery('')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ✕ Clear
            </button>
          )}
        </div>
      </PortalDropdown>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT MODAL
// The form that pops up when clicking "+ Assign Instructor" or the ✏ edit button.
//
// KEY CHANGE: when the admin picks a subject, the component now filters the
// full sections list to only the sections that belong to that subject.
// It passes that filtered list to ClassCodePicker instead of all sections.
//
// Also resets the selected section whenever the subject changes — you don't want
// a section from the old subject still selected when the subject switches.
//
// mode = 'create' | 'edit'
// allSections = ALL sections from the backend (we filter here)
// ─────────────────────────────────────────────────────────────────────────────
function AssignmentModal({ mode, formData, setFormData, instructors, subjects, allSections, onSubmit, onCancel, saving, error }) {
  const isEdit = mode === 'edit'

  // Filter sections to only those belonging to the currently selected subject.
  // This is the CORE FIX — before, ClassCodePicker received all sections.
  // Now it only receives sections where subject_id matches the chosen subject.
  const sectionsBySubject = formData.subject_id
    ? allSections.filter(s => String(s.subject_id) === String(formData.subject_id))
    : []

  // When the subject changes, clear the previously selected section.
  // Without this, you could end up with a section from a different subject still selected.
  const handleSubjectChange = (subjectId) => {
    setFormData(p => ({
      ...p,
      subject_id: subjectId,
      section_id: '',  // ← reset section whenever subject changes
    }))
  }

  return (
    <AdminActionDialog
      title={isEdit ? 'Edit Assignment' : 'Assign Instructor'}
      description={isEdit ? 'Change instructor, subject, or class code.' : 'Link an instructor to a subject and class code.'}
      emblem={isEdit ? subjectEditSeal : assignmentSeal}
      onClose={onCancel}
      busy={saving}
    >
      <form className="admin-section-form" onSubmit={event => { event.preventDefault(); if (!saving && formData.instructor_id && formData.subject_id && formData.section_id) onSubmit() }} aria-busy={saving}>
        {/* Form fields */}
        <fieldset disabled={saving} className="admin-action-scroll admin-section-fields min-w-0 space-y-4">

          {/* INSTRUCTOR — now uses InstructorPicker instead of native <select> */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Instructor <span className="text-pink-500">*</span>
            </label>
            <InstructorPicker
              value={formData.instructor_id}
              onChange={id => setFormData(p => ({ ...p, instructor_id: id }))}
              instructors={instructors}
            />
          </div>

          {/* SUBJECT — grouped by year level */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Subject <span className="text-pink-500">*</span>
            </label>
            <SubjectPicker
              value={formData.subject_id}
              onChange={handleSubjectChange}
              subjects={subjects}
            />
          </div>

          {/* CLASS CODE — filtered to the selected subject only */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Class Code <span className="text-pink-500">*</span>
            </label>
            <ClassCodePicker
              value={formData.section_id}
              onChange={id => setFormData(p => ({ ...p, section_id: id }))}
              sectionsBySubject={sectionsBySubject}
              subjectSelected={!!formData.subject_id}
            />

            {/* Hint text: tells admin how many codes are available for this subject */}
            {formData.subject_id && (
              <p className="text-xs text-slate-600 mt-1.5">
                {sectionsBySubject.length > 0
                  ? `${sectionsBySubject.length} class code${sectionsBySubject.length !== 1 ? 's' : ''} available for this subject`
                  : 'No class codes found for this subject — create some first'}
              </p>
            )}
            {!formData.subject_id && (
              <p className="text-xs text-slate-600 mt-1.5">
                Pick a subject above to see its class codes
              </p>
            )}
          </div>
        </fieldset>
        <footer className="admin-section-footer">
          {error && <p role="alert">{error}</p>}
          <div>
            <button type="button" onClick={onCancel} disabled={saving} className="admin-button px-4 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving || !formData.instructor_id || !formData.subject_id || !formData.section_id} className="admin-button admin-button-primary px-4 text-sm font-semibold">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Assign instructor'}
            </button>
          </div>
        </footer>
      </form>
    </AdminActionDialog>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// One of the four count boxes at the top of the page.
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  const colorMap = {
    purple:  'border-purple-600/25 text-purple-300',
    blue:    'border-blue-600/25 text-blue-300',
    emerald: 'border-emerald-600/25 text-emerald-300',
    amber:   'border-amber-600/25 text-amber-300',
  }
  return (
    <div className={`bg-slate-900/80 border rounded-2xl p-5 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <span className="text-lg opacity-60">{icon}</span>
      </div>
      <p className="text-4xl font-bold mt-2">
        {value}
      </p>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTOR CARD
// One card per instructor in the main list.
// Groups their assignments by subject so if they teach the same subject
// in multiple sections, those sections appear on the same row.
// Edit/Delete buttons are hidden by default and appear on row hover.
// ─────────────────────────────────────────────────────────────────────────────
function InstructorCard({ group, onEdit, onDelete }) {
  // Re-group assignments by subject for cleaner display
  const bySubject = group.items.reduce((acc, a) => {
    const key = a.subject?.id || 'unknown'
    if (!acc[key]) acc[key] = { subject: a.subject, rows: [] }
    acc[key].rows.push(a)
    return acc
  }, {})

  return (
    <div className="card-row bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700/80 transition-all duration-200 group/card">

      {/* Instructor name header */}
      <div className="flex items-center gap-4 px-5 py-4 bg-slate-800/40 border-b border-slate-800">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-600/20 flex-shrink-0">
          {(group.instructor?.username || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {group.instructor?.username || 'Unknown Instructor'}
          </p>
          <p className="text-xs text-slate-500">
            {group.items.length} assignment{group.items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/25 rounded-full text-purple-400 text-xs font-medium flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          Instructor
        </span>
      </div>

      {/* One row per subject this instructor teaches */}
      <div className="divide-y divide-slate-800/50">
        {Object.values(bySubject).map(({ subject, rows }) => (
          <div
            key={subject?.id || 'unknown'}
            className="flex flex-col xl:flex-row xl:flex-wrap xl:items-center gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors group/row"
          >
            {/* Subject badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold w-14">Subject</span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold truncate max-w-[200px]">
                {subject?.name || 'Unknown'}
              </span>
            </div>

            {/* Class code badges — one per section for this subject */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Codes</span>
              {rows.map(a => (
                <span key={a.id} className="font-mono text-xs px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg font-bold">
                  {a.section?.section_no || '—'}
                </span>
              ))}
            </div>

            {/* Edit/Delete buttons — appear on row hover */}
            <div className="flex flex-wrap gap-2 xl:ml-auto">
              {rows.map(a => (
                <div key={a.id} className="flex gap-1">
                  <button
                    onClick={() => onEdit(a)}
                    aria-label={`Edit assignment for ${a.section?.section_no}`}
                    className="admin-button px-2.5 py-1.5 text-slate-400 rounded-lg text-xs font-medium transition-all border flex items-center gap-1"
                  >
                    <span>✏</span>
                    <span className="font-mono">{a.section?.section_no}</span>
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    aria-label={`Remove assignment for ${a.section?.section_no}`}
                    className="admin-button admin-button-danger px-2 py-1.5 text-slate-500 rounded-lg text-xs transition-all border"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — InstructorAssignments
//
// State overview:
//   assignments      — all assignments fetched from the backend
//   instructors      — all instructor users (for the picker dropdown)
//   subjects         — all subjects (for the picker dropdown)
//   allSections      — ALL sections (we filter this client-side for ClassCodePicker)
//   loading          — true while the initial 4 fetches are running
//   showCreate       — controls whether the create modal is open
//   editingId        — if set, the edit modal is open for this assignment ID
//   deleteTarget     — assignment waiting for delete confirmation
//   toast            — current notification or null
//   searchTerm       — text in the search box
//   filterInstructor — 'all' or a specific instructor ID
//   filterSubject    — 'all' or a specific subject ID
//   filterSection    — 'all' or a specific section ID
//   formData         — the three fields the modal edits
//
// allSections vs sectionsBySubject:
//   allSections is fetched once and stored here.
//   sectionsBySubject is computed inside AssignmentModal by filtering allSections.
//   This avoids extra API calls when the subject changes in the form.
// ─────────────────────────────────────────────────────────────────────────────
export default function InstructorAssignments() {

  const [assignments,      setAssignments]      = useState([])
  const [instructors,      setInstructors]      = useState([])
  const [subjects,         setSubjects]         = useState([])
  const [allSections,      setAllSections]      = useState([])  // all sections, unfiltered

  const [loading,          setLoading]          = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showCreate,       setShowCreate]       = useState(false)
  const [editingId,        setEditingId]        = useState(null)
  const [deleteTarget,     setDeleteTarget]     = useState(null)
  const [removing,          setRemoving]         = useState(false)
  const [toast,            setToast]            = useState(null)

  const [searchTerm,       setSearchTerm]       = useState('')
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterSubject,    setFilterSubject]    = useState('all')
  const [filterSection,    setFilterSection]    = useState('all')

  // Empty form template — used to reset the modal after it closes
  const EMPTY_FORM = { instructor_id: '', subject_id: '', section_id: '' }
  const [formData, setFormData] = useState(EMPTY_FORM)

  // Shortcut to show a toast notification
  const notify = (message, type = 'success') => setToast({ message, type })


  const fetchAssignments = useCallback(async () => {
    const response = await authFetch(`${API}/api/admin/instructor-assignments`)
    if (!response.ok) throw new Error()
    setAssignments(await response.json())
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const read = async path => {
        const response = await authFetch(`${API}/api/admin/${path}`)
        if (!response.ok) throw new Error()
        return response.json()
      }
      const [instructorList, subjectList, sectionList] = await Promise.all([
        read('users?role=instructor'), read('subjects'), read('sections-list'), fetchAssignments(),
      ])
      setInstructors(instructorList)
      setSubjects(subjectList)
      setAllSections(sectionList)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [fetchAssignments])

  useEffect(() => {
    const timer = setTimeout(loadPage, 0)
    return () => clearTimeout(timer)
  }, [loadPage])

  const refreshAfterSave = async () => {
    try {
      await fetchAssignments()
    } catch {
      setLoadError(true)
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (saving) return
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      notify('Please fill in all three fields', 'warning')
      return
    }
    setSaveError('')
    setSaving(true)
    try {
      const res = await authFetch(`${API}/api/admin/instructor-assignments`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreate(false)
        setFormData(EMPTY_FORM)
        await refreshAfterSave()
        notify('Instructor assigned successfully!')
      } else {
        setSaveError(data.error || 'Failed to assign instructor')
      }
    } catch {
      setSaveError('Network error. Check the connection and try again.')
    } finally {
      setSaving(false)
    }
  }


  // ── Open edit modal pre-filled with existing values ───────────────────────
  const openEdit = (assignment) => {
    setSaveError('')
    setEditingId(assignment.id)
    setFormData({
      instructor_id: assignment.instructor?.id || '',
      subject_id:    assignment.subject?.id    || '',
      section_id:    assignment.section?.id    || '',
    })
  }


  // ── Save edited assignment ────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (saving) return
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      notify('Please fill in all three fields', 'warning')
      return
    }
    setSaveError('')
    setSaving(true)
    try {
      const res = await authFetch(`${API}/api/admin/instructor-assignments/${editingId}`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setEditingId(null)
        setFormData(EMPTY_FORM)
        await refreshAfterSave()
        notify('Assignment updated!')
      } else {
        setSaveError(data.error || 'Could not update the assignment')
      }
    } catch {
      setSaveError('Network error. Check the connection and try again.')
    } finally {
      setSaving(false)
    }
  }


  // ── Delete (runs only after ConfirmDialog is confirmed) ───────────────────
  const handleDelete = async () => {
    if (!deleteTarget || removing) return
    setRemoving(true)
    try {
      const res = await authFetch(`${API}/api/admin/instructor-assignments/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: jsonHeaders,
      })
      if (res.ok) {
        setDeleteTarget(null)
        await refreshAfterSave()
        notify('Assignment removed')
      } else {
        const data = await res.json().catch(() => ({}))
        notify(data.error || 'Delete failed', 'error')
        setDeleteTarget(null)
      }
    } catch {
      notify('Network error — delete failed', 'error')
      setDeleteTarget(null)
    } finally {
      setRemoving(false)
    }
  }


  // ── Manual refresh button ─────────────────────────────────────────────────
  // ── Client-side filtering ─────────────────────────────────────────────────
  // All four conditions must pass for an assignment to appear.
  // Runs on every render — fine because the list is typically < 100 items.
  const filtered = assignments.filter(a => {
    if (filterInstructor !== 'all' && a.instructor?.id != filterInstructor) return false
    if (filterSubject    !== 'all' && a.subject?.id    != filterSubject)    return false
    if (filterSection    !== 'all' && a.section?.id    != filterSection)    return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        (a.instructor?.username || '').toLowerCase().includes(q) ||
        (a.subject?.name        || '').toLowerCase().includes(q) ||
        (a.section?.section_no  || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const hasFilters = searchTerm || filterInstructor !== 'all' || filterSubject !== 'all' || filterSection !== 'all'
  // Reset all filters and the search box back to their defaults
  const clearFilters = () => {
    setSearchTerm('')
    setFilterInstructor('all')
    setFilterSubject('all')
    setFilterSection('all')
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  // Set deduplicates — an instructor with 5 assignments still counts as 1 instructor
  const stats = {
    total:       assignments.length,
    instructors: new Set(assignments.map(a => a.instructor?.id)).size,
    subjects:    new Set(assignments.map(a => a.subject?.id)).size,
    sections:    new Set(assignments.map(a => a.section?.id)).size,
  }

  // ── Group filtered assignments by instructor for the card layout ──────────
  const grouped = filtered.reduce((acc, a) => {
    const key = a.instructor?.id || 'unknown'
    if (!acc[key]) acc[key] = { instructor: a.instructor, items: [] }
    acc[key].items.push(a)
    return acc
  }, {})


  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-600/30 border-t-purple-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading assignments...</p>
      </div>
    )
  }


  // ── RENDER ────────────────────────────────────────────────────────────────
  if (loadError) {
    return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/25 bg-slate-900 p-4 text-sm text-amber-100">
      <span>Instructor assignments could not be loaded.</span>
      <button type="button" className="admin-button px-4" onClick={loadPage}>Retry</button>
    </div>
  }

  return (
    <>
      {/* CSS keyframe animations */}
      <style>{`
        @keyframes slideUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes modalIn  { from { opacity:0; transform:scale(0.96) }      to { opacity:1; transform:scale(1) } }
        @keyframes fadeIn   { from { opacity:0; transform:translateY(6px) }  to { opacity:1; transform:translateY(0) } }
        @keyframes dropIn   { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        /* Stagger the instructor cards so they fade in one after another */
        .card-row { animation: fadeIn 0.25s ease-out both; }
        .card-row:nth-child(1){animation-delay:.04s}
        .card-row:nth-child(2){animation-delay:.08s}
        .card-row:nth-child(3){animation-delay:.12s}
        .card-row:nth-child(4){animation-delay:.16s}
        .card-row:nth-child(5){animation-delay:.20s}
      `}</style>

      <div className="space-y-6">

        {/* Page title + action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Instructor Assignments</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage which instructors teach which subjects in each class code</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={loadPage}
              className="admin-button flex items-center gap-2 px-4 py-2 border rounded-xl text-slate-300 text-sm font-medium transition-all active:scale-95"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>
              Refresh
            </button>
            <button
              onClick={() => { setSaveError(''); setFormData(EMPTY_FORM); setShowCreate(true) }}
              className="admin-button admin-button-primary flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-95"
            >
              <span className="text-base leading-none">＋</span>
              Assign Instructor
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Assignments"  value={stats.total}       color="purple"  icon="📋" />
          <StatCard label="Active Instructors" value={stats.instructors} color="blue"    icon="👨‍🏫" />
          <StatCard label="Subjects Covered"   value={stats.subjects}    color="emerald" icon="📚" />
          <StatCard label="Class Codes Used"   value={stats.sections}    color="amber"   icon="🏷️" />
        </div>

        {/* Filter bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] [&>*]:min-w-0">
            {/* Text search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                aria-label="Search instructor assignments"
                placeholder="Search instructor, subject, or class code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
              />
            </div>

            {/* These filter dropdowns are plain <select> — they're on the main page
                (no overflow:hidden parent) so they don't need the portal trick */}
            <select aria-label="Filter by instructor" value={filterInstructor} onChange={e => setFilterInstructor(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[160px]">
              <option value="all">All Instructors</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name || i.username}</option>)}
            </select>

            <select aria-label="Filter by subject" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[160px]">
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}</option>)}
            </select>

            <select aria-label="Filter by class code" value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[140px]">
              <option value="all">All Class Codes</option>
              {allSections.map(s => <option key={s.id} value={s.id}>{s.section_no}</option>)}
            </select>
          </div>

          {/* Result count + clear link */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Showing <span className="text-white font-semibold">{filtered.length}</span> of{' '}
              <span className="text-white font-semibold">{assignments.length}</span> assignments
            </span>
            {hasFilters && (
              <button onClick={clearFilters} className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Main list of instructor cards */}
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-800/60 rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
            <h3 className="text-white font-semibold mb-2">
              {assignments.length === 0 ? 'No assignments yet' : 'No results match your filters'}
            </h3>
            <p className="text-slate-500 text-sm">
              {assignments.length === 0
                ? 'Click "+ Assign Instructor" to get started'
                : 'Try adjusting your search or filters'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-purple-400 hover:text-purple-300 text-sm transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.values(grouped).map((group, idx) => (
              <InstructorCard
                key={group.instructor?.id || idx}
                group={group}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </div>


      {/* Create modal */}
      {showCreate && (
        <AssignmentModal
          mode="create"
          formData={formData}
          setFormData={setFormData}
          instructors={instructors}
          subjects={subjects}
          allSections={allSections}
          onSubmit={handleCreate}
          saving={saving}
          error={saveError}
          onCancel={() => { setShowCreate(false); setFormData(EMPTY_FORM) }}
        />
      )}

      {/* Edit modal */}
      {editingId && (
        <AssignmentModal
          mode="edit"
          formData={formData}
          setFormData={setFormData}
          instructors={instructors}
          subjects={subjects}
          allSections={allSections}
          onSubmit={handleUpdate}
          saving={saving}
          error={saveError}
          onCancel={() => { setEditingId(null); setFormData(EMPTY_FORM) }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <AdminConfirmDialog
          title="Remove Assignment"
          message={`Remove ${deleteTarget.instructor?.username}'s assignment for ${deleteTarget.section?.section_no}?`}
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={removing}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast notification */}
      <AdminToast toast={toast} onDone={() => setToast(null)} />
    </>
  )
}
