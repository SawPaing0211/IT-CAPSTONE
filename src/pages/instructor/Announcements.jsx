import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  MessageSquare, 
  Bell, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Eye,
  X,
  Pin,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  FileText,
  Clock,
  Archive,
  Send,
  LayoutTemplate // Fixed: Changed from 'Template' to 'LayoutTemplate'
} from 'lucide-react';

function InstructorAnnouncements() {
  const [activeTab, setActiveTab] = useState('active'); // active, archived
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'Normal',
    targetBlock: 'all',
    publishDate: new Date().toISOString().split('T')[0],
    isScheduled: false,
    sendEmail: true,
    attachments: []
  });

  // Mock Data
  const [announcements, setAnnouncements] = useState([
    { 
      id: 1, 
      title: 'Midterm Exam Schedule Released', 
      message: '<b>Important:</b> The midterm exam will be held on <i>April 25th</i>. Please review the study guide.', 
      priority: 'Important', 
      block: '301', 
      author: 'Prof. Sasan', 
      date: '2026-04-15', 
      views: 42, 
      readCount: 38,
      totalStudents: 45,
      pinned: true,
      archived: false,
      scheduled: false,
      attachments: ['study_guide.pdf']
    },
    { 
      id: 2, 
      title: 'Assignment #3 Deadline Extended', 
      message: 'Due to high demand, the deadline has been extended to next Friday.', 
      priority: 'Normal', 
      block: 'all', 
      author: 'Prof. Sasan', 
      date: '2026-04-14', 
      views: 38, 
      readCount: 30,
      totalStudents: 142,
      pinned: false,
      archived: false,
      scheduled: false,
      attachments: []
    },
    { 
      id: 3, 
      title: 'Lab Session Cancelled', 
      message: 'Tomorrow\'s lab session is cancelled due to maintenance.', 
      priority: 'Urgent', 
      block: '302', 
      author: 'Prof. Sasan', 
      date: '2026-04-20', // Future date
      views: 0, 
      readCount: 0,
      totalStudents: 28,
      pinned: false,
      archived: false,
      scheduled: true,
      attachments: []
    },
    { 
      id: 4, 
      title: 'Old Welcome Message', 
      message: 'Welcome to the new semester!', 
      priority: 'Normal', 
      block: 'all', 
      author: 'Prof. Sasan', 
      date: '2026-01-10', 
      views: 120, 
      readCount: 115,
      totalStudents: 142,
      pinned: false,
      archived: true,
      scheduled: false,
      attachments: []
    },
  ]);

  // Templates
  const templates = [
    { title: 'Exam Schedule', message: 'The upcoming exam for [Subject] will be held on [Date]. Please prepare accordingly.' },
    { title: 'Deadline Extension', message: 'The deadline for [Assignment] has been extended to [New Date].' },
    { title: 'Class Cancellation', message: 'Please note that the class scheduled for [Date] is cancelled due to [Reason].' },
  ];

  // Filter Logic
  const filteredAnnouncements = announcements.filter(ann => {
    if (activeTab === 'archived' && !ann.archived) return false;
    if (activeTab === 'active' && ann.archived) return false;
    
    const matchesSearch = ann.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ann.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBlock = filterBlock === 'all' || ann.block === filterBlock;
    const matchesPriority = filterPriority === 'all' || ann.priority === filterPriority;
    return matchesSearch && matchesBlock && matchesPriority;
  });

  // Sort: Pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  const handleOpenModal = (id = null) => {
    if (id) {
      const ann = announcements.find(a => a.id === id);
      setFormData({
        title: ann.title,
        message: ann.message.replace(/<[^>]*>?/gm, ''), // Strip HTML for edit
        priority: ann.priority,
        targetBlock: ann.block,
        publishDate: ann.date,
        isScheduled: ann.scheduled,
        sendEmail: true,
        attachments: ann.attachments
      });
      setEditingId(id);
    } else {
      setFormData({
        title: '',
        message: '',
        priority: 'Normal',
        targetBlock: 'all',
        publishDate: new Date().toISOString().split('T')[0],
        isScheduled: false,
        sendEmail: true,
        attachments: []
      });
      setEditingId(null);
    }
    setPreviewMode(false);
    setIsModalOpen(true);
  };

  const applyTemplate = (template) => {
    setFormData({...formData, title: template.title, message: template.message});
  };

  const insertFormat = (tag) => {
    const textarea = document.getElementById('announcement-message');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.message;
    const selectedText = text.substring(start, end);
    
    let formattedText = '';
    if (tag === 'bold') formattedText = `<b>${selectedText || 'bold text'}</b>`;
    if (tag === 'italic') formattedText = `<i>${selectedText || 'italic text'}</i>`;
    if (tag === 'list') formattedText = `<ul><li>${selectedText || 'list item'}</li></ul>`;
    
    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setFormData({...formData, message: newText});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      setAnnouncements(announcements.map(a => 
        a.id === editingId ? { ...a, ...formData, message: formData.message } : a
      ));
    } else {
      const newAnn = {
        id: Date.now(),
        ...formData,
        author: 'Prof. Sasan',
        views: 0,
        readCount: 0,
        totalStudents: formData.targetBlock === 'all' ? 142 : 25, // Mock count
        pinned: false,
        archived: false
      };
      setAnnouncements([newAnn, ...announcements]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const handleArchive = (id) => {
    setAnnouncements(announcements.map(a => 
      a.id === id ? { ...a, archived: !a.archived } : a
    ));
  };

  const togglePin = (id) => {
    setAnnouncements(announcements.map(a => 
      a.id === id ? { ...a, pinned: !a.pinned } : a
    ));
  };

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const priorities = ['all', 'Normal', 'Important', 'Urgent'];

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Important': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getReadPercentage = (read, total) => {
    if (total === 0) return 0;
    return Math.round((read / total) * 100);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eab308]/10 rounded-xl">
            <MessageSquare size={24} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Announcements</h2>
            <p className="text-gray-400 text-sm">Communicate with your students effectively</p>
          </div>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          {/* Tabs */}
          <div className="flex gap-2 bg-[#0f172a] p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'active' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'archived' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              Archived
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>
            
            <select 
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
            >
              {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
            </select>

            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
            >
              {priorities.map(p => <option key={p} value={p}>{p === 'all' ? 'All Priorities' : p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {sortedAnnouncements.length > 0 ? (
          sortedAnnouncements.map((ann) => (
            <div key={ann.id} className={`bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border p-6 transition hover:border-gray-600 ${ann.pinned ? 'border-[#eab308]/50 shadow-lg shadow-yellow-500/5' : 'border-gray-700'}`}>
              
              {/* Header Row */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {ann.pinned && <Pin size={14} className="text-[#eab308]" />}
                    {ann.scheduled && !ann.archived && (
                      <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                        <Clock size={12} /> Scheduled
                      </span>
                    )}
                    {ann.archived && (
                      <span className="flex items-center gap-1 text-xs bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20">
                        <Archive size={12} /> Archived
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(ann.priority)}`}>
                      {ann.priority}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{ann.block === 'all' ? 'All Blocks' : `Block ${ann.block}`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{ann.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      <span>{ann.views} views</span>
                    </div>
                    
                    {/* Read Receipt Badge */}
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 size={14} />
                      <span>{getReadPercentage(ann.readCount, ann.totalStudents)}% read ({ann.readCount}/{ann.totalStudents})</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!ann.archived && (
                    <>
                      <button onClick={() => togglePin(ann.id)} className={`p-2 rounded-lg transition ${ann.pinned ? 'text-[#eab308] bg-[#eab308]/10' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'}`} title="Pin"><Pin size={18} /></button>
                      <button onClick={() => handleOpenModal(ann.id)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit"><Edit2 size={18} /></button>
                      <button onClick={() => handleArchive(ann.id)} className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition" title="Archive"><Archive size={18} /></button>
                    </>
                  )}
                  <button onClick={() => handleDelete(ann.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* Message Body (Render HTML safely in real app) */}
              <div className="bg-[#0f172a]/50 p-4 rounded-lg border border-gray-800 text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: ann.message }} />
              
              {/* Attachments */}
              {ann.attachments.length > 0 && (
                <div className="mt-4 flex gap-2">
                  {ann.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                      <FileText size={14} className="text-blue-400" />
                      {file}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-[#1e293b] rounded-xl border border-gray-700">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Announcements Found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or create a new announcement.</p>
            <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition">Create First Announcement</button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal with Rich Text & Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0f172a]">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${previewMode ? 'bg-[#eab308] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  {previewMode ? <Edit2 size={14} /> : <Eye size={14} />}
                  {previewMode ? 'Edit' : 'Preview'}
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {previewMode ? (
                // PREVIEW MODE
                <div className="bg-white text-gray-900 p-6 rounded-lg min-h-[300px]">
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{formData.title || 'Title Preview'}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(formData.priority).replace('/10', '/20').replace('bg-', 'bg-opacity-20 bg-')}`}>
                      {formData.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4 flex gap-4">
                    <span>📅 {formData.publishDate}</span>
                    <span> {formData.targetBlock === 'all' ? 'All Blocks' : `Block ${formData.targetBlock}`}</span>
                  </div>
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: formData.message || '<p class="text-gray-400">Message content will appear here...</p>' }} />
                  {formData.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <p className="text-sm font-bold mb-2">Attachments:</p>
                      <div className="flex gap-2">
                        {formData.attachments.map((f, i) => <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded border">{f}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // EDIT MODE
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Templates */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Quick Templates</label>
                    <div className="flex gap-2">
                      {templates.map((t, i) => (
                        <button key={i} type="button" onClick={() => applyTemplate(t)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300 hover:border-[#eab308] hover:text-[#eab308] transition">
                          <LayoutTemplate size={12} /> {t.title} {/* Fixed icon */}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Title *</label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Message *</label>
                    {/* Fake Rich Text Toolbar */}
                    <div className="flex gap-1 mb-2 p-1 bg-[#0f172a] border border-gray-700 rounded-t-lg w-fit">
                      <button type="button" onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Bold"><Bold size={16} /></button>
                      <button type="button" onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Italic"><Italic size={16} /></button>
                      <button type="button" onClick={() => insertFormat('list')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="List"><List size={16} /></button>
                      <button type="button" onClick={() => insertFormat('link')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300" title="Link"><LinkIcon size={16} /></button>
                    </div>
                    <textarea 
                      id="announcement-message"
                      required rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full bg-[#0f172a] border border-gray-700 rounded-b-lg px-4 py-3 text-white focus:border-[#eab308] focus:outline-none resize-none font-mono text-sm"
                      placeholder="Type your message here. Use the toolbar above for formatting..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Priority *</label>
                      <select required value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none">
                        <option value="Normal">Normal</option>
                        <option value="Important">Important</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Target Block *</label>
                      <select required value={formData.targetBlock} onChange={(e) => setFormData({...formData, targetBlock: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none">
                        {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Publish Date</label>
                      <input type="date" value={formData.publishDate} onChange={(e) => setFormData({...formData, publishDate: e.target.value})} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none" />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.isScheduled} onChange={(e) => setFormData({...formData, isScheduled: e.target.checked})} className="w-4 h-4 accent-[#eab308]" />
                        <span className="text-sm text-gray-300">Schedule for later</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Attachments (Mock)</label>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-[#eab308] transition cursor-pointer">
                      <FileText size={24} className="mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Click to upload files (PDF, Images)</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.sendEmail} onChange={(e) => setFormData({...formData, sendEmail: e.target.checked})} className="w-4 h-4 accent-[#eab308]" />
                      <span className="text-sm text-gray-300 flex items-center gap-2"><Send size={14} /> Send email notification to students</span>
                    </label>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button type="submit" className="flex-1 px-6 py-3 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg font-bold transition">
                      {editingId ? 'Update Announcement' : 'Post Announcement'}
                    </button>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg font-medium transition">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorAnnouncements;