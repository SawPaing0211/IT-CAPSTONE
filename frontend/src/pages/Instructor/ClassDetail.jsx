// class detail — 5-tab view for a specific section the instructor teaches.
// id from the URL is SubjectSection.id (not Block.id — blocks are gone).
//
// tabs: Lessons / Activities / Announcements / Plagiarism / Analytics
// each tab just renders its own component and passes classId down as a prop.
// no data is passed between tabs — each one fetches its own stuff independently.
//
// "at risk" = students with XP < 100. rough heuristic but useful at a glance.
// the "View Analytics" button in the old version did nothing — now it switches
// to the analytics tab directly.

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CourseMaterials  from './CourseMaterials'
import ProblemManagement from './ProblemManagement'
import Announcements    from './Announcements'
import PlagiarismCheck  from './PlagiarismCheck'
import Analytics        from './Analytics'

export default function ClassDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('lessons')
  const [classInfo, setClassInfo] = useState(null)
  const [stats, setStats]         = useState({ total: 0, problems: 0, atRisk: 0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const fetchClassDetail = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        const classRes = await fetch(`http://localhost:5000/api/instructor/classes/${id}`, { headers })
        if (classRes.ok) {
          const data = await classRes.json()
          setClassInfo(data)

          const studentsRes = await fetch(`http://localhost:5000/api/admin/sections/${id}/students`, { headers })
          if (studentsRes.ok) {
            const sData = await studentsRes.json()
            setStats({
              total:    sData.length,
              problems: data.problem_count || 0,
              atRisk:   sData.filter(s => s.xp < 100).length,
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

  const tabs = [
    { id: 'lessons',       label: '📚 Modules',      component: <CourseMaterials  classId={id} /> },
    { id: 'problems',      label: '📝 Activities',    component: <ProblemManagement classId={id} /> },
    { id: 'announcements', label: '📢 Announcements', component: <Announcements    classId={id} /> },
    { id: 'plagiarism',    label: '🔍 Plagiarism',    component: <PlagiarismCheck  classId={id} /> },
    { id: 'analytics',     label: '📊 Analytics',     component: <Analytics        classId={id} /> },
  ]

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      <p className="text-slate-400 text-sm animate-pulse">Loading class data...</p>
    </div>
  )

  if (!classInfo) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400">
      <span className="text-4xl">⚠️</span>
      <p className="font-medium">Failed to load class information</p>
      <button onClick={() => navigate('/instructor/classes')} className="text-slate-400 hover:text-white text-sm transition">
        ← Back to classes
      </button>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instructor/classes')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm transition"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white">{classInfo.section_no}</h1>
              <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {classInfo.subjects?.join(' · ') || classInfo.name}
              {classInfo.semester ? ` · ${classInfo.semester}` : ''}
            </p>
          </div>
        </div>

        {/* fixed: was a dead button before, now actually switches to analytics tab */}
        <button
          onClick={() => setActiveTab('analytics')}
          className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/20 text-purple-400 hover:text-purple-300 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          📊 View Analytics
        </button>
      </div>

      {/* ── Stats Strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Students',  value: stats.total,             icon: '👥', border: 'border-l-purple-500', text: 'text-purple-400' },
          { label: 'Problems',  value: stats.problems,          icon: '📝', border: 'border-l-blue-500',   text: 'text-blue-400'   },
          { label: 'At Risk',   value: stats.atRisk,            icon: '⚠️', border: stats.atRisk > 0 ? 'border-l-red-500' : 'border-l-green-500', text: stats.atRisk > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Semester',  value: classInfo.semester || '—', icon: '📅', border: 'border-l-slate-600', text: 'text-slate-300'  },
        ].map(s => (
          <div key={s.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${s.border} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.text} tabular-nums`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
              <span>{s.icon}</span> {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1 overflow-x-auto pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-t-xl text-sm font-medium transition whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'bg-purple-600/10 text-purple-300 border-purple-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <div className="min-h-[400px]">
        {tabs.find(t => t.id === activeTab)?.component}
      </div>
    </div>
  )
}
