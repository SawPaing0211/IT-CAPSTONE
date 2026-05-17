import { useState } from 'react'

// ─── this whole thing pops up when you click "Manage" on a user ───────────────
// props:
//   user     - the user object from the backend (has role, xp, level, blocks, etc.)
//   sections - all available class codes/sections (from /api/admin/sections-list)
//   onClose  - called when X or Cancel is clicked
//   onSave   - called with the updated form data when Save is clicked

export default function EditUserModal({ user, sections = [], onClose, onSave }) {

  // ── form state - pre-filled with current user data ───────────────────────────
  const [form, setForm] = useState({
    role:      user.role,
    is_active: user.is_active,
    xp:        user.xp,
    level:     user.level,
  })

  // which sections this user is already enrolled in
  // user.blocks comes from the backend as the enrolled sections array
  const [selectedSectionIds, setSelectedSectionIds] = useState(
    (user.blocks || []).map(b => b.id).filter(Boolean)
  )

  // just the search box text for filtering the section list
  const [sectionSearch, setSectionSearch] = useState('')

  // ── figure out what type of user we're looking at ────────────────────────────
  // admins don't belong to class codes, so we hide that whole section for them
  const isAdmin      = form.role === 'administrator'
  const isStudent    = form.role === 'student'
  const isInstructor = form.role === 'instructor'

  // ── what shows up in the top badge depending on role ────────────────────────
  const roleMeta = {
    student:       { label: 'Student',       color: 'from-blue-500 to-cyan-500',    dot: 'bg-blue-400'   },
    instructor:    { label: 'Instructor',     color: 'from-violet-500 to-purple-600', dot: 'bg-violet-400' },
    administrator: { label: 'Administrator',  color: 'from-amber-500 to-orange-500', dot: 'bg-amber-400'  },
  }
  const meta = roleMeta[form.role] || roleMeta.student

  // ── save handler - bundles everything into one object for the parent ─────────
  const handleSubmit = e => {
    e.preventDefault()
    // only send section_ids if the user isn't an admin (admins have no sections)
    const payload = { ...form }
    if (!isAdmin) payload.section_ids = selectedSectionIds
    onSave(payload)
  }

  // ── toggle a single section on/off in the selected list ─────────────────────
  const toggleSection = id => {
    setSelectedSectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // ── filter sections based on search text ────────────────────────────────────
  // searches across: section number, subject name, subject code, semester
  const filteredSections = sections.filter(s => {
    const q = sectionSearch.toLowerCase()
    return (
      (s.section_no    || '').toLowerCase().includes(q) ||
      (s.subject_name  || '').toLowerCase().includes(q) ||
      (s.subject_code  || '').toLowerCase().includes(q) ||
      (s.semester      || '').toLowerCase().includes(q)
    )
  })

  // ── display name for the header ──────────────────────────────────────────────
  const displayName = user.full_name || user.username

  return (
    // dark overlay backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      {/* the actual modal box */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* avatar circle with initials */}
            <div className={`w-10 h-10 bg-gradient-to-br ${meta.color} rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
              {displayName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white leading-tight">Manage User</h2>
              <p className="text-slate-400 text-xs truncate max-w-[200px]">{displayName}</p>
            </div>
          </div>

          {/* role pill in the header - updates live as you change the role dropdown */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE FORM BODY ──────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* ── ROLE DROPDOWN ──────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Role
              </label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all cursor-pointer"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>

            {/* ── CLASS CODES - only for students and instructors ─────────── */}
            {/* admins don't belong to any section so just hide this whole block */}
            {!isAdmin && (
              <div>
                {/* section header row with count + clear button */}
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Class Codes
                    <span className="text-slate-600 ml-1.5 normal-case font-normal">
                      ({selectedSectionIds.length} selected)
                    </span>
                  </label>
                  {selectedSectionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectionIds([])}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* search input */}
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    placeholder="Search section or subject..."
                    value={sectionSearch}
                    onChange={e => setSectionSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
                  />
                </div>

                {/* scrollable checkbox list */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden max-h-52 overflow-y-auto">

                  {/* "Unassigned" option - selecting this clears all sections */}
                  <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/40 cursor-pointer transition-colors border-b border-slate-700/50">
                    <input
                      type="checkbox"
                      checked={selectedSectionIds.length === 0}
                      onChange={() => setSelectedSectionIds([])}
                      className="w-4 h-4 rounded border-slate-600 accent-purple-500"
                    />
                    <span className="text-sm text-slate-500 italic">Unassigned</span>
                  </label>

                  {/* no results state */}
                  {filteredSections.length === 0 ? (
                    <p className="text-center text-slate-600 text-sm py-5">
                      {sectionSearch ? `No results for "${sectionSearch}"` : 'No sections available'}
                    </p>
                  ) : (
                    filteredSections.map(s => {
                      const isChecked = selectedSectionIds.includes(s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-slate-700/30 last:border-0 ${
                            isChecked
                              ? 'bg-purple-900/20 hover:bg-purple-900/30'
                              : 'hover:bg-slate-700/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSection(s.id)}
                            className="w-4 h-4 rounded border-slate-600 accent-purple-500 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* section number in monospace - easy to spot */}
                              <span className="font-mono text-sm font-bold text-purple-300">
                                {s.section_no}
                              </span>
                              {/* subject code badge */}
                              {s.subject_code && (
                                <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono border border-slate-600/50">
                                  {s.subject_code}
                                </span>
                              )}
                            </div>
                            {/* subject full name */}
                            {s.subject_name && (
                              <p className="text-slate-400 text-xs truncate mt-0.5">{s.subject_name}</p>
                            )}
                            {/* semester info */}
                            {s.semester && (
                              <p className="text-slate-600 text-xs">{s.semester}</p>
                            )}
                          </div>
                          {/* checkmark indicator when selected */}
                          {isChecked && (
                            <span className="text-purple-400 text-xs flex-shrink-0 font-bold">✓</span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>

                {/* footer: count + clear search link */}
                <p className="text-slate-600 text-xs mt-1.5">
                  Showing {filteredSections.length} of {sections.length} class codes
                  {sectionSearch && (
                    <button
                      type="button"
                      onClick={() => setSectionSearch('')}
                      className="text-purple-400 hover:text-purple-300 ml-2 transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </p>

                {/* selected pills row - shows below the list for easy review */}
                {selectedSectionIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedSectionIds.map(id => {
                      const sec = sections.find(s => s.id === id)
                      return sec ? (
                        <span
                          key={id}
                          className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/15 border border-purple-500/30 rounded-lg text-purple-300 text-xs"
                        >
                          <span className="font-mono font-bold">{sec.section_no}</span>
                          {/* x button removes just this one section */}
                          <button
                            type="button"
                            onClick={() => toggleSection(id)}
                            className="text-purple-400 hover:text-white ml-0.5 transition-colors leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ADMIN INFO BLOCK - shows instead of class codes for admins ─ */}
            {/* just a friendly note explaining why class codes don't show here */}
            {isAdmin && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                <span className="text-lg mt-0.5 flex-shrink-0">🛡️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300">Administrator Account</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Admins manage the whole platform — they're not assigned to class codes or subjects.
                  </p>
                </div>
              </div>
            )}

            {/* ── EMAIL (read-only) ────────────────────────────────────────── */}
            {/* emails come from the school registrar CSV so we can't change them
                the backend also rejects email changes via 403 anyway */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Email
                <span className="ml-2 normal-case font-normal text-slate-600">(read-only)</span>
              </label>
              <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5">
                <span className="text-slate-600 text-sm">✉</span>
                <span className="text-slate-500 text-sm truncate">{user.email}</span>
                <span className="ml-auto text-xs text-slate-700 flex-shrink-0 font-mono">@adamson.edu.ph</span>
              </div>
              <p className="text-slate-700 text-xs mt-1">Emails are assigned by the registrar and cannot be changed.</p>
            </div>

            {/* ── XP + LEVEL ──────────────────────────────────────────────── */}
            {/* these only really matter for students but keeping them for instructors too
                since they technically earn XP from achievements */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  XP
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs pointer-events-none">⚡</span>
                  <input
                    type="number"
                    min="0"
                    value={form.xp}
                    onChange={e => setForm({ ...form, xp: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Level
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs pointer-events-none">★</span>
                  <input
                    type="number"
                    min="1"
                    value={form.level}
                    onChange={e => setForm({ ...form, level: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ── ACTIVE TOGGLE ───────────────────────────────────────────── */}
            {/* unchecking this = suspending the account, they can't log in anymore */}
            <label className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors group">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="sr-only"
                />
                {/* custom toggle pill */}
                <div className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-slate-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${form.is_active ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`}
                       style={{ transform: form.is_active ? 'translateX(22px)' : 'translateX(2px)' }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">Account Active</span>
                  {/* status dot */}
                  <span className={`w-2 h-2 rounded-full ${form.is_active ? 'bg-green-400' : 'bg-slate-500'}`} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {form.is_active ? 'User can log in normally' : 'Account suspended — user cannot log in'}
                </p>
              </div>
            </label>

          </form>
        </div>

        {/* ── ACTION BUTTONS - sticky at the bottom ────────────────────────── */}
        <div className="px-6 pb-5 pt-3 border-t border-slate-800/80 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold text-white text-sm transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  )
}
