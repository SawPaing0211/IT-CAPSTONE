import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CourseMaterials from './CourseMaterials'
import ProblemManagement from './ProblemManagement'
import Announcements from './Announcements'
import PlagiarismCheck from './PlagiarismCheck'
import Analytics from './Analytics'
import ModuleIcon from './ModuleIcon'
import { API_BASE, authFetch } from '../../api/client'
import './InstructorModules.css'
import InstructorBackButton from '../../components/InstructorBackButton'

export default function ClassDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('lessons')
  const [classInfo, setClassInfo] = useState(null)
  const [atRisk, setAtRisk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rosterError, setRosterError] = useState(false)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    async function load() {
      setLoading(true); setError(false); setAtRisk(null); setRosterError(false)
      try {
        const response = await authFetch(`${API_BASE}/api/instructor/classes/${id}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Class unavailable')
        const data = await response.json()
        if (!data?.id || data.id !== Number(id)) throw new Error('Invalid class')
        if (current) setClassInfo(data)
        try {
          const roster = await authFetch(`${API_BASE}/api/admin/sections/${id}/students`, { signal: controller.signal })
          if (!roster.ok) throw new Error('Roster unavailable')
          const students = await roster.json()
          if (!Array.isArray(students)) throw new Error('Invalid roster')
          if (current) setAtRisk(students.filter(student => student.xp < 100).length)
        } catch { if (current) setRosterError(true) }
      } catch { if (current) setError(true) }
      finally { if (current) setLoading(false) }
    }
    load()
    return () => { current = false; controller.abort() }
  }, [id, reload])

  const tabs = [
    { id: 'lessons', label: 'Modules', icon: 'book' },
    { id: 'problems', label: 'Activities', icon: 'file' },
    { id: 'announcements', label: 'Announcements', icon: 'announcement' },
    { id: 'plagiarism', label: 'Plagiarism', icon: 'search' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
  ]
  if (loading) return <div className="ir-surface ir-empty" role="status">Loading class data…</div>
  if (error || !classInfo) return <div className="ir-surface ir-empty" role="alert"><h1>Unable to load this class</h1><p>Check your connection or class assignment, then try again.</p><div className="im-inline-actions"><button className="ir-secondary" onClick={() => setReload(value => value + 1)}>Retry</button><InstructorBackButton onClick={() => navigate('/instructor/classes')}>Back to classes</InstructorBackButton></div></div>

  return <div className="im-class-detail">
    {!editing && <>
      <nav className="im-breadcrumb" aria-label="Class location"><button onClick={() => navigate('/instructor/classes')}>My Classes</button><span>/</span><span>{classInfo.section_no}</span></nav>
      <header className="im-class-heading"><InstructorBackButton onClick={() => navigate('/instructor/classes')} /><div><h1>{classInfo.subjects?.join(' · ') || classInfo.name}</h1><p>Class {classInfo.section_no} · {classInfo.semester || 'Semester not specified'}{typeof classInfo.is_active === 'boolean' && <span className={`im-status ${classInfo.is_active ? 'published' : 'draft'}`}>{classInfo.is_active ? 'Active' : 'Inactive'}</span>}</p></div><button className="ir-secondary" onClick={() => setActiveTab('analytics')}><ModuleIcon name="chart" />View Analytics</button></header>
      <dl className="ir-surface im-summary-strip">{[
        { label: classInfo.student_count === 1 ? 'Student' : 'Students', value: classInfo.student_count, icon: 'users' },
        { label: classInfo.problem_count === 1 ? 'Quest' : 'Quests', value: classInfo.problem_count, icon: 'file' },
        { label: 'At risk', value: atRisk, icon: 'warning', title: 'Existing indicator: students with less than 100 XP.' },
      ].map(item => <div key={item.label} title={item.title}><ModuleIcon name={item.icon} /><dd>{Number.isFinite(item.value) ? item.value.toLocaleString() : '—'}</dd><dt>{item.label}</dt></div>)}</dl>
      {rosterError && <p className="im-message im-error" role="alert">At-risk data is unavailable. <button className="ir-text-action" onClick={() => setReload(value => value + 1)}>Retry</button></p>}
      <nav className="im-class-tabs" aria-label="Class workspace">{tabs.map(tab => <button key={tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}><ModuleIcon name={tab.icon} />{tab.label}</button>)}</nav>
    </>}
    {activeTab === 'lessons' && <CourseMaterials key={id} classId={id} subjectId={classInfo.subject_id} classInfo={classInfo} onEditingChange={setEditing} />}
    {activeTab === 'problems' && <ProblemManagement classId={id} subjectId={classInfo.subject_id} />}
    {activeTab === 'announcements' && <Announcements classId={id} />}
    {activeTab === 'plagiarism' && <PlagiarismCheck classId={id} />}
    {activeTab === 'analytics' && <Analytics classId={id} />}
  </div>
}
