import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Search, Filter, Calendar, Clock, 
  Users, MessageSquare, Eye, Download, Upload, Link, Image,
  FileText, AlertCircle, CheckCircle, XCircle, Info, Star,
  Send, Save, EyeOff, Bold, Italic, List, Link as LinkIcon,
  ChevronDown, MoreVertical, Pin, Archive, Bell
} from 'lucide-react';

function InstructorAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'update', // important, update, reminder, event
    priority: 'normal', // low, normal, high, urgent
    targetAudience: 'all', // all, specific_blocks, specific_students
    selectedBlocks: [],
    selectedStudents: [],
    scheduledDate: '',
    attachments: []
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/announcements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingAnnouncement 
        ? `http://localhost:5000/api/instructor/announcements/${editingAnnouncement.id}`
        : 'http://localhost:5000/api/instructor/announcements';
      
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        fetchAnnouncements();
        setShowForm(false);
        setEditingAnnouncement(null);
        setFormData({
          title: '',
          content: '',
          type: 'update',
          priority: 'normal',
          targetAudience: 'all',
          selectedBlocks: [],
          selectedStudents: [],
          scheduledDate: '',
          attachments: []
        });
        setPreviewMode(false);
        showNotification('success', editingAnnouncement ? 'Announcement updated successfully!' : 'Announcement posted successfully!');
      } else {
        const errorData = await response.json();
        showNotification('error', `Error: ${errorData.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'Failed to post announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchAnnouncements();
        showNotification('success', 'Announcement deleted successfully!');
      } else {
        showNotification('error', 'Failed to delete announcement');
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'An error occurred while deleting the announcement');
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'update',
      priority: announcement.priority || 'normal',
      targetAudience: announcement.target_audience || 'all',
      selectedBlocks: announcement.selected_blocks || [],
      selectedStudents: announcement.selected_students || [],
      scheduledDate: announcement.scheduled_date || '',
      attachments: announcement.attachments || []
    });
    setShowForm(true);
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

  const getTypeIcon = (type) => {
    switch(type) {
      case 'important': return <AlertCircle size={16} className="text-red-400" />;
      case 'update': return <Info size={16} className="text-blue-400" />;
      case 'reminder': return <Clock size={16} className="text-yellow-400" />;
      case 'event': return <Calendar size={16} className="text-purple-400" />;
      default: return <MessageSquare size={16} className="text-slate-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'normal': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'low': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'important': return 'border-red-500/30 bg-red-500/5';
      case 'update': return 'border-blue-500/30 bg-blue-500/5';
      case 'reminder': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'event': return 'border-purple-500/30 bg-purple-500/5';
      default: return 'border-slate-500/30 bg-slate-500/5';
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(ann => {
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ann.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || ann.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'published' && !ann.scheduled_date) ||
                         (statusFilter === 'scheduled' && ann.scheduled_date);
    
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && new Date(ann.created_at).toDateString() === new Date().toDateString()) ||
                       (dateFilter === 'week' && new Date(ann.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
                       (dateFilter === 'month' && new Date(ann.created_at).getMonth() === new Date().getMonth());
    
    return matchesSearch && matchesType && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/4"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Bell className="text-blue-400" size={32} />
          Announcements
        </h1>
        <p className="text-slate-400">Communicate important updates to your students</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingAnnouncement(null);
            setFormData({
              title: '',
              content: '',
              type: 'update',
              priority: 'normal',
              targetAudience: 'all',
              selectedBlocks: [],
              selectedStudents: [],
              scheduledDate: '',
              attachments: []
            });
            setPreviewMode(false);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20"
        >
          {showForm ? (
            <>
              <XCircle size={20} />
              Cancel
            </>
          ) : (
            <>
              <Plus size={20} />
              New Announcement
            </>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-colors w-64"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
          >
            <option value="all">All Types</option>
            <option value="important">Important</option>
            <option value="update">Update</option>
            <option value="reminder">Reminder</option>
            <option value="event">Event</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition flex items-center gap-2"
              >
                {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
                {previewMode ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!previewMode ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                      required
                      placeholder="Enter announcement title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Type *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="update">Update</option>
                        <option value="important">Important</option>
                        <option value="reminder">Reminder</option>
                        <option value="event">Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Priority *</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                        required
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Content *</label>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                    {/* Rich Text Toolbar */}
                    <div className="flex items-center gap-2 p-2 bg-slate-700/50 border-b border-slate-700">
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <Bold size={16} className="text-slate-300" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <Italic size={16} className="text-slate-300" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <List size={16} className="text-slate-300" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <LinkIcon size={16} className="text-slate-300" />
                      </button>
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <Image size={16} className="text-slate-300" />
                      </button>
                      <div className="flex-1"></div>
                      <button type="button" className="p-2 hover:bg-slate-600 rounded transition">
                        <Upload size={16} className="text-slate-300" />
                      </button>
                    </div>
                    <textarea
                      rows="8"
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      className="w-full bg-slate-800 px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                      required
                      placeholder="Write your announcement content here..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience *</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                      required
                    >
                      <option value="all">All Students</option>
                      <option value="specific_blocks">Specific Blocks</option>
                      <option value="specific_students">Specific Students</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Schedule (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Attachments</label>
                  <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-blue-500/50 transition cursor-pointer">
                    <Upload size={32} className="mx-auto text-slate-500 mb-2" />
                    <p className="text-slate-400 text-sm">Drag and drop files here, or click to select</p>
                    <p className="text-slate-500 text-xs mt-1">Supports: PDF, DOC, JPG, PNG (Max 10MB)</p>
                  </div>
                </div>
              </>
            ) : (
              /* Preview Mode */
              <div className={`p-6 rounded-lg border ${getTypeColor(formData.type)}`}>
                <div className="flex items-start gap-3 mb-4">
                  {getTypeIcon(formData.type)}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{formData.title || 'Untitled Announcement'}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(formData.priority)}`}>
                        {formData.priority.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {formData.targetAudience === 'all' ? 'All Students' : 
                         formData.targetAudience === 'specific_blocks' ? 'Selected Blocks' : 'Selected Students'}
                      </span>
                      {formData.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Scheduled: {new Date(formData.scheduledDate).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-slate-300 whitespace-pre-wrap">{formData.content || 'No content yet...'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAnnouncement(null);
                  setPreviewMode(false);
                }}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {editingAnnouncement ? 'Update Announcement' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            <MessageSquare size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Announcements Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters' 
                : 'Create your first announcement to communicate with students'}
            </p>
            {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredAnnouncements.map((ann) => (
            <div key={ann.id} className={`bg-slate-900 border rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${getTypeColor(ann.type)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  {getTypeIcon(ann.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{ann.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(ann.priority)}`}>
                        {ann.priority.toUpperCase()}
                      </span>
                      {ann.scheduled_date && (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20 flex items-center gap-1">
                          <Clock size={12} />
                          Scheduled
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {ann.target_audience === 'all' ? 'All Students' : 
                         ann.target_audience === 'specific_blocks' ? 'Selected Blocks' : 'Selected Students'}
                      </span>
                      <span>•</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>By {ann.author_name}</span>
                    </div>
                    
                    <div className="prose prose-invert max-w-none mb-4">
                      <p className="text-slate-300 whitespace-pre-wrap line-clamp-3">{ann.content}</p>
                    </div>

                    {ann.attachments && ann.attachments.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-400">{ann.attachments.length} attachment(s)</span>
                        <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                          <Download size={14} />
                          Download All
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {ann.read_count || 0} reads
                      </span>
                      {ann.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Posts: {new Date(ann.scheduled_date).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={() => handleEdit(ann)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                    title="Edit Announcement"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ann.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Announcement"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition"
                    title="More Options"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default InstructorAnnouncements;