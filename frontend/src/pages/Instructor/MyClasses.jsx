import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MyClasses() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setClasses(data.map(c => ({
          id: c.id,
          name: c.section_code,
          title: c.name,
          description: c.semester || 'No description',
          students: c.student_count || 0,
          problems: c.problem_count || 0,
          lessons: c.lesson_count || 0,
          announcements: c.announcement_count || 0,   
          status: 'Active',
          color: 'bg-blue-600'
        })))
      } catch (err) {
        console.error('Failed to fetch classes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Classes</h1>
          <p className="text-slate-400">View and manage your assigned class blocks</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20">
          ➕ Create Class
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by block number or course name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 pl-12 text-white focus:border-blue-500 outline-none transition"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">🔍</span>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400">
          Loading classes...
        </div>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredClasses.map(cls => (
          <div 
            key={cls.id} 
            onClick={() => navigate(`/instructor/class/${cls.id}`)}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 hover:bg-slate-800/50 transition cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 ${cls.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition`}>
                  🏫
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white">{cls.name}</h3>
                    <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold border border-green-600/30">
                      {cls.status}
                    </span>
                  </div>
                  <p className="text-purple-400 font-medium mb-1">{cls.title}</p>
                  <p className="text-slate-500 text-sm mb-4">{cls.description}</p>
                  
                  {/* ✅ Fixed stats section - all in one flex container */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                      <span className="text-lg">👥</span>
                      <span className="text-white font-bold">{cls.students}</span>
                      <span className="text-slate-500 text-sm">Students</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                      <span className="text-lg">📝</span>
                      <span className="text-white font-bold">{cls.problems}</span>
                      <span className="text-slate-500 text-sm">Problems</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                      <span className="text-lg">📚</span>
                      <span className="text-white font-bold">{cls.lessons}</span>
                      <span className="text-slate-500 text-sm">Lessons</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
                      <span className="text-lg">📢</span>
                      <span className="text-white font-bold">{cls.announcements}</span>
                      <span className="text-slate-500 text-sm">Announcements</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-slate-500 group-hover:text-white transition text-2xl">
                →
              </div>
            </div>
          </div>
        ))}

        {filteredClasses.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-5xl mb-4">🏫</div>
            <p className="text-slate-400 text-lg mb-2">No classes found</p>
            <p className="text-slate-500">Try adjusting your search terms</p>
          </div>
        )}
      </div>
    </div>
  )
}