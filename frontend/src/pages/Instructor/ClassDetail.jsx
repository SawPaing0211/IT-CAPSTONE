import { useNavigate } from 'react-router-dom'

export default function ClassDetail() {
  const navigate = useNavigate()
  
  // Mock Data
  const students = [
    { id: 1, name: 'Ohma', email: 'ohma@gmail.com', xp: 1250, level: 5, status: 'On Track' },
    { id: 2, name: 'Ganryu', email: 'ganryu@gmail.com', xp: 800, level: 3, status: 'Needs Attention' },
    { id: 3, name: 'NewUser', email: 'new@test.com', xp: 100, level: 1, status: 'At Risk' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/instructor/classes')} className="text-slate-400 hover:text-white transition">
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Block 301</h1>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold border border-green-600/30">Active</span>
            </div>
            <p className="text-slate-400">Introduction to Programming 1</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition">
            📊 View Analytics
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition">
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* Class Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-white">15</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active Problems</p>
          <p className="text-2xl font-bold text-white">8</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg Score</p>
          <p className="text-2xl font-bold text-green-400">82%</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">At Risk</p>
          <p className="text-2xl font-bold text-red-400">2</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Students</h2>
          <input 
            type="text" 
            placeholder="Search students..." 
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none"
          />
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Level</th>
              <th className="p-4 font-medium">XP</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-slate-800/30 transition">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {student.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-white">{student.name}</p>
                      <p className="text-slate-500 text-xs">{student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300">
                    Lvl {student.level}
                  </span>
                </td>
                <td className="p-4 text-yellow-400 font-mono font-bold">{student.xp} XP</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    student.status === 'On Track' ? 'bg-green-600/20 text-green-400' :
                    student.status === 'Needs Attention' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-red-600/20 text-red-400'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">View Progress</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}