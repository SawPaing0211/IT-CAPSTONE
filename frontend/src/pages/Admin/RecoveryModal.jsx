import { useState } from 'react'

export default function RecoveryModal({ user, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('password')
  const [newPassword, setNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleResetPassword = async () => {
    if (!newPassword) return alert('Enter a new password')
    if (confirmText !== 'RESET') return alert('Type "RESET" to confirm')
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ new_password: newPassword })
      })
      
      if (res.ok) {
        alert('✅ Password reset successfully!')
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to reset password:', err)
      alert('Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail) return alert('Enter a new email')
    if (confirmText !== 'UPDATE') return alert('Type "UPDATE" to confirm')
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${user.id}/email`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ new_email: newEmail })
      })
      
      if (res.ok) {
        alert('✅ Email updated successfully!')
        onSuccess()
      } else {
        const error = await res.json()
        alert(`Failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to update email:', err)
      alert('Failed to update email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-blue-600/50 w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-white mb-6">
          Recover Account: <span className="text-blue-300">{user.username}</span>
        </h3>
        
        {/* Tab Navigation */}
        <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => { setActiveTab('password'); setConfirmText('') }}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              activeTab === 'password' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reset Password
          </button>
          <button
            onClick={() => { setActiveTab('email'); setConfirmText('') }}
            className={`flex-1 py-2 rounded-lg font-bold transition ${
              activeTab === 'email' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Update Email
          </button>
        </div>

        {activeTab === 'password' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Confirm Action</label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "RESET" to confirm'
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              />
            </div>

            <button
              onClick={handleResetPassword}
              disabled={loading || !newPassword || confirmText !== 'RESET'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-white transition"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Current Email</label>
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 font-mono">
                {user.email}
              </div>
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">New Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Confirm Action</label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Type "UPDATE" to confirm'
                autoComplete="off"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
              />
            </div>

            <button
              onClick={handleUpdateEmail}
              disabled={loading || !newEmail || confirmText !== 'UPDATE'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-white transition"
            >
              {loading ? 'Updating...' : 'Update Email'}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-300 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}