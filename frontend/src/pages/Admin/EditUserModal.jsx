import { useState } from 'react'

export default function EditUserModal({ user, sections = [], onClose, onSave }) {
  const [form, setForm] = useState({
    role: user.role,
    is_active: user.is_active,
    xp: user.xp,
    level: user.level,
  })

  // Pre-populate from existing enrolled sections (user.blocks array from backend)
  const [selectedSectionIds, setSelectedSectionIds] = useState(
    (user.blocks || []).map(b => b.id).filter(Boolean)
  )

  const [sectionSearch, setSectionSearch] = useState('')

  const handleSubmit = e => {
    e.preventDefault()
    onSave({ ...form, section_ids: selectedSectionIds })
  }

  const toggleSection = id => {
    setSelectedSectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredSections = sections.filter(s => {
    const q = sectionSearch.toLowerCase()
    return (
      (s.section_no || '').toLowerCase().includes(q) ||
      (s.subject_name || '').toLowerCase().includes(q) ||
      (s.subject_code || '').toLowerCase().includes(q) ||
      (s.semester || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-purple-600/50 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-600/30 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center font-bold">
              {(user.full_name || user.username)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-300">Manage User</h2>
              <p className="text-slate-400 text-xs">{user.full_name || user.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl transition">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Role */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5 font-semibold uppercase tracking-wider text-xs">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>

          {/* Class Code Assignment (multi-select via checkboxes) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Class Codes
                <span className="text-slate-500 ml-2 normal-case font-normal">
                  ({selectedSectionIds.length} selected)
                </span>
              </label>
              {selectedSectionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSectionIds([])}
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search class code or subject..."
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-white text-sm placeholder-slate-500 focus:border-purple-500 outline-none transition"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            </div>

            {/* Unassigned option */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer transition border-b border-slate-700">
                <input
                  type="checkbox"
                  checked={selectedSectionIds.length === 0}
                  onChange={() => setSelectedSectionIds([])}
                  className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-400 italic">Unassigned</span>
              </label>

              {filteredSections.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">
                  {sectionSearch ? `No results for "${sectionSearch}"` : 'No sections available'}
                </p>
              ) : (
                filteredSections.map(s => {
                  const isChecked = selectedSectionIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-slate-700/50 last:border-0 ${
                        isChecked ? 'bg-purple-900/20' : 'hover:bg-slate-700/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSection(s.id)}
                        className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-purple-300">
                            {s.section_no}
                          </span>
                          {s.subject_code && (
                            <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs font-mono border border-slate-600">
                              {s.subject_code}
                            </span>
                          )}
                        </div>
                        {s.subject_name && (
                          <p className="text-slate-400 text-xs truncate mt-0.5">{s.subject_name}</p>
                        )}
                        {s.semester && (
                          <p className="text-slate-500 text-xs">{s.semester}</p>
                        )}
                      </div>
                      {isChecked && (
                        <span className="text-purple-400 text-xs flex-shrink-0">✓</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            <p className="text-slate-500 text-xs mt-1.5">
              Showing {filteredSections.length} of {sections.length} class codes
              {sectionSearch && (
                <button type="button" onClick={() => setSectionSearch('')} className="text-purple-400 hover:text-purple-300 ml-2 transition">
                  Clear search
                </button>
              )}
            </p>

            {/* Selected pills */}
            {selectedSectionIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSectionIds.map(id => {
                  const sec = sections.find(s => s.id === id)
                  return sec ? (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-lg text-purple-300 text-xs"
                    >
                      <span className="font-mono font-bold">{sec.section_no}</span>
                      <button
                        type="button"
                        onClick={() => toggleSection(id)}
                        className="text-purple-400 hover:text-white ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
          </div>

          {/* XP + Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-semibold uppercase tracking-wider text-xs">XP</label>
              <input
                type="number"
                value={form.xp}
                onChange={e => setForm({ ...form, xp: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5 font-semibold uppercase tracking-wider text-xs">Level</label>
              <input
                type="number"
                value={form.level}
                onChange={e => setForm({ ...form, level: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-5 h-5 accent-purple-600"
            />
            <div>
              <div className="font-bold text-white">Account Active</div>
              <div className="text-xs text-slate-500">Uncheck to suspend this user</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold text-white transition shadow-lg shadow-purple-600/30"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
