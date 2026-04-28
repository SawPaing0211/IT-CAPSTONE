import { useState } from 'react'

export default function EditUserModal({ user, blocks, onClose, onSave }) {
  const [form, setForm] = useState({
    role: user.role,
    is_active: user.is_active,
    xp: user.xp,
    level: user.level,
    block_id: user.block_id || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      block_id: form.block_id === '' ? null : parseInt(form.block_id),
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-purple-600/50 p-6 rounded-2xl w-full max-w-md shadow-2xl">
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
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Assign to Block</label>
            <select
              value={form.block_id}
              onChange={e => setForm({...form, block_id: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
            >
              <option value="">Unassigned</option>
              {blocks.map(b => (
                <option key={b.id} value={b.id}>{b.section_code} - {b.name}</option>
              ))}
            </select>
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
              <div className="text-xs text-slate-400">Uncheck to suspend user</div>
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