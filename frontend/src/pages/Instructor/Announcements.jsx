import { useState } from 'react'

export default function Announcements() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filter, setFilter] = useState('All')

  // Mock Data
  const announcements = [
    {
      id: 1,
      title: 'Midterm Exam Schedule',
      type: 'Update',
      priority: 'High',
      content: 'The midterm exam will be held on April 30th. Please review the study guide.',
      author: 'TheGreatMage',
      date: '2024-04-20',
      audience: 'All Students',
      status: 'Published'
    }
  ]

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Announcement</h1>
            <p className="text-slate-400">Communicate important updates to your students</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(false)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition"
          >
            ✕ Cancel
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Title *</label>
              <input 
                type="text" 
                placeholder="Enter announcement title"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Type *</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
                  <option>Update</option>
                  <option>Reminder</option>
                  <option>Important</option>
                  <option>Event</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Priority *</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Content *</label>
            <textarea 
              rows="8"
              placeholder="Write your announcement content here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Target Audience *</label>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
                <option>All Students</option>
                <option>Block 301</option>
                <option>Block 302</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Schedule (Optional)</label>
              <input 
                type="datetime-local"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Attachments</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition cursor-pointer">
              <div className="text-4xl mb-2">📎</div>
              <p className="text-slate-400 text-sm">Drag and drop files here, or click to select</p>
              <p className="text-slate-600 text-xs mt-1">Supports: PDF, DOC, JPG, PNG (Max 10MB)</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button 
              onClick={() => setShowCreateForm(false)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition"
            >
              Cancel
            </button>
            <button className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition shadow-lg shadow-blue-600/20">
              📢 Post Announcement
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Announcements</h1>
          <p className="text-slate-400">Communicate important updates to your students</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20"
        >
          ➕ Create Announcement
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <input 
          type="text" 
          placeholder="Search announcements..." 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
        />
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none">
          <option>All Types</option>
          <option>Update</option>
          <option>Reminder</option>
        </select>
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none">
          <option>All Status</option>
          <option>Published</option>
          <option>Scheduled</option>
          <option>Draft</option>
        </select>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map(ann => (
          <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{ann.title}</h3>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ann.type === 'Update' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                  }`}>
                    {ann.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ann.priority === 'High' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400'
                  }`}>
                    {ann.priority}
                  </span>
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold">
                    {ann.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">{ann.date}</p>
                <p className="text-slate-500 text-xs">by {ann.author}</p>
              </div>
            </div>
            <p className="text-slate-300 mb-4">{ann.content}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-slate-500 text-sm">👥 {ann.audience}</span>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition">
                  ✏️ Edit
                </button>
                <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 text-sm font-medium transition">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-5xl mb-4">📢</div>
            <p className="text-slate-400 text-lg mb-2">No Announcements Found</p>
            <p className="text-slate-500 mb-6">Create your first announcement to communicate with students</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition"
            >
              Create Announcement
            </button>
          </div>
        )}
      </div>
    </div>
  )
}