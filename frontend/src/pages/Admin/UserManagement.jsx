import { useState, useEffect } from 'react'
import EditUserModal from './EditUserModal'
import RecoveryModal from './RecoveryModal'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [blockFilter, setBlockFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [manageModal, setManageModal] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)

  useEffect(() => {
    fetchUsers()
    fetchBlocks()
  }, [roleFilter, blockFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = 'http://localhost:5000/api/admin/users?'
      if (roleFilter !== 'all') url += `role=${roleFilter}&`
      if (statusFilter !== 'all') url += `status=${statusFilter}&`
      if (search) url += `search=${encodeURIComponent(search)}&`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        alert('Session expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setBlocks(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch blocks:', err)
    }
  }

  const handleUpdateUser = async (userId, updates) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      if (res.status === 401) {
        alert('Session expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        await fetchUsers()
        setManageModal(null)
        alert('✅ User updated successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to update user: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to update user:', err)
      alert('Failed to update user')
    }
  }

  const handleDeleteUser = async (userId) => {
    const confirmText = prompt(`Type "DELETE" to confirm deletion of user ID ${userId}:`)
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled.')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        alert('Session expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        await fetchUsers()
        alert('✅ User deleted successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to delete user: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to delete user:', err)
      alert('Failed to delete user')
    }
  }

  // Group users by role
  const groupedUsers = {
    admin: users.filter(u => u.role === 'admin'),
    instructor: users.filter(u => u.role === 'instructor'),
    student: users.filter(u => u.role === 'student')
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    if (blockFilter !== 'all' && user.block_id != blockFilter) return false
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !user.is_active) return false
      if (statusFilter === 'inactive' && user.is_active) return false
    }
    if (search) {
      const searchLower = search.toLowerCase()
      return user.username.toLowerCase().includes(searchLower) || 
             user.email.toLowerCase().includes(searchLower)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex gap-3 flex-wrap">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2">
            <span>📥</span> Export CSV
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition flex items-center gap-2 font-bold">
            <span>👤</span> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none transition"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>

          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
          >
            <option value="all">All Blocks</option>
            {blocks.map(block => (
              <option key={block.id} value={block.id}>{block.section_code}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-xl border border-green-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Students</p>
          <p className="text-2xl font-black text-green-400">{groupedUsers.student.length}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-blue-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Instructors</p>
          <p className="text-2xl font-black text-blue-400">{groupedUsers.instructor.length}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-purple-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Admins</p>
          <p className="text-2xl font-black text-purple-400">{groupedUsers.admin.length}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Filtered Results</p>
          <p className="text-2xl font-black text-yellow-400">{filteredUsers.length}</p>
        </div>
      </div>

      {/* User Tables Grouped by Role */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Administrators Section */}
          {filteredUsers.filter(u => u.role === 'admin').length > 0 && (
            <UserSection
              title="Administrators"
              icon="🛡️"
              users={filteredUsers.filter(u => u.role === 'admin')}
              onManage={(user) => setManageModal(user)}
              onRecover={(user) => setRecoveryModal(user)}
              onDelete={handleDeleteUser}
            />
          )}

          {/* Instructors Section */}
          {filteredUsers.filter(u => u.role === 'instructor').length > 0 && (
            <UserSection
              title="Instructors"
              icon="👨‍🏫"
              users={filteredUsers.filter(u => u.role === 'instructor')}
              onManage={(user) => setManageModal(user)}
              onRecover={(user) => setRecoveryModal(user)}
              onDelete={handleDeleteUser}
            />
          )}

          {/* Students Section */}
          {filteredUsers.filter(u => u.role === 'student').length > 0 && (
            <UserSection
              title="Students"
              icon="🎓"
              users={filteredUsers.filter(u => u.role === 'student')}
              onManage={(user) => setManageModal(user)}
              onRecover={(user) => setRecoveryModal(user)}
              onDelete={handleDeleteUser}
            />
          )}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-slate-900/80 rounded-2xl border border-dashed border-slate-700">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-400 text-lg">No users found</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {manageModal && (
        <EditUserModal
          user={manageModal}
          blocks={blocks}
          onClose={() => setManageModal(null)}
          onSave={(updates) => handleUpdateUser(manageModal.id, updates)}
        />
      )}
      {recoveryModal && (
        <RecoveryModal
          user={recoveryModal}
          onClose={() => setRecoveryModal(null)}
          onSuccess={() => { setRecoveryModal(null); fetchUsers(); }}
        />
      )}
    </div>
  )
}

// User Section Component with 3 Buttons
function UserSection({ title, icon, users, onManage, onRecover, onDelete }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 overflow-hidden">
      <div className="bg-slate-800/80 border-b border-purple-600/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <span className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm font-bold border border-purple-600/50">
            {users.length}
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">USER</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">BLOCK</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">LEVEL</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">XP</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">STATUS</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-800/50 transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-slate-400 text-sm truncate max-w-[200px]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {user.blocks && user.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {/* ✅ Deduplicate by section_code so we don't see [101] [101] */}
                      {[...new Set(user.blocks.map(b => b.section_code))].map((code, idx) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-sm font-bold border border-purple-600/40 shadow-sm"
                          title={`Section ${code}`}
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-sm italic">Unassigned</span>
                  )}
                </td>
                <td className="p-4 text-white font-mono">{user.level}</td>
                <td className="p-4 text-yellow-400 font-mono">{user.xp}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    user.is_active ? 'bg-green-600/30 text-green-300 border border-green-600/50' : 'bg-red-600/30 text-red-300 border border-red-600/50'
                  }`}>
                    {user.is_active ? '✅ Active' : '⛔ Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    {/* Button 1: Manage (Purple) */}
                    <button
                      onClick={() => onManage(user)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-sm transition text-white font-bold"
                    >
                      Manage
                    </button>
                    {/* Button 2: Recover (Blue) */}
                    <button
                      onClick={() => onRecover(user)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition text-white font-bold"
                    >
                      Recover
                    </button>
                    {/* Button 3: Delete (Red) */}
                    <button
                      onClick={() => onDelete(user.id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 rounded text-sm transition text-red-400 hover:text-white font-bold border border-red-600/50"
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}