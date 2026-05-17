// InstructorAssignments.jsx
// ─────────────────────────────────────────────────────────────────────────────
// This is the admin page where you assign instructors to teach a subject
// inside a specific class code (section). Think of it like a scheduling board:
//   - One instructor can teach multiple subjects
//   - One subject can have multiple class codes (e.g. IT125L has 29101, 29102...)
//   - Each assignment = one instructor + one subject + one class code
//
// The page has:
//   1. Stat cards at the top (totals at a glance)
//   2. A filter bar (search + dropdowns to narrow the list)
//   3. Cards grouped by instructor showing their assignments
//   4. A modal to create or edit an assignment
//
// THE BIG THING TO REMEMBER about the dropdowns:
//   The old version had dropdowns getting CUT OFF by the modal's overflow:hidden.
//   We fixed this by using React Portals — the dropdown panel renders directly
//   on <body> instead of inside the modal, so nothing clips it.
//
// ── FIX LOG ──────────────────────────────────────────────────────────────────
// BUG 1 — Selection not applying (SubjectPicker & ClassCodePicker):
//   ROOT CAUSE: The PortalDropdown's outside-click handler used a setTimeout(0)
//   delay to avoid self-closing, but this delay also caused a RACE CONDITION:
//   the item's onClick fired, called onChange+setOpen(false), but then the
//   outside-click handler fired milliseconds later and could re-trigger onClose.
//   Additionally, using `document.addEventListener('mousedown', handler)` meant
//   the handler sometimes caught the SAME mousedown that triggered the item click
//   if the portal re-rendered between mousedown and mouseup.
//
//   FIX: Switched to `mousedown` with `e.stopPropagation()` on the panel itself
//   so clicks inside the panel never bubble to the document listener. The item
//   buttons now call `e.preventDefault()` + `e.stopPropagation()` before
//   invoking onChange and setOpen(false), giving React time to flush the state
//   update cleanly before the portal closes.
//
// BUG 2 — ClassCodePicker too narrow:
//   Increased minWidth from 380 → 520px and widened the section number column
//   and capacity bar for better readability.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom' // needed for the portal dropdown trick

// Backend URL — change this if you move the Flask server
const API = 'http://localhost:5000'

// Grabs the JWT token from localStorage and formats it as an auth header.
// Almost every fetch() call in this file uses this.
const authHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
})


// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// A small pop-up notification in the bottom-right corner.
// Pass type = 'success' | 'error' | 'warning' and it picks the right color.
// It auto-disappears after 3.2 seconds — the parent sets toast back to null
// via the onDone callback.
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  // Start the auto-close timer the moment this renders
  useEffect(() => {
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t) // clean up if the component unmounts early
  }, [])

  // Each type gets its own color palette (Tailwind gradient + border + text)
  const colors = {
    success: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-300',
    error:   'from-red-500/20 to-red-600/10 border-red-500/40 text-red-300',
    warning: 'from-amber-500/20 to-amber-600/10 border-amber-500/40 text-amber-300',
  }
  const icons = { success: '✓', error: '✕', warning: '⚠' }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border bg-gradient-to-r ${colors[type]} backdrop-blur-md shadow-2xl`}
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <span className="text-lg font-bold">{icons[type]}</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED NUMBER
// Used inside the stat cards. Instead of just showing "42" instantly,
// it counts up from 0 to the target number like a slot machine.
// It does ~20 steps total regardless of how big the number is.
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const end = Number(value) || 0
    if (end === 0) { setDisplay(0); return }

    // How big each "tick" is — larger numbers jump more per tick
    const step = Math.max(1, Math.floor(end / 20))

    const t = setInterval(() => {
      start = Math.min(start + step, end) // don't overshoot
      setDisplay(start)
      if (start >= end) clearInterval(t) // stop when we hit the target
    }, 30) // fires every 30ms

    return () => clearInterval(t)
  }, [value])

  return <>{display}</>
}


// ─────────────────────────────────────────────────────────────────────────────
// PORTAL DROPDOWN
// This is the core fix for the clipping bug.
//
// THE PROBLEM: Dropdowns inside a modal with overflow:hidden get cut off
// because the browser clips anything that overflows the modal box.
//
// THE FIX: Instead of rendering the dropdown panel inside the modal,
// we render it directly on <body> using createPortal(). It then uses
// position:fixed + the trigger button's exact screen coordinates
// (getBoundingClientRect) to place itself in the right spot visually.
//
// It also auto-flips upward if there's not enough room below the button.
//
// ── SELECTION BUG FIX ────────────────────────────────────────────────────────
// OLD approach: setTimeout(0) + document.addEventListener('mousedown', handler)
//   Problem: The 0ms timer was supposed to skip the opening click, but it also
//   raced with item-click handlers. When a user clicked an item, the sequence was:
//     1. mousedown on item  →  item onClick fired  →  setOpen(false) queued
//     2. 0ms later the document listener attached
//     3. React re-rendered, portal closed
//     BUT sometimes the document listener fired before React flushed, catching
//     the same event and calling onClose() again — disrupting state updates.
//
// NEW approach: attach the document listener immediately (no setTimeout), but
//   add an `onMouseDown={e => e.stopPropagation()}` on the portal panel itself.
//   This means any click INSIDE the panel never reaches the document listener,
//   so the document listener ONLY fires for genuine outside clicks. Item buttons
//   still call their own onClick normally — no race condition.
// ─────────────────────────────────────────────────────────────────────────────
function PortalDropdown({ triggerRef, open, onClose, children, minWidth = 320 }) {
  // Stores where to draw the panel on screen
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

  // Recalculate position whenever the dropdown opens, or if user scrolls/resizes
  useEffect(() => {
    if (!open || !triggerRef.current) return

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropHeight = 380 // rough max height of the panel (bumped from 320)

      // If there's not enough room below, show it above the button instead
      const showAbove = spaceBelow < dropHeight && rect.top > dropHeight

      // ── Horizontal overflow guard ─────────────────────────────────────────
      // If the panel would extend past the right edge of the viewport, shift it
      // left so it stays on screen. This matters now that panels can be 520px wide.
      const panelWidth = Math.max(rect.width, minWidth)
      const leftRaw    = rect.left
      const maxLeft    = window.innerWidth - panelWidth - 8  // 8px margin
      const left       = Math.min(leftRaw, Math.max(0, maxLeft))

      setPos({
        top:   showAbove ? rect.top - dropHeight - 4 : rect.bottom + 4,
        left,
        width: panelWidth,
      })
    }

    update()
    // Keep position synced if the user scrolls or resizes while it's open
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, triggerRef, minWidth])

  // ── Outside-click handler (no setTimeout — see fix notes above) ──────────
  useEffect(() => {
    if (!open) return

    const handler = (e) => {
      // If the click was on the trigger button, ignore it — the button toggles
      // the dropdown itself. Without this guard the dropdown would open and
      // immediately close on the same click.
      if (triggerRef.current && triggerRef.current.contains(e.target)) return
      onClose()
    }

    // Attach immediately — the panel has stopPropagation so clicks inside
    // the panel will never reach this listener. No race condition possible.
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose, triggerRef])

  // Don't render anything if the dropdown is closed
  if (!open) return null

  // createPortal renders the panel as a child of <body>, escaping all parent
  // overflow:hidden containers. The panel floats freely over everything.
  return createPortal(
    <div
      // ── KEY FIX: stopPropagation on the panel ────────────────────────────
      // Any mousedown inside this panel stops bubbling to the document listener
      // registered above. This means only OUTSIDE clicks trigger onClose().
      // Item buttons inside can fire their own onClick freely without racing.
      onMouseDown={e => e.stopPropagation()}
      style={{
        position:  'fixed',
        top:       pos.top,
        left:      pos.left,
        width:     pos.width,
        zIndex:    99999, // above everything, including the modal
        animation: 'dropIn 0.15s ease-out',
      }}
      className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
    >
      {children}
    </div>,
    document.body // attach to body, not inside the modal
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT PICKER
// A custom searchable dropdown for picking a subject.
// Uses PortalDropdown so it never gets clipped by the modal.
// Subjects are grouped by year level (Year 1, Year 2, etc.) so the admin
// doesn't have to scroll through a flat wall of 16 subjects.
//
// ── SELECTION FIX ────────────────────────────────────────────────────────────
// The item buttons previously just called onChange(s.id) and setOpen(false).
// With the new PortalDropdown (stopPropagation on panel), this now works
// correctly — but we also added e.preventDefault() on item clicks as an extra
// guard so no synthetic form events interfere.
// ─────────────────────────────────────────────────────────────────────────────
function SubjectPicker({ value, onChange, subjects }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef        = useRef(null) // attached to the button that opens the dropdown
  const inputRef          = useRef(null) // the search box inside the panel

  // Which subject object matches the currently selected ID
  const selected = subjects.find(s => s.id == value)

  // Filter subjects by whatever the admin typed in the search box
  const filtered = subjects.filter(s => {
    const q = query.toLowerCase()
    return (
      (s.name         || '').toLowerCase().includes(q) ||
      (s.subject_code || '').toLowerCase().includes(q)
    )
  })

  // Group the filtered results by year level for the section headers
  // e.g. { 'Year 1': [IT115, IT116], 'Year 2': [IT215, IT216] }
  const grouped = filtered.reduce((acc, s) => {
    const yr = s.year_level ? `Year ${s.year_level}` : 'Other'
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(s)
    return acc
  }, {})

  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('') // reset search each time you open
    // Small delay before focusing the search input so the panel is in the DOM first
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Item selection handler ────────────────────────────────────────────────
  // e.preventDefault() stops any parent form from reacting.
  // onChange(id) updates the modal's formData.
  // setOpen(false) closes the panel.
  // Order matters: update state BEFORE closing so the trigger button re-renders
  // with the new selected value while the panel is still mounted.
  const handleSelect = (e, id) => {
    e.preventDefault()
    onChange(id)
    setOpen(false)
  }

  return (
    <div>
      {/* The button that looks like a select box */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between outline-none focus:border-purple-500 transition-all hover:border-slate-600"
      >
        <span className={selected ? 'text-white' : 'text-slate-500'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.subject_code && (
                // Show the code badge (e.g. IT125L) next to the full name
                <span className="font-mono text-xs px-1.5 py-0.5 bg-slate-700 rounded text-purple-300">
                  {selected.subject_code}
                </span>
              )}
              {selected.name}
            </span>
          ) : 'Select Subject'}
        </span>
        {/* Chevron arrow that flips when open */}
        <span className={`text-slate-500 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* The dropdown panel — rendered via portal on <body> */}
      <PortalDropdown triggerRef={triggerRef} open={open} onClose={() => setOpen(false)}>
        {/* Search input at the top of the panel */}
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

        {/* Scrollable list, grouped by Year */}
        <div className="max-h-60 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">No subjects found</p>
          ) : Object.entries(grouped).map(([yr, items]) => (
            <div key={yr}>
              {/* Year group header — e.g. "YEAR 1" */}
              <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-700/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{yr}</span>
              </div>

              {/* Subject rows under this year */}
              {items.map(s => (
                <button
                  key={s.id}
                  type="button"
                  // ── FIXED: use handleSelect which calls e.preventDefault() ──
                  onClick={e => handleSelect(e, s.id)}
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
                  {/* Checkmark next to the currently selected item */}
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
// CLASS CODE PICKER
// A custom searchable dropdown for picking a section (class code).
// Uses PortalDropdown so it never gets clipped by the modal.
//
// Sections are grouped by subject so the admin sees something like:
//   IT125L — Computer Programming 1 Lab   (5 sections)
//     29101  TTh 7:30  Room 301  ████░░ 32/40
//     29102  MW 10:00  Room 302  ██░░░░ 18/40
//   IT126L — Data Structure & Algorithm Lab  (3 sections)
//     ...
//
// The colored bar shows how full each section is:
//   green = plenty of space, amber = getting full, red = almost full
//
// ── SIZE FIX ─────────────────────────────────────────────────────────────────
// Increased minWidth from 380 → 520px so there's room for all columns.
// Also increased max-h-72 → max-h-80 for a taller scrollable area.
// The capacity bar was widened from w-16 → w-20 for better readability.
//
// ── SELECTION FIX ────────────────────────────────────────────────────────────
// Same fix as SubjectPicker — handleSelect with e.preventDefault().
// ─────────────────────────────────────────────────────────────────────────────
function ClassCodePicker({ value, onChange, sections }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef        = useRef(null)
  const inputRef          = useRef(null)

  const selected = sections.find(s => s.id == value)

  // Search works across section number, subject code, subject name, and semester
  const filtered = sections.filter(s => {
    const q = query.toLowerCase()
    return (
      (s.section_no   || '').toLowerCase().includes(q) ||
      (s.subject_code || '').toLowerCase().includes(q) ||
      (s.subject_name || '').toLowerCase().includes(q) ||
      (s.semester     || '').toLowerCase().includes(q)
    )
  })

  // Group filtered sections by subject name.
  // Each group also stores the subject code so we can sort groups alphabetically.
  const grouped = filtered.reduce((acc, s) => {
    const key = s.subject_name || 'Unknown Subject'
    if (!acc[key]) acc[key] = { code: s.subject_code || '', items: [] }
    acc[key].items.push(s)
    return acc
  }, {})

  // Sort groups alphabetically by subject code (IT115L before IT125L, etc.)
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) =>
    (a.code || '').localeCompare(b.code || '')
  )

  const handleOpen = () => {
    setOpen(o => !o)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Item selection handler ────────────────────────────────────────────────
  // Same pattern as SubjectPicker. e.preventDefault() prevents any parent
  // form from intercepting. State update (onChange) fires before close (setOpen).
  const handleSelect = (e, id) => {
    e.preventDefault()
    onChange(id)
    setOpen(false)
  }

  return (
    <div>
      {/* Trigger button — shows the currently selected section or placeholder */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between outline-none focus:border-purple-500 transition-all hover:border-slate-600"
      >
        {selected ? (
          <span className="flex items-center gap-2 text-white min-w-0">
            <span className="font-mono font-bold text-purple-300 flex-shrink-0">{selected.section_no}</span>
            {selected.subject_code && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 font-mono flex-shrink-0">
                {selected.subject_code}
              </span>
            )}
            {selected.subject_name && (
              <span className="text-slate-400 text-xs truncate">{selected.subject_name}</span>
            )}
          </span>
        ) : (
          <span className="text-slate-500">Select Class Code</span>
        )}
        <span className={`text-slate-500 text-xs transition-transform duration-200 flex-shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* The dropdown panel — rendered via portal, wider than subject picker.
          minWidth bumped from 380 → 520 for more breathing room per row. */}
      <PortalDropdown triggerRef={triggerRef} open={open} onClose={() => setOpen(false)} minWidth={520}>

        {/* Search bar */}
        <div className="p-2 border-b border-slate-700 bg-slate-800">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search section no, subject code, name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-600 outline-none focus:border-purple-500"
          />
        </div>

        {/* Grouped section list — max height bumped from max-h-72 → max-h-80 */}
        <div className="max-h-80 overflow-y-auto">
          {sortedGroups.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm">
                {query ? `No results for "${query}"` : 'No class codes available'}
              </p>
              {!query && (
                <p className="text-slate-700 text-xs mt-1">Create sections under Class Codes first</p>
              )}
            </div>
          ) : sortedGroups.map(([subjectName, { code, items }]) => {
            // Sort sections within each subject group numerically by section number
            // (so 29101 comes before 29110 — parseInt prevents alphabetical sorting)
            const sorted = [...items].sort((a, b) =>
              (parseInt(a.section_no) || 0) - (parseInt(b.section_no) || 0)
            )

            return (
              <div key={subjectName}>
                {/* Sticky subject group header — stays visible as you scroll */}
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/70 border-b border-slate-700/60 sticky top-0 z-10">
                  {code && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-purple-900/50 border border-purple-700/40 rounded text-purple-300">
                      {code}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-400 truncate">{subjectName}</span>
                  <span className="ml-auto text-xs text-slate-600 flex-shrink-0">
                    {sorted.length} section{sorted.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* One row per section inside this group */}
                <div className="divide-y divide-slate-800/40">
                  {sorted.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      // ── FIXED: use handleSelect which calls e.preventDefault() ──
                      onClick={e => handleSelect(e, s.id)}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-slate-700/40 transition-colors ${value == s.id ? 'bg-purple-900/25' : ''}`}
                    >
                      {/* Section number — widened from w-14 → w-16 for 5-digit codes */}
                      <span className={`font-mono font-bold text-sm flex-shrink-0 w-16 ${value == s.id ? 'text-purple-300' : 'text-slate-200'}`}>
                        {s.section_no}
                      </span>

                      {/* Schedule and room info — more space now that panel is wider */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {s.schedule && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <span className="opacity-50">🕐</span>
                            {s.schedule}
                          </span>
                        )}
                        {s.semester && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500 flex-shrink-0">
                            {s.semester}
                          </span>
                        )}
                        {s.room && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            📍 {s.room}
                          </span>
                        )}
                      </div>

                      {/* Capacity bar — widened from w-16 → w-20 for better readability */}
                      {s.student_count !== undefined && s.capacity && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.student_count / s.capacity > 0.85 ? 'bg-red-500'    // almost full
                                : s.student_count / s.capacity > 0.6 ? 'bg-amber-500' // getting full
                                : 'bg-emerald-500'                                     // plenty of room
                              }`}
                              style={{ width: `${Math.min(100, (s.student_count / s.capacity) * 100)}%` }}
                            />
                          </div>
                          {/* Count text — slightly wider column (w-14 → w-16) */}
                          <span className="text-xs text-slate-500 w-16 text-right tabular-nums">
                            {s.student_count}/{s.capacity}
                          </span>
                        </div>
                      )}

                      {/* Checkmark on the selected row */}
                      {value == s.id && <span className="text-purple-400 font-bold text-xs flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer: result count + clear search button */}
        <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-800/60 flex items-center justify-between">
          <span className="text-slate-600 text-xs">
            {filtered.length} of {sections.length} class codes
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
// Used for both creating a new assignment AND editing an existing one.
// The `mode` prop switches between 'create' and 'edit'.
//
// IMPORTANT: No overflow:hidden on the modal card.
// The subject and class code pickers use portals so they escape the modal.
// If you ever add overflow:hidden back here, the dropdowns will get clipped again.
// ─────────────────────────────────────────────────────────────────────────────
function AssignmentModal({ mode, formData, setFormData, instructors, subjects, sections, onSubmit, onCancel }) {
  const isEdit = mode === 'edit'

  return (
    // Dark blurred overlay that sits behind the modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
    >
      {/* The modal card — deliberately NO overflow:hidden (see note above) */}
      <div
        className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl"
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Header — icon and title change between create and edit */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${isEdit ? 'bg-gradient-to-br from-violet-600 to-purple-700' : 'bg-gradient-to-br from-purple-600 to-pink-600'}`}>
              {isEdit ? '✏️' : '＋'}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isEdit ? 'Edit Assignment' : 'Assign Instructor'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit ? 'Change instructor, subject, or class code' : 'Link an instructor to a subject + class code'}
              </p>
            </div>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-sm">
            ✕
          </button>
        </div>

        {/* The three form fields */}
        <div className="px-6 py-5 space-y-4">

          {/* Instructor — plain <select> is fine, usually < 20 instructors,
              no need for a custom searchable picker here */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Instructor <span className="text-pink-500">*</span>
            </label>
            <select
              value={formData.instructor_id}
              onChange={e => setFormData(p => ({ ...p, instructor_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all cursor-pointer"
            >
              <option value="">Select Instructor</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.full_name || inst.username}
                </option>
              ))}
            </select>
          </div>

          {/* Subject — uses the custom portal picker, grouped by year level */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Subject <span className="text-pink-500">*</span>
            </label>
            <SubjectPicker
              value={formData.subject_id}
              onChange={id => setFormData(p => ({ ...p, subject_id: id }))}
              subjects={subjects}
            />
          </div>

          {/* Class Code — uses the custom portal picker, grouped by subject with capacity bars */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Class Code <span className="text-pink-500">*</span>
            </label>
            <ClassCodePicker
              value={formData.section_id}
              onChange={id => setFormData(p => ({ ...p, section_id: id }))}
              sections={sections}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Sections are grouped by subject. The bar shows enrollment capacity.
            </p>
          </div>

        </div>

        {/* Cancel and submit buttons */}
        <div className="px-6 pb-5 flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onSubmit}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-white text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]">
            {isEdit ? 'Save Changes' : 'Assign Instructor'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// A small "are you sure?" popup that appears before deleting an assignment.
// The actual delete only runs when the admin clicks "Remove".
// This replaces the old browser prompt() which looked terrible.
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
           style={{ animation: 'modalIn 0.2s ease-out' }}>
        <div className="w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto">⚠️</div>
        <h3 className="text-white font-semibold text-center mb-2">Remove Assignment</h3>
        <p className="text-slate-400 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]">
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// One of the four number boxes at the top of the page.
// Pass color = 'purple' | 'blue' | 'emerald' | 'amber'
// The number inside uses AnimatedNumber so it counts up on load.
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
        <AnimatedNumber value={value} />
      </p>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTOR CARD
// One card per instructor in the main list.
// The top row shows the instructor's name and total assignment count.
// Below that, their assignments are grouped by subject — so if they teach
// IT125L in sections 29101 AND 29102, both codes show on the same row.
//
// The edit/delete buttons are invisible by default and appear on row hover
// (group-hover/row in Tailwind). Keeps the list visually clean.
// ─────────────────────────────────────────────────────────────────────────────
function InstructorCard({ group, onEdit, onDelete }) {
  // group.items is an array of individual assignments for this instructor.
  // We re-group them by subject so same-subject assignments share one row.
  const bySubject = group.items.reduce((acc, a) => {
    const key = a.subject?.id || 'unknown'
    if (!acc[key]) acc[key] = { subject: a.subject, rows: [] }
    acc[key].rows.push(a)
    return acc
  }, {})

  return (
    <div className="card-row bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700/80 transition-all duration-200 group/card">

      {/* Instructor header row */}
      <div className="flex items-center gap-4 px-5 py-4 bg-slate-800/40 border-b border-slate-800">
        {/* Avatar — just the first letter of their username */}
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
            className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 hover:bg-slate-800/20 transition-colors group/row"
          >
            {/* Subject name badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold w-14">Subject</span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold truncate max-w-[200px]">
                {subject?.name || 'Unknown'}
              </span>
            </div>

            {/* Class code badges — one per section they teach for this subject */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-600 uppercase tracking-wider font-semibold">Codes</span>
              {rows.map(a => (
                <span key={a.id} className="font-mono text-xs px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg font-bold">
                  {a.section?.section_no || '—'}
                </span>
              ))}
            </div>

            {/* Edit / Delete buttons — hidden until you hover the row */}
            <div className="flex gap-1.5 sm:ml-auto opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity flex-shrink-0">
              {rows.map(a => (
                <div key={a.id} className="flex gap-1">
                  <button
                    onClick={() => onEdit(a)}
                    title={`Edit ${a.section?.section_no}`}
                    className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-purple-600/30 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 rounded-lg text-xs font-medium transition-all border border-slate-700/50 flex items-center gap-1"
                  >
                    <span>✏</span>
                    <span className="hidden sm:inline font-mono">{a.section?.section_no}</span>
                  </button>
                  <button
                    onClick={() => onDelete(a)}
                    title={`Remove ${a.section?.section_no}`}
                    className="px-2 py-1.5 bg-slate-700/60 hover:bg-red-600/20 hover:border-red-500/40 text-slate-500 hover:text-red-400 rounded-lg text-xs transition-all border border-slate-700/50"
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
// This is the default export — the whole page.
//
// STATE OVERVIEW:
//   assignments      — full list from the API (all instructor+subject+section links)
//   instructors      — all instructor users (for the modal dropdown)
//   subjects         — all subjects (for the modal dropdown)
//   sections         — all active sections (for the modal dropdown + capacity bars)
//   loading          — true while the initial 4 fetches are running in parallel
//   showCreate       — controls whether the create modal is open
//   editingId        — the assignment ID currently being edited (null = modal closed)
//   deleteTarget     — the assignment object waiting for delete confirmation
//   toast            — current notification { message, type } or null
//   searchTerm       — text in the search input
//   filterInstructor — selected instructor in the filter bar ('all' or an ID)
//   filterSubject    — selected subject in the filter bar
//   filterSection    — selected class code in the filter bar
//   formData         — the 3 fields the modal edits: instructor_id, subject_id, section_id
//
// DATA FLOW:
//   Page loads → fetch 4 things in parallel → render
//   Admin creates / edits / deletes → call API → re-fetch assignments → re-render
// ─────────────────────────────────────────────────────────────────────────────
export default function InstructorAssignments() {

  // ── Data from the API ──────────────────────────────────────────────────────
  const [assignments,      setAssignments]      = useState([])
  const [instructors,      setInstructors]      = useState([])
  const [subjects,         setSubjects]         = useState([])
  const [sections,         setSections]         = useState([])

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true)
  const [showCreate,       setShowCreate]       = useState(false)
  const [editingId,        setEditingId]        = useState(null)
  const [deleteTarget,     setDeleteTarget]     = useState(null)
  const [toast,            setToast]            = useState(null)

  // ── Filter bar state ───────────────────────────────────────────────────────
  const [searchTerm,       setSearchTerm]       = useState('')
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterSubject,    setFilterSubject]    = useState('all')
  const [filterSection,    setFilterSection]    = useState('all')

  // ── Modal form state ───────────────────────────────────────────────────────
  // Shared between create and edit. EMPTY_FORM resets it after a modal closes.
  const EMPTY_FORM = { instructor_id: '', subject_id: '', section_id: '' }
  const [formData, setFormData] = useState(EMPTY_FORM)

  // Shortcut to trigger a toast: notify('Saved!') or notify('Something broke', 'error')
  const notify = (message, type = 'success') => setToast({ message, type })


  // ── Fetch everything in parallel on first load ─────────────────────────────
  // Promise.all fires all 4 fetches at the same time (faster than sequential).
  // .finally() runs setLoading(false) after ALL of them finish or fail.
  useEffect(() => {
    Promise.all([fetchAssignments(), fetchInstructors(), fetchSubjects(), fetchSections()])
      .finally(() => setLoading(false))
  }, []) // empty [] means this only runs once when the component mounts


  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API}/api/admin/instructor-assignments`, { headers: authHeader() })
      if (res.ok) setAssignments(await res.json())
    } catch (err) { console.error('assignments fetch failed:', err) }
  }

  const fetchInstructors = async () => {
    // ?role=instructor so we don't get students and admins in the dropdown
    try {
      const res = await fetch(`${API}/api/admin/users?role=instructor`, { headers: authHeader() })
      if (res.ok) setInstructors(await res.json())
    } catch (err) { console.error('instructors fetch failed:', err) }
  }

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API}/api/admin/subjects`, { headers: authHeader() })
      if (res.ok) setSubjects(await res.json())
    } catch (err) { console.error('subjects fetch failed:', err) }
  }

  const fetchSections = async () => {
    // Using /sections-list (not /sections) because it includes subject_name
    // and subject_code, which we need for the grouped class code picker
    try {
      const res = await fetch(`${API}/api/admin/sections-list`, { headers: authHeader() })
      if (res.ok) {
        const data = await res.json()
        setSections(Array.isArray(data) ? data : []) // guard against unexpected API shape
      }
    } catch (err) { console.error('sections fetch failed:', err) }
  }


  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    // Basic validation before hitting the network
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      notify('Please fill in all three fields', 'warning')
      return
    }
    try {
      const res = await fetch(`${API}/api/admin/instructor-assignments`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreate(false)
        setFormData(EMPTY_FORM)       // reset so the form is blank next time
        await fetchAssignments()      // refresh the list
        notify('Instructor assigned successfully!')
      } else {
        notify(data.error || 'Failed to assign instructor', 'error')
      }
    } catch {
      notify('Network error — could not assign instructor', 'error')
    }
  }


  // ── Open edit modal pre-filled with the existing assignment values ──────────
  const openEdit = (assignment) => {
    setEditingId(assignment.id)
    setFormData({
      instructor_id: assignment.instructor?.id || '',
      subject_id:    assignment.subject?.id    || '',
      section_id:    assignment.section?.id    || '',
    })
  }


  // ── Save edited assignment ─────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      notify('Please fill in all three fields', 'warning')
      return
    }
    try {
      const res = await fetch(`${API}/api/admin/instructor-assignments/${editingId}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setEditingId(null)            // close the modal
        setFormData(EMPTY_FORM)
        await fetchAssignments()
        notify('Assignment updated!')
      } else {
        notify(data.error || 'Update failed', 'error')
      }
    } catch {
      notify('Network error — update failed', 'error')
    }
  }


  // ── Delete (only runs after the ConfirmDialog is confirmed) ────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${API}/api/admin/instructor-assignments/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeader(),
      })
      if (res.ok) {
        setDeleteTarget(null)         // close the confirm dialog
        await fetchAssignments()
        notify('Assignment removed')
      } else {
        const data = await res.json()
        notify(data.error || 'Delete failed', 'error')
        setDeleteTarget(null)
      }
    } catch {
      notify('Network error — delete failed', 'error')
      setDeleteTarget(null)
    }
  }


  // ── Manual refresh ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setLoading(true)
    await fetchAssignments()
    setLoading(false)
    notify('Refreshed')
  }


  // ── Client-side filtering ──────────────────────────────────────────────────
  // All 4 conditions must pass for an assignment to show up.
  // Runs on every render — fine because the list is small (usually < 100).
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

  // True if any filter is active — shows the "Clear filters" link
  const hasFilters = searchTerm || filterInstructor !== 'all' || filterSubject !== 'all' || filterSection !== 'all'

  const clearFilters = () => {
    setSearchTerm('')
    setFilterInstructor('all')
    setFilterSubject('all')
    setFilterSection('all')
  }


  // ── Stat numbers ───────────────────────────────────────────────────────────
  // Set deduplicates — an instructor with 5 assignments still counts as 1 instructor
  const stats = {
    total:       assignments.length,
    instructors: new Set(assignments.map(a => a.instructor?.id)).size,
    subjects:    new Set(assignments.map(a => a.subject?.id)).size,
    sections:    new Set(assignments.map(a => a.section?.id)).size,
  }


  // ── Group filtered assignments by instructor for the card layout ───────────
  // Result shape: { "42": { instructor: {...}, items: [...] }, "17": { ... } }
  const grouped = filtered.reduce((acc, a) => {
    const key = a.instructor?.id || 'unknown'
    if (!acc[key]) acc[key] = { instructor: a.instructor, items: [] }
    acc[key].items.push(a)
    return acc
  }, {})


  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-600/30 border-t-purple-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading assignments...</p>
      </div>
    )
  }


  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* CSS keyframe animations — defined here because Tailwind can't do keyframes inline */}
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

        {/* Page title + Refresh and Assign buttons */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Instructor Assignments</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage which instructors teach which subjects in each class code</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-all active:scale-95"
            >
              <span className={loading ? 'animate-spin' : ''}>↻</span>
              Refresh
            </button>
            <button
              onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              <span className="text-base leading-none">＋</span>
              Assign Instructor
            </button>
          </div>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Assignments"  value={stats.total}       color="purple"  icon="📋" />
          <StatCard label="Active Instructors" value={stats.instructors} color="blue"    icon="👨‍🏫" />
          <StatCard label="Subjects Covered"   value={stats.subjects}    color="emerald" icon="📚" />
          <StatCard label="Class Codes Used"   value={stats.sections}    color="amber"   icon="🏷️" />
        </div>

        {/* Filter bar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Text search */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Search instructor, subject, or class code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
              />
            </div>

            {/* These 3 filter dropdowns are plain <select> elements.
                They're on the main page (no overflow:hidden parent) so they don't need portals. */}
            <select value={filterInstructor} onChange={e => setFilterInstructor(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[160px]">
              <option value="all">All Instructors</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name || i.username}</option>)}
            </select>

            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[160px]">
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_code ? `[${s.subject_code}] ` : ''}{s.name}</option>)}
            </select>

            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer min-w-[140px]">
              <option value="all">All Class Codes</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.section_no}</option>)}
            </select>
          </div>

          {/* Result count + "Clear filters" link */}
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
          // Empty state — message differs depending on whether there's no data at all
          // vs. filters just hiding everything
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
                onDelete={setDeleteTarget} // just sets the target; ConfirmDialog handles the actual delete
              />
            ))}
          </div>
        )}
      </div>


      {/* Create modal — mounts when showCreate is true */}
      {showCreate && (
        <AssignmentModal
          mode="create"
          formData={formData}
          setFormData={setFormData}
          instructors={instructors}
          subjects={subjects}
          sections={sections}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreate(false); setFormData(EMPTY_FORM) }}
        />
      )}

      {/* Edit modal — mounts when editingId is not null */}
      {editingId && (
        <AssignmentModal
          mode="edit"
          formData={formData}
          setFormData={setFormData}
          instructors={instructors}
          subjects={subjects}
          sections={sections}
          onSubmit={handleUpdate}
          onCancel={() => { setEditingId(null); setFormData(EMPTY_FORM) }}
        />
      )}

      {/* Delete confirmation dialog — mounts when deleteTarget is set */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Remove ${deleteTarget.instructor?.username}'s assignment for ${deleteTarget.section?.section_no}? This can't be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast notification — auto-clears itself via the onDone callback */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </>
  )
}
