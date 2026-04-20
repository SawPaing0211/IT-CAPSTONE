import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Users, BookOpen, Search, Filter, Download, 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle, XCircle, Clock, Calendar, BarChart3
} from 'lucide-react';

function AdminBlocks() {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [formData, setFormData] = useState({
    block_number: '',
    course_name: '',
    description: ''
  });

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBlocks(data.blocks || []);
      } else {
        console.error('Failed to fetch blocks:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = editingBlock 
        ? `http://localhost:5000/api/admin/blocks/${editingBlock.id}`
        : 'http://localhost:5000/api/admin/blocks';
      
      const method = editingBlock ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowModal(false);
        setEditingBlock(null);
        setFormData({ block_number: '', course_name: '', description: '' });
        fetchBlocks();
        
        // Show success notification
        showNotification('success', editingBlock ? 'Block updated successfully!' : 'Block created successfully!');
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
    if (!confirm('Are you sure you want to delete this block? This will unassign all users in this block.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/blocks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchBlocks();
        showNotification('success', 'Block deleted successfully!');
      } else {
        showNotification('error', data.msg || 'Failed to delete block');
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'An error occurred while deleting the block.');
    }
  };

  const handleEdit = (block) => {
    setEditingBlock(block);
    setFormData({
      block_number: block.block_number,
      course_name: block.course_name || '',
      description: block.description || ''
    });
    setShowModal(true);
  };

  const handleSelectBlock = (id) => {
    if (selectedBlocks.includes(id)) {
      setSelectedBlocks(selectedBlocks.filter(blockId => blockId !== id));
    } else {
      setSelectedBlocks([...selectedBlocks, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBlocks.length === filteredBlocks.length) {
      setSelectedBlocks([]);
    } else {
      setSelectedBlocks(filteredBlocks.map(block => block.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedBlocks.length} blocks? This action cannot be undone.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const promises = selectedBlocks.map(id => 
        fetch(`http://localhost:5000/api/admin/blocks/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      
      if (successCount > 0) {
        fetchBlocks();
        setSelectedBlocks([]);
        showNotification('success', `${successCount} block(s) deleted successfully!`);
      } else {
        showNotification('error', 'Failed to delete some blocks.');
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      showNotification('error', 'An error occurred during bulk deletion.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Block Number', 'Course Name', 'Description', 'Students', 'Instructors', 'Created'];
    const csvData = filteredBlocks.map(block => [
      block.block_number,
      block.course_name || '',
      block.description || '',
      block.student_count || 0,
      block.instructor_count || 0,
      new Date().toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blocks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showNotification('success', 'Blocks exported successfully!');
  };

  const showNotification = (type, message) => {
    // Simple notification system
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

  // Filter Logic
  const filteredBlocks = blocks.filter(b => {
    const matchesSearch = b.block_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (b.course_name && b.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'high-student' && (b.student_count || 0) >= 20) ||
                         (filterType === 'low-student' && (b.student_count || 0) < 20) ||
                         (filterType === 'no-instructor' && (b.instructor_count || 0) === 0);
    
    return matchesSearch && matchesFilter;
  });

  const paginatedBlocks = filteredBlocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredBlocks.length / itemsPerPage);

  // Statistics
  const totalStudents = blocks.reduce((sum, block) => sum + (block.student_count || 0), 0);
  const totalInstructors = blocks.reduce((sum, block) => sum + (block.instructor_count || 0), 0);
  const avgStudentsPerBlock = blocks.length > 0 ? Math.round(totalStudents / blocks.length) : 0;
  const mostPopulatedBlock = blocks.reduce((max, block) => (block.student_count || 0) > (max.student_count || 0) ? block : max, blocks[0] || {});

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <BookOpen className="text-purple-400" size={32} />
              Blocks & Sections
            </h1>
            <p className="text-slate-400">Manage class blocks and course assignments</p>
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
              onClick={() => {
                setEditingBlock(null);
                setFormData({ block_number: '', course_name: '', description: '' });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-500/20"
            >
              <Plus size={20} />
              Create Block
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Blocks</p>
                <p className="text-2xl font-bold text-white">{blocks.length}</p>
              </div>
              <BookOpen className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Students</p>
                <p className="text-2xl font-bold text-white">{totalStudents}</p>
              </div>
              <Users className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Instructors</p>
                <p className="text-2xl font-bold text-white">{totalInstructors}</p>
              </div>
              <Users className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Students/Block</p>
                <p className="text-2xl font-bold text-white">{avgStudentsPerBlock}</p>
              </div>
              <BarChart3 className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by block number, course name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors min-w-[200px]"
          >
            <option value="all">All Blocks</option>
            <option value="high-student">High Student Count (≥20)</option>
            <option value="low-student">Low Student Count (&lt;20)</option>
            <option value="no-instructor">No Instructor Assigned</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedBlocks.length > 0 && (
        <div className="mb-4 bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedBlocks.length === filteredBlocks.length}
              onChange={handleSelectAll}
              className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
            />
            <span className="text-white font-medium">
              {selectedBlocks.length} block(s) selected
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
              onClick={() => setSelectedBlocks([])}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Showing {paginatedBlocks.length} of {filteredBlocks.length} results</span>
        {filteredBlocks.length > 0 && (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading blocks...</p>
        </div>
      ) : filteredBlocks.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <BookOpen size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Blocks Found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first block to get started'}
          </p>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Blocks Grid */}
          <div className="grid gap-4">
            {paginatedBlocks.map((block) => (
              <div 
                key={block.id} 
                className={`bg-slate-900 border rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${
                  selectedBlocks.includes(block.id) 
                    ? 'border-purple-500 bg-purple-900/10' 
                    : 'border-slate-800 hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedBlocks.includes(block.id)}
                      onChange={() => handleSelectBlock(block.id)}
                      className="mt-1 w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
                    />
                    <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                      <BookOpen size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">Block {block.block_number}</h3>
                        {(block.student_count || 0) > 20 && (
                          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">
                            High Enrollment
                          </span>
                        )}
                        {(block.instructor_count || 0) === 0 && (
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20">
                            No Instructor
                          </span>
                        )}
                      </div>
                      
                      {block.course_name && (
                        <p className="text-purple-300 font-medium mb-2">{block.course_name}</p>
                      )}
                      
                      {block.description && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{block.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                          <Users size={14} /> 
                          <span className="font-semibold text-white">{block.student_count || 0}</span> Students
                        </span>
                        <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                          <Users size={14} /> 
                          <span className="font-semibold text-white">{block.instructor_count || 0}</span> Instructors
                        </span>
                        {mostPopulatedBlock.id === block.id && blocks.length > 1 && (
                          <span className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                            <TrendingUp size={14} /> Most Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => handleEdit(block)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                      title="Edit Block"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(block.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete Block"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBlocks.length)} of {filteredBlocks.length} entries
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
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingBlock ? 'Edit Block' : 'Create New Block'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Block Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., 301"
                  value={formData.block_number}
                  onChange={(e) => setFormData({...formData, block_number: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Course Name</label>
                <input
                  type="text"
                  placeholder="e.g., Introduction to Programming"
                  value={formData.course_name}
                  onChange={(e) => setFormData({...formData, course_name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of the block..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                    editingBlock ? 'Update Block' : 'Create Block'
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

export default AdminBlocks;