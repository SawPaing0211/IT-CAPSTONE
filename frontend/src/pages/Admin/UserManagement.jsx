import { useState, useEffect } from 'react'
import EditUserModal from './EditUserModal'
import SubjectManagement from './SubjectsManagement'
import RecoveryModal from './RecoveryModal'
import UploadCSVModal from './UploadCSVModal'

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
  const [addUserModal, setAddUserModal] = useState(false)
  const [addUserForm, setAddUserForm] = useState({ username: '', email: '', password: '', role: 'student', block_id: '' })
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState('')
  const [csvModal, setCsvModal] = useState(false)
  const [activeTab, setActiveTab] = useState('users')

  const isMasterAdmin = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      return u.email === 'admin@adamson.edu.ph'
    } catch { return false }
  })()

  const resetAddUserForm = () => {
    setAddUserForm({ username: '', email: '', password: '', role: 'student', block_id: '' })
    setAddUserError('')
    setAddUserSuccess('')
  }

  const handleAddUser = async () => {
    setAddUserError('')
    setAddUserSuccess('')
    if (!addUserForm.username || !addUserForm.email || !addUserForm.password) {
      setAddUserError('Username, email, and password are required.')
      return
    }
    if (addUserForm.password.length < 6) {
      setAddUserError('Password must be at least 6 characters.')
      return
    }
    setAddUserLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addUserForm,
          block_id: addUserForm.block_id ? parseInt(addUserForm.block_id) : null
        })
      })
      const data = await res.json()
      if (res.ok) {
        setAddUserSuccess(`✅ User "${data.user.username}" created successfully!`)
        setAddUserForm({ username: '', email: '', password: '', role: 'student', block_id: '' })
        fetchUsers()
        setTimeout(() => { setAddUserModal(false); setAddUserSuccess('') }, 2000)
      } else {
        setAddUserError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setAddUserError('Network error. Please try again.')
    } finally {
      setAddUserLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchBlocks()
  }, [roleFilter, blockFilter, statusFilter, search])

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

  const handleUnlockUser = async (userId, username) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/unlock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        await fetchUsers()
        alert(`✅ Account "${username}" has been unlocked.`)
      } else {
        const err = await res.json()
        alert(`Failed: ${err.error}`)
      }
    } catch (err) {
      alert('Network error. Please try again.')
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
      const searchLower = search.toLowerCase().replace(/-/g, '')
      const fullNameLower = (user.full_name || '').toLowerCase()
      return user.username.toLowerCase().replace(/-/g, '').includes(searchLower) ||
             user.email.toLowerCase().includes(searchLower) ||
             fullNameLower.includes(searchLower) ||
             fullNameLower.replace(/-/g, '').includes(searchLower.replace(/-/g, ''))
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          👤 Users
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition ${activeTab === 'subjects' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          📚 Subjects
        </button>
      </div>

      {activeTab === 'subjects' && <SubjectManagement />}

      {activeTab === 'users' && <>

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex gap-3 flex-wrap">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2">
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={() => setCsvModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg transition flex items-center gap-2 font-bold shadow-lg shadow-green-600/30"
          >
            <span>📤</span> Upload CSV
          </button>

          <button
            onClick={() => setAddUserModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition flex items-center gap-2 font-bold shadow-lg shadow-purple-600/30"
          >
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
              placeholder="Search by name, student no., or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              name="user-search"
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
            <option value="super_admin">Super Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>

          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
          >
            <option value="all">All Class Codes</option>
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
          <p className="text-slate-400 text-sm mb-1">Super Admins</p>
          <p className="text-2xl font-black text-purple-400">{users.filter(u => u.role === 'super_admin').length}</p>
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
          {/* Super Administrators Section */}
          {filteredUsers.filter(u => u.role === 'super_admin').length > 0 && (
            <UserSection
              title="Super Administrators"
              icon="🛡️"
              users={filteredUsers.filter(u => u.role === 'super_admin')}
              onManage={(user) => setManageModal(user)}
              onRecover={(user) => setRecoveryModal(user)}
              onDelete={handleDeleteUser}
              onUnlock={handleUnlockUser}
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
              onUnlock={handleUnlockUser}
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
              onUnlock={handleUnlockUser}
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

      {csvModal && (
        <UploadCSVModal
          blocks={blocks}
          onClose={() => setCsvModal(false)}
          onSuccess={() => { setCsvModal(false); fetchUsers() }}
        />
      )}

      {/* Add User Modal */}
      {addUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-purple-600/50 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/50">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-600/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Add New User</h2>
                  <p className="text-slate-400 text-xs">Create a student or instructor account</p>
                </div>
              </div>
              <button onClick={() => { setAddUserModal(false); resetAddUserForm() }}
                className="text-slate-400 hover:text-white text-2xl transition">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {addUserError && (
                <div className="flex items-center gap-2 p-3 bg-red-600/20 border border-red-600/40 rounded-lg text-red-300 text-sm">
                  <span>❌</span> {addUserError}
                </div>
              )}
              {addUserSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-600/20 border border-green-600/40 rounded-lg text-green-300 text-sm">
                  <span>✅</span> {addUserSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Username <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={addUserForm.username}
                  onChange={e => setAddUserForm({...addUserForm, username: e.target.value})}
                  placeholder="e.g. john_doe"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={e => setAddUserForm({...addUserForm, email: e.target.value})}
                  placeholder="e.g. john@school.edu"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Password <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={e => setAddUserForm({...addUserForm, password: e.target.value})}
                  placeholder="Min. 6 characters"
                  className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                />
                {addUserForm.password && (
                  <div className="mt-1.5 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        addUserForm.password.length >= i * 3
                          ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-500' : 'bg-green-500'
                          : 'bg-slate-700'
                      }`} />
                    ))}
                    <span className="text-xs text-slate-500 ml-1">
                      {addUserForm.password.length < 4 ? 'Weak' : addUserForm.password.length < 7 ? 'Fair' : addUserForm.password.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">
                  Role <span className="text-red-400">*</span>
                </label>
                <div className={`grid gap-3 ${isMasterAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {[
                    { value: 'student',    label: 'Student',     icon: '🎓',  desc: 'Enrolled learner'    },
                    { value: 'instructor', label: 'Instructor',  icon: '👨‍🏫', desc: 'Course facilitator'  },
                    ...(isMasterAdmin ? [{ value: 'super_admin', label: 'Super Admin', icon: '🛡️', desc: 'Full system access' }] : []),
                  ].map(role => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setAddUserForm({...addUserForm, role: role.value})}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                        addUserForm.role === role.value
                          ? role.value === 'super_admin'
                            ? 'border-yellow-500 bg-yellow-600/20 text-white shadow-lg shadow-yellow-600/20'
                            : 'border-purple-500 bg-purple-600/20 text-white shadow-lg shadow-purple-600/20'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-2xl">{role.icon}</span>
                      <span className={`text-sm font-bold ${addUserForm.role === role.value && role.value === 'super_admin' ? 'text-yellow-300' : ''}`}>{role.label}</span>
                      <span className="text-xs text-slate-500">{role.desc}</span>
                    </button>
                  ))}
                </div>
                {!isMasterAdmin && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 bg-yellow-600/10 border border-yellow-600/30 rounded-lg">
                    <span className="text-yellow-400 text-sm">🔒</span>
                    <p className="text-yellow-300/80 text-xs">Super Admin accounts are managed exclusively by <span className="font-semibold text-yellow-300">admin@adamson.edu.ph</span></p>
                  </div>
                )}
              </div>

              {(addUserForm.role === 'student') && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Assign to Class Code <span className="text-slate-500">(optional)</span></label>
                  <select
                    value={addUserForm.block_id}
                    onChange={e => setAddUserForm({...addUserForm, block_id: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition"
                  >
                    <option value="">No class code assigned</option>
                    {blocks.map(block => (
                      <option key={block.id} value={block.id}>{block.section_code} — {block.semester || 'Current'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-purple-600/30">
              <button
                onClick={() => { setAddUserModal(false); resetAddUserForm() }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={addUserLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-black transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
              >
                {addUserLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><span>👤</span> Create User</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>}
    </div>
  )
}

// User Section Component with 3 Buttons
function UserSection({ title, icon, users, onManage, onRecover, onDelete, onUnlock }) {
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
              <th className="text-left p-4 text-slate-400 font-medium text-sm">CLASS CODE</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">LEVEL</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">XP</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">STATUS</th>
              <th className="text-left p-4 text-slate-400 font-medium text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-800/50 transition">
                {/* USER */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(user.full_name || user.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-slate-400 text-xs truncate max-w-[200px]">{user.email}</p>
                      {user.role === 'student' && (
                        <span className="font-mono text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-600/30 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {user.username}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                {/* BLOCK */}
                <td className="p-4">
                  {user.blocks && user.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
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
                  ) : user.is_irregular ? (
                    <span className="px-2.5 py-1 bg-orange-600/20 text-orange-300 rounded-lg text-xs font-bold border border-orange-600/40">
                      IRR
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm italic">Unassigned</span>
                  )}
                </td>
                {/* LEVEL */}
                <td className="p-4 text-white font-mono">{user.level}</td>
                {/* XP */}
                <td className="p-4 text-yellow-400 font-mono">{user.xp}</td>
                {/* STATUS */}
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold w-fit ${
                      user.is_active ? 'bg-green-600/30 text-green-300 border border-green-600/50' : 'bg-red-600/30 text-red-300 border border-red-600/50'
                    }`}>
                      {user.is_active ? '✅ Active' : '⛔ Inactive'}
                    </span>
                    {user.is_locked && (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold w-fit bg-orange-600/30 text-orange-300 border border-orange-600/50">
                        🔒 Locked
                      </span>
                    )}
                    {!user.is_locked && user.login_attempts > 0 && (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold w-fit bg-yellow-600/20 text-yellow-400 border border-yellow-600/40">
                        ⚠️ {user.login_attempts}/3 attempts
                      </span>
                    )}
                  </div>
                </td>
                {/* ACTIONS */}
                <td className="p-4 w-52">
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onManage(user)}
                        className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs transition text-white font-bold whitespace-nowrap"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => onRecover(user)}
                        className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs transition text-white font-bold whitespace-nowrap"
                      >
                        Recover
                      </button>
                      <button
                        onClick={() => onDelete(user.id)}
                        className="flex-1 px-2 py-1.5 bg-red-600/20 hover:bg-red-600 rounded text-xs transition text-red-400 hover:text-white font-bold border border-red-600/50 whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                    {user.is_locked && (
                      <button
                        onClick={() => onUnlock(user.id, user.username)}
                        className="w-full px-2 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-xs transition text-white font-black whitespace-nowrap flex items-center justify-center gap-1"
                      >
                        🔓 Unlock Account
                      </button>
                    )}
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