import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Video, FileText, Link as LinkIcon, 
  Save, Eye, EyeOff, Code, Loader2, BookOpen, CheckCircle, XCircle,
  Upload, Download, File, Image, FileArchive, FileType
} from 'lucide-react';

function InstructorLessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    video_url: '',
    linked_problem_id: '',
    resources: [],
    order_index: 0,
    is_published: false
  });

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [lessonFiles, setLessonFiles] = useState([]);

  // Mock Problems List
  const [availableProblems, setAvailableProblems] = useState([]);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      } else {
        console.error('Failed to fetch lessons');
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonFiles = async (lessonId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/lessons/${lessonId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessonFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const token = localStorage.getItem('token');
    
    // If editing, upload to existing lesson, otherwise wait until lesson is created
    if (editingLesson) {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await fetch(`http://localhost:5000/api/instructor/lessons/${editingLesson.id}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          
          if (response.ok) {
            showNotification('success', `${file.name} uploaded successfully!`);
          } else {
            showNotification('error', `Failed to upload ${file.name}`);
          }
        } catch (err) {
          console.error('Upload error:', err);
          showNotification('error', `Error uploading ${file.name}`);
        }
      }
      fetchLessonFiles(editingLesson.id);
    } else {
      // For new lessons, store files temporarily
      setSelectedFiles([...selectedFiles, ...files]);
      showNotification('success', `${files.length} file(s) selected. They will be uploaded when you create the lesson.`);
    }
    
    setUploadingFiles(false);
    e.target.value = ''; // Reset file input
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/lessons/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchLessonFiles(editingLesson.id);
        showNotification('success', 'File deleted successfully!');
      } else {
        showNotification('error', 'Failed to delete file');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('error', 'Error deleting file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = editingLesson 
        ? `http://localhost:5000/api/instructor/lessons/${editingLesson.id}`
        : 'http://localhost:5000/api/instructor/lessons';
      
      const method = editingLesson ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If creating new lesson and have files to upload
        if (!editingLesson && selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            const fileFormData = new FormData();
            fileFormData.append('file', file);
            
            await fetch(`http://localhost:5000/api/instructor/lessons/${data.id}/upload`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: fileFormData
            });
          }
        }
        
        fetchLessons();
        setShowForm(false);
        setEditingLesson(null);
        resetForm();
        setSelectedFiles([]);
        showNotification('success', editingLesson ? 'Lesson updated successfully!' : 'Lesson created successfully!');
      } else {
        const errorData = await response.json();
        showNotification('error', `Error: ${errorData.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'Failed to save lesson');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lesson? This cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/lessons/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchLessons();
        showNotification('success', 'Lesson deleted successfully!');
      } else {
        showNotification('error', 'Failed to delete lesson');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      showNotification('error', 'An error occurred');
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      content: lesson.content,
      video_url: lesson.video_url || '',
      linked_problem_id: lesson.linked_problem_id || '',
      resources: lesson.resources || [],
      order_index: lesson.order_index,
      is_published: lesson.is_published === 1
    });
    fetchLessonFiles(lesson.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      video_url: '',
      linked_problem_id: '',
      resources: [],
      order_index: 0,
      is_published: false
    });
    setLessonFiles([]);
    setSelectedFiles([]);
  };

  const insertCodeSnippet = () => {
    const codeTemplate = "\n```python\n# Write your code here\ndef solve():\n    pass\n```\n";
    setFormData({ ...formData, content: formData.content + codeTemplate });
  };

  const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        ${type === 'success' ? '<CheckCircle size={20} />' : '<XCircle size={20} />'}
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const getFileIcon = (fileType) => {
    switch(fileType) {
      case 'pdf': return <FileText size={16} className="text-red-400" />;
      case 'doc': case 'docx': return <FileText size={16} className="text-blue-400" />;
      case 'ppt': case 'pptx': return <FileText size={16} className="text-orange-400" />;
      case 'jpg': case 'jpeg': case 'png': return <Image size={16} className="text-purple-400" />;
      case 'zip': case 'rar': return <FileArchive size={16} className="text-yellow-400" />;
      default: return <FileType size={16} className="text-slate-400" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 size={48} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-green-400" size={32} />
            Course Materials & Lessons
          </h1>
          <p className="text-slate-400 mt-1">Create structured learning modules with file attachments</p>
        </div>
        <button
          onClick={() => { 
            setShowForm(!showForm); 
            if (!showForm) {
              setEditingLesson(null);
              resetForm();
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition shadow-lg shadow-green-500/20"
        >
          {showForm ? (
            <>
              <XCircle size={20} /> Cancel
            </>
          ) : (
            <>
              <Plus size={20} /> New Lesson
            </>
          )}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-8 bg-slate-900 border border-slate-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Lesson Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                  required
                  placeholder="e.g., Introduction to Python Lists"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Order Index</label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-1">Determines the order in the skill tree.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Content (Markdown Supported) *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={insertCodeSnippet}
                  className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white flex items-center gap-1 transition-colors"
                >
                  <Code size={14} /> Insert Code Block
                </button>
                <textarea
                  rows="10"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-green-500 outline-none transition-colors resize-none"
                  required
                  placeholder="Write your lesson content here... Use ```python for code blocks."
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Attach Files (PDF, Docs, Images, etc.)</label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-green-500/50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload size={32} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-slate-400 text-sm mb-1">
                    {uploadingFiles ? 'Uploading...' : 'Click to select files or drag and drop here'}
                  </p>
                  <p className="text-slate-500 text-xs">
                    Supported: PDF, Word, PowerPoint, Images, ZIP (Max 16MB each)
                  </p>
                </label>
              </div>
              
              {/* Selected Files for New Lesson */}
              {!editingLesson && selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-400">Files to be uploaded:</p>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <File size={16} className="text-blue-400" />
                        <span className="text-sm text-white">{file.name}</span>
                        <span className="text-xs text-slate-500">({formatFileSize(file.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Existing Files for Edit Mode */}
              {editingLesson && lessonFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-slate-400">Attached files:</p>
                  {lessonFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.file_type)}
                        <div>
                          <span className="text-sm text-white">{file.original_name}</span>
                          <span className="text-xs text-slate-500 ml-2">({formatFileSize(file.file_size)})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://localhost:5000/api/download/file/${file.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Video URL (Optional)</label>
                <input
                  type="text"
                  value={formData.video_url}
                  onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Link to Practice Problem</label>
                <select
                  value={formData.linked_problem_id}
                  onChange={(e) => setFormData({...formData, linked_problem_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-green-500 outline-none transition-colors"
                >
                  <option value="">No Linked Problem</option>
                  <option value="1">Hello World Challenge</option>
                  <option value="2">Loop Basics</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <input
                type="checkbox"
                id="publish"
                checked={formData.is_published}
                onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                className="w-5 h-5 accent-green-500 rounded"
              />
              <label htmlFor="publish" className="text-sm text-slate-300 cursor-pointer select-none">
                <strong>Publish Immediately</strong> - Make this lesson visible to students.
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={submitting || uploadingFiles}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
              >
                {(submitting || uploadingFiles) ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} /> {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons List */}
      <div className="space-y-4">
        {lessons.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
            <BookOpen size={64} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Lessons Created Yet</h3>
            <p className="text-slate-400 mb-6">Start by creating your first learning module above.</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition"
            >
              Create First Lesson
            </button>
          </div>
        ) : (
          lessons.map((lesson) => (
            <div 
              key={lesson.id} 
              className={`bg-slate-900 border rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${
                lesson.is_published ? 'border-green-500/30 hover:border-green-500/50' : 'border-slate-700 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded border border-slate-700">
                      #{lesson.order_index}
                    </span>
                    <h3 className="text-xl font-bold text-white">{lesson.title}</h3>
                    {lesson.is_published ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                        <Eye size={12} /> Published
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
                        <EyeOff size={12} /> Draft
                      </span>
                    )}
                  </div>
                  
                  {lesson.video_url && (
                    <div className="flex items-center gap-2 text-sm text-blue-400 mb-2">
                      <Video size={16} />
                      <a href={lesson.video_url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-md">
                        Watch Video Lecture
                      </a>
                    </div>
                  )}
                  
                  {lesson.linked_problem_title && (
                    <div className="flex items-center gap-2 text-sm text-purple-400 mb-3">
                      <LinkIcon size={16} />
                      <span>Linked Practice: <strong>{lesson.linked_problem_title}</strong></span>
                    </div>
                  )}

                  <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800 max-h-24 overflow-y-auto text-sm text-slate-300 whitespace-pre-wrap font-mono">
                    {lesson.content.substring(0, 150)}...
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button 
                    onClick={() => handleEdit(lesson)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                    title="Edit Lesson"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(lesson.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Lesson"
                  >
                    <Trash2 size={18} />
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

export default InstructorLessons;