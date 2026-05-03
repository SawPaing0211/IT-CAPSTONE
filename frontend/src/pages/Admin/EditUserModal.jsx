import { useState } from 'react'

export default function EditUserModal({ user, blocks, onClose, onSave }) {
  const [form, setForm] = useState({
    role: user.role,
    is_active: user.is_active,
    xp: user.xp,
    level: user.level
  })
  
  // ✅ Multi-block support
  const [selectedBlockIds, setSelectedBlockIds] = useState(
    user.block_id ? [user.block_id] : []
  )
  
  // ✅ Search filter for blocks
  const [blockSearch, setBlockSearch] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      block_ids: selectedBlockIds
    }
    onSave(payload)
  }

  // ✅ Filter blocks based on search
  const filteredBlocks = blocks.filter(block => {
    const searchLower = blockSearch.toLowerCase()
    return (
      block.section_code.toLowerCase().includes(searchLower) ||
      block.name.toLowerCase().includes(searchLower) ||
      (block.semester && block.semester.toLowerCase().includes(searchLower))
    )
  })

  // ✅ Group blocks by section code for better organization
  const groupedBlocks = filteredBlocks.reduce((groups, block) => {
    const code = block.section_code
    if (!groups[code]) {
      groups[code] = []
    }
    groups[code].push(block)
    return groups
  }, {})

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-purple-600/50 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-purple-300">Manage User: {user.username}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm text-slate-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Assign to Blocks (Select Multiple)
              <span className="text-xs text-slate-500 ml-2">
                ({selectedBlockIds.length} selected)
              </span>
            </label>
            
            {/* ✅ Search Input */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="🔍 Search block code (e.g., 101)..."
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>

            {/* ✅ Blocks List with Grouping */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto space-y-3">
              {/* Unassigned Option */}
              <label className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                <input
                  type="checkbox"
                  value=""
                  checked={selectedBlockIds.length === 0}
                  onChange={() => setSelectedBlockIds([])}
                  className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-slate-400">Unassigned</span>
              </label>

              {/* Grouped Blocks */}
              {Object.keys(groupedBlocks).length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-4">
                  No blocks found matching "{blockSearch}"
                </p>
              ) : (
                Object.entries(groupedBlocks).map(([sectionCode, sectionBlocks]) => (
                  <div key={sectionCode} className="space-y-2">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-700/50 rounded">
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                        Section {sectionCode}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({sectionBlocks.length} {sectionBlocks.length === 1 ? 'class' : 'classes'})
                      </span>
                    </div>

                    {/* Block Checkboxes */}
                    <div className="space-y-1 pl-2">
                      {sectionBlocks.map(block => (
                        <label key={block.id} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            value={block.id}
                            checked={selectedBlockIds.includes(block.id)}
                            onChange={(e) => {
                              const id = parseInt(e.target.value)
                              if (e.target.checked) {
                                setSelectedBlockIds([...selectedBlockIds, id])
                              } else {
                                setSelectedBlockIds(selectedBlockIds.filter(bId => bId !== id))
                              }
                            }}
                            className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">
                              {block.name}
                            </div>
                            {block.semester && (
                              <div className="text-xs text-slate-400">
                                {block.semester}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
              <span>Showing {filteredBlocks.length} of {blocks.length} blocks</span>
              {blockSearch && (
                <button
                  type="button"
                  onClick={() => setBlockSearch('')}
                  className="text-purple-400 hover:text-purple-300"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">XP</label>
              <input
                type="number"
                value={form.xp}
                onChange={e => setForm({...form, xp: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Level</label>
              <input
                type="number"
                value={form.level}
                onChange={e => setForm({...form, level: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({...form, is_active: e.target.checked})}
              className="w-5 h-5 accent-purple-600"
            />
            <div>
              <div className="font-bold text-white">Account Active</div>
              <div className="text-xs text-slate-500">Uncheck to suspend user</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded font-bold text-white"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}