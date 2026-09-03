import { useState, useEffect } from 'react'
import EditUserModal from './EditUserModal'
import SubjectManagement from './SubjectsManagement'
import RecoveryModal from './RecoveryModal'
import UploadCSVModal from './UploadCSVModal'

// same hand-drawn line icons as the Class Codes page (SectionsManagement.jsx)
// — copied exactly, not redrawn, so both admin pages use the literal same
// icon instead of two different ones that just look similar.
const Icon = {
  Download: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  ),
  Upload: ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
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
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [manageModal, setManageModal] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)
  const [addUserModal, setAddUserModal] = useState(false)
  const [addUserForm, setAddUserForm] = useState({
    username: '', email: '', password: '', role: 'student', section_id: ''
  })
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState('')
  const [csvModal, setCsvModal] = useState(false)
  const [activeTab, setActiveTab] = useState('users')

  // toast — replaces every alert() in this file. alert() is that plain
  // browser popup that doesn't match anything else in the app (purple
  // theme, rounded corners, etc). this is just a message + a type
  // ('success' or 'error') that auto-dismisses after a few seconds.
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), type === 'warning' ? 6500 : 4000)
  }

  const isMasterAdmin = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      return u.email === 'admin@adamson.edu.ph'
    } catch { return false }
  })()

  const resetAddUserForm = () => {
    setAddUserForm({ username: '', email: '', password: '', role: 'student', section_id: '' })
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
      const payload = {
        username: addUserForm.username,
        email: addUserForm.email,
        password: addUserForm.password,
        role: addUserForm.role,
        section_ids: addUserForm.section_id ? [parseInt(addUserForm.section_id)] : []
      }
      const res = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        setAddUserSuccess(`✅ User "${data.user.username}" created successfully!`)
        setAddUserForm({ username: '', email: '', password: '', role: 'student', section_id: '' })
        fetchUsers()
        setTimeout(() => { setAddUserModal(false); setAddUserSuccess('') }, 2000)
      } else {
        setAddUserError(data.error || 'Failed to create user')
      }
    } catch {
      setAddUserError('Network error. Please try again.')
    } finally {
      setAddUserLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchSections()
  }, [roleFilter, sectionFilter, statusFilter, search])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = 'http://localhost:5000/api/admin/users?'
      if (roleFilter !== 'all') url += `role=${roleFilter}&`
      if (statusFilter !== 'all') url += `status=${statusFilter}&`
      if (search) url += `search=${encodeURIComponent(search)}&`

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })

      if (res.status === 401) {
        showToast('Session expired — logging you out...', 'error')
        localStorage.removeItem('token')
        setTimeout(() => { window.location.href = '/' }, 1200)
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

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/sections', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSections(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err)
    }
  }

  const handleUpdateUser = async (userId, updates) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.status === 401) {
        showToast('Session expired — logging you out...', 'error')
        localStorage.removeItem('token')
        setTimeout(() => { window.location.href = '/' }, 1200)
        return
      }
      if (res.ok) {
        const data = await res.json()
        await fetchUsers()
        setManageModal(null)
        // backend reports skipped class codes as a "Skipped (already
        // taken): ..." entry in changes — surface that instead of just
        // saying "success" and burying the actual conflict info.
        const skippedNote = (data.changes || []).find(c => c.startsWith('Skipped'))
        if (skippedNote) {
          showToast(`Saved, but some class codes were skipped — ${skippedNote.replace('Skipped (already taken): ', '')}`, 'warning')
        } else {
          showToast('User updated successfully!')
        }
      } else {
        const error = await res.json()
        showToast(`Failed to update user: ${error.error}`, 'error')
      }
    } catch (err) {
      console.error('Failed to update user:', err)
      showToast('Failed to update user', 'error')
    }
  }

  const handleDeleteUser = async (userId) => {
    const confirmText = prompt(`Type "DELETE" to confirm deletion of user ID ${userId}:`)
    if (confirmText !== 'DELETE') { showToast('Deletion cancelled.', 'error'); return }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) { await fetchUsers(); showToast('User deleted successfully!') }
      else { const error = await res.json(); showToast(`Failed to delete user: ${error.error}`, 'error') }
    } catch (err) {
      console.error('Failed to delete user:', err)
      showToast('Failed to delete user', 'error')
    }
  }

  const handleUnlockUser = async (userId, username) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/unlock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) { await fetchUsers(); showToast(`Account "${username}" has been unlocked.`) }
      else { const err = await res.json(); showToast(`Failed: ${err.error}`, 'error') }
    } catch { showToast('Network error. Please try again.', 'error') }
  }

  // Filter users by section if selected
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false
    if (sectionFilter !== 'all') {
      const enrolled = (user.blocks || []).some(b => String(b.id) === sectionFilter)
      if (!enrolled) return false
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !user.is_active) return false
      if (statusFilter === 'inactive' && user.is_active) return false
    }
    if (search) {
      const q = search.toLowerCase().replace(/-/g, '')
      const fullName = (user.full_name || '').toLowerCase()
      return (
        user.username.toLowerCase().replace(/-/g, '').includes(q) ||
        user.email.toLowerCase().includes(q) ||
        fullName.includes(q)
      )
    }
    return true
  })

  const groupedUsers = {
    admin: users.filter(u => u.role === 'administrator'),
    instructor: users.filter(u => u.role === 'instructor'),
    student: users.filter(u => u.role === 'student')
  }

  return (
    <div className="space-y-6">

      {/* Toast — replaces every alert() popup in this page */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] max-w-md px-5 py-3 rounded-xl font-semibold text-white shadow-2xl border transition ${
          toast.type === 'error'
            ? 'bg-red-600 border-red-500/50'
            : toast.type === 'warning'
              ? 'bg-amber-600 border-amber-500/50'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400/50'
        }`}>
          {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

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

      {activeTab === 'users' && (
        <>
          {/* Header Actions */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token')
                  const res = await fetch('http://localhost:5000/api/admin/reports?format=csv', {
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                  if (res.ok) {
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                }}
                className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition hover:opacity-85 hover:brightness-110 bg-white/5 border border-white/10 text-slate-300"
              >
                <Icon.Download size={14} /> Export CSV
              </button>
              <button
                onClick={() => setCsvModal(true)}
                className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition hover:opacity-85 hover:brightness-110 bg-green-600/15 border border-green-400/30 text-green-400"
              >
                <Icon.Upload size={14} /> Upload CSV
              </button>
              <button
                onClick={() => setAddUserModal(true)}
                className="px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition hover:opacity-85 hover:brightness-110 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              >
                <Icon.Users size={14} /> Add User
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
                  onChange={e => setSearch(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none transition"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
              >
                <option value="all">All Roles</option>
                <option value="administrator">Administrator</option>
                <option value="instructor">Instructor</option>
                <option value="student">Student</option>
              </select>

              <select
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
              >
                <option value="all">All Class Codes</option>
                {sections.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.section_no}{s.subject_code ? ` — ${s.subject_code}` : ''}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
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
              <p className="text-slate-400 text-sm mb-1">Administrators</p>
              <p className="text-2xl font-black text-purple-400">{groupedUsers.admin.length}</p>
            </div>
            <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4">
              <p className="text-slate-400 text-sm mb-1">Filtered Results</p>
              <p className="text-2xl font-black text-yellow-400">{filteredUsers.length}</p>
            </div>
          </div>

          {/* User Tables */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredUsers.filter(u => u.role === 'administrator').length > 0 && (
                <UserSection
                  title="Administrators"
                  icon="🛡️"
                  users={filteredUsers.filter(u => u.role === 'administrator')}
                  onManage={setManageModal}
                  onRecover={setRecoveryModal}
                  onDelete={handleDeleteUser}
                  onUnlock={handleUnlockUser}
                />
              )}
              {filteredUsers.filter(u => u.role === 'instructor').length > 0 && (
                <UserSection
                  title="Instructors"
                  icon="👨‍🏫"
                  users={filteredUsers.filter(u => u.role === 'instructor')}
                  onManage={setManageModal}
                  onRecover={setRecoveryModal}
                  onDelete={handleDeleteUser}
                  onUnlock={handleUnlockUser}
                />
              )}
              {filteredUsers.filter(u => u.role === 'student').length > 0 && (
                <UserSection
                  title="Students"
                  icon="🎓"
                  users={filteredUsers.filter(u => u.role === 'student')}
                  onManage={setManageModal}
                  onRecover={setRecoveryModal}
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
              sections={sections}
              onClose={() => setManageModal(null)}
              onSave={updates => handleUpdateUser(manageModal.id, updates)}
            />
          )}
          {recoveryModal && (
            <RecoveryModal
              user={recoveryModal}
              onClose={() => setRecoveryModal(null)}
              onSuccess={() => { setRecoveryModal(null); fetchUsers() }}
            />
          )}
          {csvModal && (
            <UploadCSVModal
              sections={sections}
              onClose={() => setCsvModal(false)}
              onSuccess={() => { setCsvModal(false); fetchUsers() }}
            />
          )}

          {/* Add User Modal */}
          {addUserModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-purple-600/50 rounded-2xl w-full max-w-md shadow-2xl shadow-purple-900/50">
                <div className="flex items-center justify-between p-6 border-b border-purple-600/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl">👤</div>
                    <div>
                      <h2 className="text-xl font-black text-white">Add New User</h2>
                      <p className="text-slate-400 text-xs">Create a student or instructor account</p>
                    </div>
                  </div>
                  <button onClick={() => { setAddUserModal(false); resetAddUserForm() }}
                    className="text-slate-400 hover:text-white text-2xl transition">✕</button>
                </div>

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
                      onChange={e => setAddUserForm({ ...addUserForm, username: e.target.value })}
                      placeholder="e.g. john_doe"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      value={addUserForm.email}
                      onChange={e => setAddUserForm({ ...addUserForm, email: e.target.value })}
                      placeholder="e.g. john@adamson.edu.ph"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Password <span className="text-red-400">*</span></label>
                    <input
                      type="password"
                      value={addUserForm.password}
                      onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5 font-medium">Role <span className="text-red-400">*</span></label>
                    <div className={`grid gap-3 ${isMasterAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {[
                        { value: 'student', label: 'Student', icon: '🎓', desc: 'Enrolled learner' },
                        { value: 'instructor', label: 'Instructor', icon: '👨‍🏫', desc: 'Course facilitator' },
                        ...(isMasterAdmin ? [{ value: 'administrator', label: 'Administrator', icon: '🛡️', desc: 'Full system access' }] : []),
                      ].map(role => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setAddUserForm({ ...addUserForm, role: role.value })}
                          className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition ${
                            addUserForm.role === role.value
                              ? role.value === 'administrator'
                                ? 'border-yellow-500 bg-yellow-600/20 text-white shadow-lg shadow-yellow-600/20'
                                : 'border-purple-500 bg-purple-600/20 text-white shadow-lg shadow-purple-600/20'
                              : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-2xl">{role.icon}</span>
                          <span className={`text-sm font-bold ${addUserForm.role === role.value && role.value === 'administrator' ? 'text-yellow-300' : ''}`}>{role.label}</span>
                          <span className="text-xs text-slate-500">{role.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {addUserForm.role === 'student' && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-1.5">
                        Assign to Class Code <span className="text-slate-500">(optional)</span>
                      </label>
                      <select
                        value={addUserForm.section_id}
                        onChange={e => setAddUserForm({ ...addUserForm, section_id: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition"
                      >
                        <option value="">No class code assigned</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.section_no}{s.subject_name ? ` — ${s.subject_name}` : ''}{s.semester ? ` (${s.semester})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

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
                    {addUserLoading
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                      : <><span>👤</span> Create User</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

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
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(user.full_name || user.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.full_name || user.username}</p>
                      <p className="text-slate-400 text-xs truncate max-w-[200px]">{user.email}</p>
                      {user.role === 'student' && (
                        <span className="font-mono text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-600/30 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {user.username}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* CLASS CODE column — shows section_no values */}
                <td className="p-4">
                  {user.blocks && user.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(user.blocks.map(b => b.section_code))].map((code, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-sm font-bold border border-purple-600/40 shadow-sm"
                          title={`Class code ${code}`}
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
                  <div className="flex flex-col gap-1">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold w-fit ${
                      user.is_active
                        ? 'bg-green-600/30 text-green-300 border border-green-600/50'
                        : 'bg-red-600/30 text-red-300 border border-red-600/50'
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
