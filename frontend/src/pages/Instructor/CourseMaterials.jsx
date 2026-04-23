import { useState } from 'react'

export default function CourseMaterials() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Course Materials & Lessons</h1>
          <p className="text-slate-400">Create structured learning modules with file attachments</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition shadow-lg shadow-green-600/20"
        >
          ➕ New Lesson
        </button>
      </div>

      {showCreateForm ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New Lesson</h2>
            <button 
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Lesson Title *</label>
              <input 
                type="text" 
                placeholder="e.g., Introduction to Python Lists"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Order Index</label>
              <input 
                type="number" 
                defaultValue="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">Determines the order in the skill tree</p>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Content (Markdown Supported) *</label>
            <textarea 
              rows="10"
              placeholder="Write your lesson content here... Use ```python for code blocks."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none resize-none"
            />
            <div className="flex justify-end mt-2">
              <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 transition">
                {'<>'} Insert Code Block
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Attach Files (PDF, Docs, Images, etc.)</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition cursor-pointer">
              <div className="text-4xl mb-2">📎</div>
              <p className="text-slate-400 text-sm">Click to select files or drag and drop here</p>
              <p className="text-slate-600 text-xs mt-1">Supported: PDF, Word, PowerPoint, Images, ZIP (Max 16MB each)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Video URL (Optional)</label>
              <input 
                type="url" 
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Link to Practice Problem</label>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
                <option>No Linked Problem</option>
                <option>Hello World</option>
                <option>Fibonacci Sequence</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
            <input type="checkbox" className="w-5 h-5 rounded border-slate-600 text-green-600" />
            <div>
              <p className="text-white font-medium">Publish Immediately</p>
              <p className="text-slate-400 text-sm">Make this lesson visible to students</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button 
              onClick={() => setShowCreateForm(false)}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition"
            >
              Cancel
            </button>
            <button className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold transition shadow-lg shadow-green-600/20">
              📚 Create Lesson
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-slate-400 text-lg mb-2">No Lessons Created Yet</p>
          <p className="text-slate-500 mb-6">Start by creating your first learning module above.</p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition"
          >
            Create First Lesson
          </button>
        </div>
      )}
    </div>
  )
}