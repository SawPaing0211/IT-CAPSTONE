import { useState, useEffect, useCallback } from 'react'
import EditUserModal from './EditUserModal'
import PasswordField from '../../components/PasswordField'
import SubjectManagement from './SubjectsManagement'
import RecoveryModal from './RecoveryModal'
import UploadCSVModal from './UploadCSVModal'
import { API_BASE, authFetch } from '../../api/client'

// same hand-drawn line icons as the Class Codes page (SectionsManagement.jsx)
// — copied exactly, not redrawn, so both admin pages use the literal same
// icon instead of two different ones that just look similar.
const control = 'w-full min-w-0 min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400'
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
  const [sort, setSort] = useState('name_asc')

  const [manageModal, setManageModal] = useState(null)
  const [recoveryModal, setRecoveryModal] = useState(null)
  const [addUserModal, setAddUserModal] = useState(false)
  const [addUserForm, setAddUserForm] = useState({
    username: '', password: '', role: 'student', section_id: ''
  })
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState('')
  const [csvModal, setCsvModal] = useState(false)
  const [activeTab, setActiveTab] = useState('users')

  // shared type-to-confirm modal for single-user delete AND the
  // "Delete All Students" bulk action below
  const [confirmModal, setConfirmModal] = useState(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)

  // toast — replaces every alert() in this file. alert() is that plain
  // browser popup that doesn't match anything else in the app (purple
  // theme, rounded corners, etc). this is just a message + a type
  // ('success' or 'error') that auto-dismisses after a few seconds.
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), type === 'warning' ? 6500 : 4000)
  }

  // Settings come from the server (it also enforces them): whether this admin may
  // create administrators, and the domain of generated account identifiers.
  const [policy, setPolicy] = useState({ can_create_admins: false, student_email_domain: 'laconsolacion.edu' })
  const isMasterAdmin = policy.can_create_admins
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/api/admin/policy`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && !cancelled) setPolicy(prev => ({ ...prev, ...d })) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const emailLocal = addUserForm.username.trim().toLowerCase()
  const generatedEmailLocal = addUserForm.role === 'student' ? emailLocal : emailLocal.replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
  const generatedEmail = generatedEmailLocal ? generatedEmailLocal + '@' + policy.student_email_domain : ''

  // Clear the add-user form back to its defaults
  const resetAddUserForm = () => {
    setAddUserForm({ username: '', password: '', role: 'student', section_id: '' })
    setAddUserError('')
    setAddUserSuccess('')
  }

  // Validate the new user form and submit it to the server
  const handleAddUser = async () => {
    setAddUserError('')
    setAddUserSuccess('')
    const isStudent = addUserForm.role === 'student'
    if (!addUserForm.username.trim() || !addUserForm.password) {
      setAddUserError(isStudent ? 'Student ID and password are required.' : 'Username and password are required.')
      return
    }
    if (addUserForm.password.length < 8) {
      setAddUserError('Password must be at least 8 characters, with a letter and a number.')
      return
    }
    setAddUserLoading(true)
    try {
      const payload = {
        username: addUserForm.username,
        password: addUserForm.password,
        role: addUserForm.role,
        section_ids: addUserForm.role === 'student' && addUserForm.section_id ? [Number(addUserForm.section_id)] : []
      }
      const res = await authFetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (res.ok) {
        setAddUserSuccess(`✅ User "${data.user.username}" created successfully!`)
        setAddUserForm({ username: '', password: '', role: 'student', section_id: '' })
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

  const [usersError, setUsersError] = useState('')
  const [sectionError, setSectionError] = useState(false)
  const [userListVersion, setUserListVersion] = useState(0)
  const fetchUsers = () => setUserListVersion(version => version + 1)

  useEffect(() => {
    if (activeTab !== 'users') return
    const controller = new AbortController()
    const query = new URLSearchParams()
    query.set('sort', sort)
    if (search.trim()) query.set('search', search.trim())
    if (roleFilter !== 'all') query.set('role', roleFilter)
    if (statusFilter !== 'all') query.set('status', statusFilter)
    if (sectionFilter !== 'all') query.set('section', sectionFilter)
    const timer = setTimeout(async () => {
      setUsersError('')
      setLoading(true)
      try {
        const res = await authFetch(`${API_BASE}/api/admin/users?${query}`, { signal: controller.signal })
        if (!res.ok) throw new Error('Users unavailable')
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('Unexpected user list')
        if (!controller.signal.aborted) setUsers(data)
      } catch {
        if (!controller.signal.aborted) setUsersError('Could not load users. Try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, search ? 200 : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search, roleFilter, statusFilter, sectionFilter, sort, activeTab, userListVersion])

  const fetchSections = useCallback(async () => {
    setSectionError(false)
    try {
      const res = await authFetch(API_BASE + '/api/admin/sections')
      if (!res.ok) throw new Error('Class codes unavailable')
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected class list')
      setSections(data)
    } catch {
      setSectionError(true)
    }
  }, [])
  useEffect(() => { fetchSections() }, [fetchSections])

  // Send the edited user fields to the server
  const handleUpdateUser = async (userId, updates) => {
    try {
      const res = await authFetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
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

  // opens the styled type-to-confirm modal instead of the old prompt()
  const handleDeleteUser = (userId) => {
    const target = users.find(u => u.id === userId)
    setConfirmInput('')
    setConfirmModal({
      title: 'Delete User',
      message: `This permanently deletes ${target?.full_name || target?.username || `user ID ${userId}`} and cannot be undone.`,
      requiredPhrase: 'DELETE',
      onConfirm: () => performDeleteUser(userId),
    })
  }

  // Delete the user now that the confirmation phrase has been typed
  const performDeleteUser = async (userId) => {
    setConfirmLoading(true)
    try {
      const res = await authFetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (res.ok) { await fetchUsers(); showToast('User deleted successfully!') }
      else { const error = await res.json(); showToast(`Failed to delete user: ${error.error}`, 'error') }
    } catch (err) {
      console.error('Failed to delete user:', err)
      showToast('Failed to delete user', 'error')
    } finally {
      setConfirmLoading(false)
      setConfirmModal(null)
      setConfirmInput('')
    }
  }

  // "Delete All Students" — same type-to-confirm modal, higher-friction
  // phrase since this wipes every student account (and, via the backend's
  // _cascade_delete_student_data, their submissions/progress/enrollments)
  // in one action instead of just one user
  const handleBulkDeleteStudents = () => {
    setConfirmInput('')
    setConfirmModal({
      title: 'Delete All Students',
      message: 'This permanently deletes every student account, including accounts hidden by the filters, and their submissions, progress, and enrollments. This cannot be undone.',
      requiredPhrase: 'DELETE ALL STUDENTS',
      onConfirm: performBulkDeleteStudents,
    })
  }

  // Delete every student account now that the confirmation phrase has been typed
  const performBulkDeleteStudents = async () => {
    setConfirmLoading(true)
    try {
      const res = await authFetch(`${API_BASE}/api/admin/students/bulk-delete`, {
        method: 'DELETE'
      })
      if (res.ok) {
        const data = await res.json()
        await fetchUsers()
        showToast(`Deleted ${data.count} student account(s) successfully.`)
      } else {
        const error = await res.json()
        showToast(`Failed to delete students: ${error.error}`, 'error')
      }
    } catch (err) {
      console.error('Failed to bulk delete students:', err)
      showToast('Failed to delete students', 'error')
    } finally {
      setConfirmLoading(false)
      setConfirmModal(null)
      setConfirmInput('')
    }
  }

  // Unlock a user account that was locked after failed login attempts
  const handleUnlockUser = async (userId, username) => {
    try {
      const res = await authFetch(`${API_BASE}/api/admin/users/${userId}/unlock`, {
        method: 'POST'
      })
      if (res.ok) { await fetchUsers(); showToast(`Account "${username}" has been unlocked.`) }
      else { const err = await res.json(); showToast(`Failed: ${err.error}`, 'error') }
    } catch { showToast('Network error. Please try again.', 'error') }
  }

  const filteredUsers = users

  const classesBySubject = new Map()
  for (const section of [...sections].sort((a, b) => (a.subject_name || '').localeCompare(b.subject_name || '') || String(a.section_no).localeCompare(String(b.section_no), undefined, { numeric: true }))) {
    const subject = section.subject_name || section.subject_code || 'Other classes'
    if (!classesBySubject.has(subject)) classesBySubject.set(subject, [])
    classesBySubject.get(subject).push(section)
  }
  const hasFilters = Boolean(search || roleFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all')

  // Split the user list into admin, instructor, and student groups for the tables below
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
              : 'bg-violet-700 hover:bg-violet-600 border-purple-400/50'
        }`}>
          {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          aria-pressed={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition ${activeTab === 'users' ? 'bg-violet-950 text-amber-100 ring-1 ring-inset ring-amber-300/35' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Users
        </button>
        <button
          aria-pressed={activeTab === 'subjects'}
          onClick={() => setActiveTab('subjects')}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm transition ${activeTab === 'subjects' ? 'bg-violet-950 text-amber-100 ring-1 ring-inset ring-amber-300/35' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          Subjects
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
                  try {
                    const res = await authFetch(`${API_BASE}/api/admin/reports?format=csv`)
                    if (!res.ok || !res.headers.get('Content-Type')?.startsWith('text/csv')) {
                      throw new Error('The server did not return a submission CSV.')
                    }
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `submissions_report_${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch {
                    showToast('Could not export submissions. Please try again.', 'error')
                  }
                }}
                className="admin-button px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition border text-slate-300"
              >
                <Icon.Download size={14} /> Export submission CSV
              </button>
              <button
                onClick={() => setCsvModal(true)}
                className="admin-button px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition border text-green-400"
              >
                <Icon.Upload size={16} /> Bulk Enrollment Upload
              </button>
              <button
                onClick={() => setAddUserModal(true)}
                className="admin-button admin-button-primary px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition text-white"
              >
                <Icon.Users size={14} /> Add User
              </button>
              <button
                onClick={handleBulkDeleteStudents}
                disabled={hasFilters || loading || !!usersError || groupedUsers.student.length === 0}
                title={hasFilters ? 'Clear filters to access the global delete action' : undefined}
                className="admin-button admin-button-danger px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition border text-red-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
              >
                🗑️ Delete All Students
              </button>
            </div>
          </div>

          <section aria-label="User filters" className="rounded-xl border border-amber-300/25 bg-slate-900 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-cinzel text-lg font-semibold text-slate-100">Find users</h2>
              {hasFilters && <button type="button" className="min-h-9 rounded px-2 text-sm font-semibold text-amber-200 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-violet-400" onClick={() => { setSearch(''); setRoleFilter('all'); setSectionFilter('all'); setStatusFilter('all') }}>Clear filters</button>}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-[1.5fr_1fr_1.35fr_1fr_1fr]">
              <label className="min-w-0 space-y-2 text-sm text-slate-200"><span>Search</span>
                <input className={control} type="search" placeholder="Name, username, or email" value={search} onChange={e => setSearch(e.target.value)} />
              </label>
              <label className="min-w-0 space-y-2 text-sm text-slate-200"><span id="user-role-filter-label">Role</span>
                <select aria-labelledby="user-role-filter-label" className={control} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="all">All roles</option><option value="administrator">Administrator</option><option value="instructor">Instructor</option><option value="student">Student</option>
                </select>
              </label>
              <label className="min-w-0 space-y-2 text-sm text-slate-200"><span id="user-class-filter-label">Class code</span>
                <select aria-labelledby="user-class-filter-label" className={control} value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                  <option value="all">All class codes</option>
                  {[...classesBySubject].map(([subject, codes]) => <optgroup key={subject} label={subject}>
                    {codes.map(section => <option key={section.id} value={String(section.id)}>{section.section_no}{section.subject_code ? ' — ' + section.subject_code : ''}</option>)}
                  </optgroup>)}
                </select>
              </label>
              <label className="min-w-0 space-y-2 text-sm text-slate-200"><span id="user-status-filter-label">Status</span>
                <select aria-labelledby="user-status-filter-label" className={control} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="all">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="min-w-0 space-y-2 text-sm text-slate-200"><span id="user-sort-label">Sort by</span>
                <select aria-labelledby="user-sort-label" className={control} value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="name_asc">Name: A–Z</option>
                  <option value="name_desc">Name: Z–A</option>
                  <option value="newest">Newest first</option>
                </select>
              </label>
            </div>
            {sectionError && <p role="alert" className="mt-3 text-sm text-amber-200">Class codes could not be loaded. <button type="button" onClick={fetchSections} className="underline">Retry</button></p>}
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 rounded-xl border border-green-600/30 p-4">
              <p className="text-slate-400 text-sm mb-1">Students shown</p>
              <p className="text-2xl font-black text-green-400">{groupedUsers.student.length}</p>
            </div>
            <div className="bg-slate-900/80 rounded-xl border border-blue-600/30 p-4">
              <p className="text-slate-400 text-sm mb-1">Instructors shown</p>
              <p className="text-2xl font-black text-blue-400">{groupedUsers.instructor.length}</p>
            </div>
            <div className="bg-slate-900/80 rounded-xl border border-purple-600/30 p-4">
              <p className="text-slate-400 text-sm mb-1">Administrators shown</p>
              <p className="text-2xl font-black text-purple-400">{groupedUsers.admin.length}</p>
            </div>
            <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4">
              <p className="text-slate-400 text-sm mb-1">Filtered Results</p>
              <p aria-live="polite" className="text-2xl font-black text-yellow-400">{loading || usersError ? '—' : filteredUsers.length}</p>
            </div>
          </div>

          {/* User Tables */}
          {usersError ? (
            <div role="alert" className="rounded-xl border border-amber-300/25 bg-slate-900 p-5 text-amber-100">{usersError} <button type="button" onClick={fetchUsers} className="underline">Retry</button></div>
          ) : loading ? (
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
              canCreateAdmins={isMasterAdmin}
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
              onClose={() => setCsvModal(false)}
              onSuccess={() => { setCsvModal(false); fetchUsers() }}
            />
          )}

          {/* Type-to-confirm modal — shared by single-user Delete and
              "Delete All Students". Confirm button stays disabled until
              the typed text exactly matches confirmModal.requiredPhrase. */}
          {confirmModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
              <div className="bg-slate-900 border border-red-600/50 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/50">
                <div className="flex items-center gap-3 p-6 border-b border-red-600/30">
                  <div className="w-10 h-10 bg-red-600/20 border border-red-600/40 rounded-xl flex items-center justify-center text-xl">⚠️</div>
                  <div>
                    <h2 className="text-xl font-black text-white">{confirmModal.title}</h2>
                    <p className="text-slate-400 text-xs">This action cannot be undone</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">{confirmModal.message}</p>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Type <span className="font-mono text-red-400 font-bold">{confirmModal.requiredPhrase}</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={e => setConfirmInput(e.target.value)}
                      autoFocus
                      autoComplete="off"
                      placeholder={confirmModal.requiredPhrase}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-red-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-red-600/30">
                  <button
                    onClick={() => { setConfirmModal(null); setConfirmInput('') }}
                    disabled={confirmLoading}
                    className="admin-button flex-1 py-2.5 disabled:opacity-50 rounded-lg text-slate-300 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    disabled={confirmInput !== confirmModal.requiredPhrase || confirmLoading}
                    className="admin-button admin-button-danger flex-1 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white font-black transition flex items-center justify-center gap-2"
                  >
                    {confirmLoading
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
                      : <><span>🗑️</span> Confirm Delete</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add User Modal */}
          {addUserModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div role="dialog" aria-modal="true" aria-labelledby="add-user-title" className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-slate-900 border border-amber-300/35 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-purple-600/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-800 border border-violet-400/40 rounded-xl flex items-center justify-center text-xl">👤</div>
                    <div>
                      <h2 id="add-user-title" className="font-cinzel text-xl font-semibold text-white">Add new user</h2>
                      <p className="text-slate-400 text-xs">{isMasterAdmin ? 'Create a student, instructor or administrator account' : 'Create a student or instructor account'}</p>
                    </div>
                  </div>
                  <button aria-label="Close add user" onClick={() => { setAddUserModal(false); resetAddUserForm() }}
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
                    <label htmlFor="add-user-username" className="block text-sm text-slate-300 mb-1.5">{addUserForm.role === 'student' ? 'Student ID' : 'Username'} <span className="text-red-400">*</span></label>
                    <input
                      id="add-user-username"
                      type="text"
                      value={addUserForm.username}
                      onChange={e => setAddUserForm({ ...addUserForm, username: e.target.value })}
                      placeholder={addUserForm.role === 'student' ? 'e.g. 2026001' : 'e.g. jane_doe'}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-lg px-4 py-2.5 text-white outline-none transition placeholder-slate-500"
                    />
                  </div>

                  <label className="block space-y-2 text-sm text-slate-300">
                    <span>Generated sign-in email</span>
                    <input readOnly className={control} value={generatedEmail} placeholder={'@' + policy.student_email_domain} />
                  </label>

                  <div>
                    <label htmlFor="add-user-password" className="block text-sm text-slate-400 mb-1.5">Password <span className="text-red-400">*</span></label>
                    <PasswordField
                      key={addUserForm.role}
                      id="add-user-password"
                      autoComplete="new-password"
                      value={addUserForm.password}
                      onChange={e => setAddUserForm({ ...addUserForm, password: e.target.value })}
                      placeholder="8+ characters, letter and number"
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
                    className="admin-button flex-1 py-2.5 rounded-lg text-slate-300 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddUser}
                    disabled={addUserLoading}
                    className="admin-button admin-button-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition flex items-center justify-center gap-2"
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
    <div className="bg-slate-900 rounded-xl border border-amber-300/25 overflow-hidden">
      <div className="bg-violet-950/25 border-b border-amber-300/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-cinzel text-xl font-semibold text-white">{title}</h3>
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
                    <div className="w-10 h-10 bg-violet-800 border border-violet-400/40 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(user.full_name || user.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{user.full_name || user.username}{user.is_head_admin && <span className="ml-2 text-xs text-amber-300">Head Admin</span>}</p>
                      <p className="text-slate-300 text-xs break-all">{user.email}</p>
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
                  {user.sections && user.sections.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(user.sections.map(s => s.section_code))].map((code, idx) => (
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
                        disabled={user.can_manage === false}
                        title={user.can_manage === false ? 'Administrator accounts are managed by the Head Admin; own-account editing is unavailable.' : undefined}
                        onClick={() => onManage(user)}
                        className="admin-button admin-button-primary flex-1 px-2 py-1.5 rounded text-xs transition text-white font-bold whitespace-nowrap"
                      >
                        Manage
                      </button>
                      <button
                        disabled={user.can_manage === false}
                        onClick={() => onRecover(user)}
                        className="admin-button flex-1 px-2 py-1.5 rounded text-xs transition text-white font-bold whitespace-nowrap"
                      >
                        Recover
                      </button>
                      <button
                        disabled={user.can_delete === false}
                        onClick={() => onDelete(user.id)}
                        className="admin-button admin-button-danger flex-1 px-2 py-1.5 rounded text-xs transition text-red-400 font-bold border whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                    {user.is_locked && user.can_manage !== false && (
                      <button
                        onClick={() => onUnlock(user.id, user.username)}
                        className="admin-button w-full px-2 text-xs font-semibold flex items-center justify-center gap-1"
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
