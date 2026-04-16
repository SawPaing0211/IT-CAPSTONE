import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Mail, 
  MoreVertical,
  ChevronDown,
  ShieldCheck,
  UserX
} from 'lucide-react';

function AdminUsers() {
  // Mock Data (Replace with API call later)
  const [users, setUsers] = useState([
    { id: 1, name: 'Niño, Sasan', email: 'nino.sasan@adamson.edu.ph', role: 'Student', status: 'Active', lastActive: '2 min ago', section: 'BSIT-2A' },
    { id: 2, name: 'Kakazu, King', email: 'king.kakazu@adamson.edu.ph', role: 'Student', status: 'Active', lastActive: '5 min ago', section: 'BSIT-2A' },
    { id: 3, name: 'Doc. Leonard Alejandro', email: 'l.alejandro@adamson.edu.ph', role: 'Instructor', status: 'Active', lastActive: '1 hr ago', section: 'CS Faculty' },
    { id: 4, name: 'Rejano, Caleb', email: 'c.rejano@adamson.edu.ph', role: 'Administrator', status: 'Active', lastActive: 'Just now', section: 'Admin' },
    { id: 5, name: 'Guzman, Iverson', email: 'iverson.g@adamson.edu.ph', role: 'Student', status: 'Suspended', lastActive: '3 days ago', section: 'BSIT-2B' },
    { id: 6, name: 'Flores, Maria', email: 'maria.flores@adamson.edu.ph', role: 'Student', status: 'Active', lastActive: '1 day ago', section: 'BSIT-2B' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setUsers(users.filter(u => u.id !== id));
      // Later: Call API DELETE /api/users/:id
    }
  };

  const handleRoleChange = (id, newRole) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    // Later: Call API PUT /api/users/:id
  };

  const handleStatusToggle = (id) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const newStatus = u.status === 'Active' ? 'Suspended' : 'Active';
        return { ...u, status: newStatus };
      }
      return u;
    }));
    // Later: Call API PUT /api/users/:id/status
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-white p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Users</h1>
          <p className="text-gray-400 text-sm">View, edit, and manage all system users</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20">
          <Plus size={16} /> Add New User
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#eab308] transition"
          />
        </div>
        <div className="flex gap-2">
          <select className="bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#eab308]">
            <option>All Roles</option>
            <option>Student</option>
            <option>Instructor</option>
            <option>Administrator</option>
          </select>
          <select className="bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#eab308]">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-gray-700 text-gray-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold hidden md:table-cell">Last Active</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#2a3850]/50 transition">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{user.name}</span>
                        <span className="text-gray-500 text-sm">{user.email}</span>
                        <span className="text-xs text-gray-600 mt-1 md:hidden">{user.lastActive}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="relative inline-block">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="appearance-none bg-[#0f172a] border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-[#eab308] cursor-pointer"
                        >
                          <option>Student</option>
                          <option>Instructor</option>
                          <option>Administrator</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleStatusToggle(user.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit transition ${
                          user.status === 'Active' 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {user.status === 'Active' ? <ShieldCheck size={12} /> : <UserX size={12} />}
                        {user.status}
                      </button>
                    </td>
                    <td className="p-4 text-gray-400 text-sm hidden md:table-cell">
                      {user.lastActive}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition" title="Email">
                          <Mail size={18} />
                        </button>
                        {/* PANEL NOTE #7: DELETE ICON INSTEAD OF KEY */}
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" 
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination (Mock) */}
      <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
        <span>Showing {filteredUsers.length} of {users.length} users</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-[#1e293b] border border-gray-700 rounded hover:bg-[#2a3850] disabled:opacity-50" disabled>Previous</button>
          <button className="px-3 py-1 bg-[#1e293b] border border-gray-700 rounded hover:bg-[#2a3850]">Next</button>
        </div>
      </div>

    </div>
  );
}

export default AdminUsers;