import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CourseMaterials from './CourseMaterials'
import ProblemManagement from './ProblemManagement'
import Announcements from './Announcements'
import PlagiarismCheck from './PlagiarismCheck'
import Analytics from './Analytics'

export default function ClassDetail() {
  const navigate = useNavigate()
  const { id } = useParams()          // SubjectSection.id
  const [activeTab, setActiveTab] = useState('lessons')
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({ total: 0, problems: 0, avg: 0, atRisk: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchClassDetail = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        // ✅ id here is SubjectSection.id — the backend get_instructor_class_detail
        //    accepts this and returns block_id in the response.
        const classRes = await fetch(`http://localhost:5000/api/instructor/classes/${id}`, { headers })
        if (classRes.ok) {
          const data = await classRes.json()
          setClassInfo(data)

          const blockId = data.block_id ?? id
          const studentsRes = await fetch(
            `http://localhost:5000/api/admin/sections/${id}/students`,
            { headers }
          )
          if (studentsRes.ok) {
            const sData = await studentsRes.json()
            setStudents(sData)
            const atRisk = sData.filter(s => s.xp < 100).length
            setStats({
              total: sData.length,
              problems: data.problem_count || 0,
              avg: 0,
              atRisk,
            })
          }
        }
      } catch (err) {
        console.error('Failed to fetch class detail:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClassDetail()
  }, [id])

  const filtered = students.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const getStatus = (xp) => {
    if (xp >= 500) return 'On Track'
    if (xp >= 100) return 'Needs Attention'
    return 'At Risk'
  }

  const tabs = [
    { id: 'lessons',       label: '📚 Modules',       component: <CourseMaterials classId={id} /> },
    { id: 'problems',      label: '📝 Activities',     component: <ProblemManagement classId={id} /> },
    { id: 'announcements', label: '📢 Announcements',  component: <Announcements classId={id} /> },
    { id: 'plagiarism',    label: '🔍 Plagiarism',     component: <PlagiarismCheck classId={id} /> },
    { id: 'analytics',     label: '📊 Analytics',      component: <Analytics classId={id} /> },
  ]

  const activeComponent = tabs.find(t => t.id === activeTab)?.component

  if (loading) return (
    <div className="text-center py-20 text-slate-400">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
      Loading class data...
    </div>
  )

  if (!classInfo) return (
    <div className="text-center py-20 text-red-400">
      Failed to load class information
    </div>
  )

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
              {/* ✅ FIX: section_code is the human-readable block code e.g. "IT101" */}
              <h1 className="text-3xl font-bold text-white">
                {classInfo.section_code}
              </h1>
              {/* ✅ Show section_no as secondary identifier */}
              {classInfo.section_no && (
                <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs font-mono">
                  #{classInfo.section_no}
                </span>
              )}
              <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold border border-green-600/30">
                Active
              </span>
            </div>
            {/* ✅ FIX: subjects is an array from the backend */}
            <p className="text-slate-400">
              {classInfo.subjects?.join(' · ') || classInfo.name}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition">
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students',   value: stats.total,    icon: '👥', color: 'text-blue-400'   },
          { label: 'Problems',   value: stats.problems, icon: '📝', color: 'text-purple-400' },
          { label: 'At Risk',    value: stats.atRisk,   icon: '⚠️', color: 'text-red-400'    },
          { label: 'Semester',   value: classInfo.semester || '—', icon: '📅', color: 'text-slate-300' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-black ${s.color} tabular-nums`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
              <span>{s.icon}</span> {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeComponent}
      </div>
    </div>
  )
}
