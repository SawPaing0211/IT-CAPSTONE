import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Edit, Trash2, Search, Filter, Download, 
  ChevronLeft, ChevronRight, TrendingUp, AlertCircle, CheckCircle,
  XCircle, RefreshCw, Shield, Mail, Phone, Calendar, MapPin, Settings,
  BookOpen, Plus
} from 'lucide-react';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Separate modals for different purposes
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [showFullEditModal, setShowFullEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateBlockModal, setShowCreateBlockModal] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Form data for different modals
  const [quickEditData, setQuickEditData] = useState({
    role: '',
    block: ''
  });

  const [fullEditData, setFullEditData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [createData, setCreateData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    block: ''
  });

  const [createBlockData, setCreateBlockData] = useState({
    block_number: '',
    course_name: '',
    description: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchBlocks();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks || []);
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
    }
  };

  // Create Block
  const handleCreateBlock = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createBlockData)
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowCreateBlockModal(false);
        setCreateBlockData({ block_number: '', course_name: '', description: '' });
        fetchBlocks(); // Refresh blocks list
        showNotification('success', 'Block created successfully!');
      } else {
        showNotification('error', `Error: ${data.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Edit (Role/Block only)
  const handleQuickEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: quickEditData.role,
          block: quickEditData.block
        })
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowQuickEditModal(false);
        setEditingUser(null);
        setQuickEditData({ role: '', block: '' });
        fetchUsers();
        showNotification('success', 'User assignment updated successfully!');
      } else {
        showNotification('error', `Error: ${data.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Full Edit (Personal info only)
  const handleFullEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const submitData = { ...fullEditData };
      if (!fullEditData.password) {
        delete submitData.password;
      }
      
      const response = await fetch(`http://localhost:5000/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowFullEditModal(false);
        setEditingUser(null);
        setFullEditData({ name: '', email: '', password: '' });
        fetchUsers();
        showNotification('success', 'User profile updated successfully!');
      } else {
        showNotification('error', `Error: ${data.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Create User
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createData)
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setCreateData({ name: '', email: '', password: '', role: 'student', block: '' });
        fetchUsers();
        showNotification('success', 'User created successfully!');
      } else {
        showNotification('error', `Error: ${data.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchUsers();
        showNotification('success', 'User deleted successfully!');
      } else {
        showNotification('error', data.msg || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'An error occurred while deleting the user.');
    }
  };

  const handleQuickEdit = (user) => {
    setEditingUser(user);
    setQuickEditData({
      role: user.role,
      block: user.block || ''
    });
    setShowQuickEditModal(true);
  };

  const handleFullEdit = (user) => {
    setEditingUser(user);
    setFullEditData({
      name: user.name,
      email: user.email,
      password: ''
    });
    setShowFullEditModal(true);
  };

  const handleSelectUser = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleSelectAll = (role) => {
    const filteredUsers = getFilteredUsers(role);
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers(selectedUsers.filter(id => !filteredUsers.some(u => u.id === id)));
    } else {
      setSelectedUsers([...selectedUsers, ...filteredUsers.map(u => u.id)]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const promises = selectedUsers.map(id => 
        fetch(`http://localhost:5000/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      
      if (successCount > 0) {
        fetchUsers();
        setSelectedUsers([]);
        showNotification('success', `${successCount} user(s) deleted successfully!`);
      } else {
        showNotification('error', 'Failed to delete some users.');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      showNotification('error', 'An error occurred during bulk deletion.');
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Block', 'Level', 'XP', 'Created'];
    const csvData = filteredUsers.map(user => [
      user.id,
      user.name,
      user.email,
      user.role,
      user.block || 'Unassigned',
      user.level || 1,
      user.xp || 0,
      new Date(user.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification('success', 'Users exported successfully!');
  };

  const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        ${type === 'success' ? '<CheckCircle size={20} />' : '<AlertCircle size={20} />'}
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Helper function to get filtered users by role
  const getFilteredUsers = (role) => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && user.role === role;
    });
  };

  // Statistics
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalInstructors = users.filter(u => u.role === 'instructor').length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const unassignedUsers = users.filter(u => !u.block).length;

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'instructor': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'student': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Shield size={16} className="text-purple-400" />;
      case 'instructor': return <Users size={16} className="text-blue-400" />;
      case 'student': return <Users size={16} className="text-green-400" />;
      default: return <Users size={16} className="text-slate-400" />;
    }
  };

  // Render User Table Component
  const UserTable = ({ title, role, icon: Icon, color }) => {
    const filteredUsers = getFilteredUsers(role);
    const paginatedUsers = filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    if (filteredUsers.length === 0) {
      return null; // Don't show section if no users
    }

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${color}-500/10 rounded-lg`}>
              <Icon size={24} className={`text-${color}-400`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-sm text-slate-400">{filteredUsers.length} {title.toLowerCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedUsers.filter(id => filteredUsers.some(u => u.id === id)).length === filteredUsers.length && filteredUsers.length > 0}
              onChange={() => handleSelectAll(role)}
              className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-slate-400">Select All</span>
          </div>
        </div>

        {selectedUsers.filter(id => filteredUsers.some(u => u.id === id)).length > 0 && (
          <div className="mb-4 bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">
                {selectedUsers.filter(id => filteredUsers.some(u => u.id === id)).length} {title.toLowerCase()}(s) selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedUsers(selectedUsers.filter(id => !filteredUsers.some(u => u.id === id)))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedUsers.filter(id => filteredUsers.some(u => u.id === id)).length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={() => handleSelectAll(role)}
                      className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    User
                  </th>
                  {role !== 'admin' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Block
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    XP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {role !== 'admin' && (
                      <td className="px-6 py-4">
                        {user.block ? (
                          <span className="text-sm text-slate-300">Block {user.block}</span>
                        ) : (
                          <span className="text-sm text-yellow-400">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{user.level || 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{user.xp || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleQuickEdit(user)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          title="Quick Edit (Role/Block)"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => handleFullEdit(user)}
                          className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition"
                          title="Edit Profile"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination for this section */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors border border-slate-700 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors border border-slate-700 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Users className="text-purple-400" size={32} />
              User Management
            </h1>
            <p className="text-slate-400">Manage students, instructors, and administrators</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button 
              onClick={() => setShowCreateBlockModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
              <BookOpen size={18} />
              Create Block
            </button>
            <button 
              onClick={() => {
                setCreateData({ name: '', email: '', password: '', role: 'student', block: '' });
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-500/20"
            >
              <UserPlus size={20} />
              Add User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-white">{totalStudents}</p>
              </div>
              <Users className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Instructors</p>
                <p className="text-2xl font-bold text-white">{totalInstructors}</p>
              </div>
              <Users className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Admins</p>
                <p className="text-2xl font-bold text-white">{totalAdmins}</p>
              </div>
              <Shield className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Unassigned</p>
                <p className="text-2xl font-bold text-white">{unassignedUsers}</p>
              </div>
              <AlertCircle className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 outline-none transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <Users size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Users Found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Add your first user to get started'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Admins Section */}
          <UserTable 
            title="Administrators" 
            role="admin" 
            icon={Shield} 
            color="purple" 
          />

          {/* Instructors Section */}
          <UserTable 
            title="Instructors" 
            role="instructor" 
            icon={Users} 
            color="blue" 
          />

          {/* Students Section */}
          <UserTable 
            title="Students" 
            role="student" 
            icon={Users} 
            color="green" 
          />
        </>
      )}

      {/* Quick Edit Modal (Role/Block Only) */}
      {showQuickEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Quick Edit Assignment
            </h2>
            
            <form onSubmit={handleQuickEditSubmit} className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-300 mb-1">Editing:</p>
                <p className="font-semibold text-white">{editingUser?.name}</p>
                <p className="text-sm text-slate-400">{editingUser?.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role <span className="text-red-500">*</span></label>
                  <select
                    value={quickEditData.role}
                    onChange={(e) => setQuickEditData({...quickEditData, role: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Block</label>
                  <select
                    value={quickEditData.block}
                    onChange={(e) => setQuickEditData({...quickEditData, block: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                    disabled={quickEditData.role === 'admin'}
                  >
                    <option value="">Unassigned</option>
                    {blocks.map(block => (
                      <option key={block.block_number} value={block.block_number}>
                        Block {block.block_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickEditModal(false);
                    setEditingUser(null);
                    setQuickEditData({ role: '', block: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Assignment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Edit Modal (Personal Info Only) */}
      {showFullEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Edit User Profile
            </h2>
            
            <form onSubmit={handleFullEditSubmit} className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-300 mb-1">Editing:</p>
                <p className="font-semibold text-white">{editingUser?.name}</p>
                <p className="text-sm text-slate-400">{editingUser?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={fullEditData.name}
                  onChange={(e) => setFullEditData({...fullEditData, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={fullEditData.email}
                  onChange={(e) => setFullEditData({...fullEditData, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password <span className="text-slate-500">(leave blank to keep)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={fullEditData.password}
                  onChange={(e) => setFullEditData({...fullEditData, password: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFullEditModal(false);
                    setEditingUser(null);
                    setFullEditData({ name: '', email: '', password: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Add New User
            </h2>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., John Doe"
                  value={createData.name}
                  onChange={(e) => setCreateData({...createData, name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="e.g., john@example.com"
                  value={createData.email}
                  onChange={(e) => setCreateData({...createData, email: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={createData.password}
                  onChange={(e) => setCreateData({...createData, password: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role <span className="text-red-500">*</span></label>
                  <select
                    value={createData.role}
                    onChange={(e) => setCreateData({...createData, role: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Block</label>
                  <select
                    value={createData.block}
                    onChange={(e) => setCreateData({...createData, block: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                    disabled={createData.role === 'admin'}
                  >
                    <option value="">Unassigned</option>
                    {blocks.map(block => (
                      <option key={block.block_number} value={block.block_number}>
                        Block {block.block_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateData({ name: '', email: '', password: '', role: 'student', block: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Add User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Block Modal */}
      {showCreateBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              Create New Block
            </h2>
            
            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Block Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., 301"
                  value={createBlockData.block_number}
                  onChange={(e) => setCreateBlockData({...createBlockData, block_number: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Course Name</label>
                <input
                  type="text"
                  placeholder="e.g., Introduction to Programming"
                  value={createBlockData.course_name}
                  onChange={(e) => setCreateBlockData({...createBlockData, course_name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of the block..."
                  value={createBlockData.description}
                  onChange={(e) => setCreateBlockData({...createBlockData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateBlockModal(false);
                    setCreateBlockData({ block_number: '', course_name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Block'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;