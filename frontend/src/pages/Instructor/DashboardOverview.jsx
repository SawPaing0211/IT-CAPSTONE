import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, authFetch } from '../../api/client'
import MobileSheet from '../../components/MobileSheet'
import QuestButton from '../Student/components/QuestButton'
import libraryBanner from '../../assets/instructor/library-banner.png'
import './InstructorRefined.css'

const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—'
const verdicts = {
  accepted: ['Accepted', 'success'], partial: ['Some tests failed', 'warning'],
  wrong_answer: ['Not accepted', 'danger'], timeout: ['Time limit exceeded', 'warning'],
  error: ['Execution error', 'muted'], pending_review: ['Pending review', 'warning'],
}
function SectionHeading({ id, children, action }) {
  return <div className="ir-section-heading"><h2 id={id}>{children}</h2><span className="ir-divider" aria-hidden="true" />{action}</div>
}
function EmptyState({ title, children }) {
  return <div className="ir-empty"><h3>{title}</h3>{children && <p>{children}</p>}</div>
}
async function readDashboard(path, signal) {
  const response = await authFetch(`${API_BASE}/api/instructor/${path}`, { signal })
  if (!response.ok) throw new Error('Dashboard data unavailable')
  return response.json()
}
function activityTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Time unavailable'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function DashboardOverview() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])
  const [reload, setReload] = useState(0)
  const [activityFilter, setActivityFilter] = useState('all')
  const [filteredActivity, setFilteredActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const filterAnchor = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    Promise.allSettled([
      readDashboard('classes', controller.signal),
      readDashboard('dashboard-stats', controller.signal),
    ]).then(([classResult, statResult]) => {
      if (!current) return
      const failed = []
      if (classResult.status === 'fulfilled' && Array.isArray(classResult.value)) setClasses(classResult.value)
      else failed.push('assigned classes')
      if (statResult.status === 'fulfilled' && statResult.value && typeof statResult.value === 'object' && !Array.isArray(statResult.value)) setStats(statResult.value)
      else failed.push('dashboard statistics')
      setErrors(failed)
      setLoading(false)
    })
    return () => { current = false; controller.abort() }
  }, [reload])

  useEffect(() => {
    if (activityFilter === 'all') return
    const controller = new AbortController()
    let current = true
    readDashboard(`dashboard-stats?class_code=${encodeURIComponent(activityFilter)}`, controller.signal)
      .then(data => { if (current) setFilteredActivity(data.recent_activity ?? []) })
      .catch(() => { if (current) setActivityError(true) })
      .finally(() => { if (current) setActivityLoading(false) })
    return () => { current = false; controller.abort() }
  }, [activityFilter, reload])

  useEffect(() => {
    if (!showFilter) return
    const close = event => {
      if (event.key === 'Escape') {
        setShowFilter(false)
        filterAnchor.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [showFilter])

  const refresh = () => { setLoading(true); setActivityError(false); if (activityFilter !== 'all') setActivityLoading(true); setReload(value => value + 1) }
  const chooseSection = section => {
    setShowFilter(false)
    if (section === activityFilter) return
    setActivityLoading(section !== 'all')
    setActivityError(false)
    setActivityFilter(section)
  }
  const sections = (stats?.assigned_sections ?? []).map(section => section.section_no)
  const activity = activityFilter === 'all' ? stats?.recent_activity ?? [] : filteredActivity
  const performers = stats?.top_performers ?? []
  const metrics = [
    { label: 'Total students', value: number(stats?.total_students), caption: 'Across your assigned classes' },
    { label: 'XP earned', value: stats?.avg_score_basis?.submissions ? `${number(stats.avg_score)}%` : '—', caption: stats && !stats.avg_score_basis?.submissions ? 'No submissions yet' : 'Share of submitted-quest XP', help: 'XP earned as a share of available XP on submitted quests. This is not a grade or completion rate; unsubmitted quests are excluded.' },
    { label: 'Pending reviews', value: number(stats?.pending_reviews), caption: stats?.pending_reviews === 0 ? 'No reviews pending' : 'Awaiting review' },
    { label: 'Active quests', value: number(stats?.total_problems), caption: 'Published and available' },
  ]

  return (
    <div className="ir-dashboard" aria-busy={loading}>
      <section className="ir-banner" aria-labelledby="instructor-welcome">
        <img src={libraryBanner} alt="" fetchPriority="high" draggable="false" />
        <div className="ir-banner-copy"><p className="ir-eyebrow">Dashboard</p><h1 id="instructor-welcome">Guide the next generation.</h1><p>Manage your classes, quests, and student progress.</p></div>
      </section>
      {errors.length > 0 && <div className="ir-load-error" role="alert"><div><strong>Unable to load {errors.join(' and ')}.</strong><p>Previously loaded data is kept visible when available.</p></div><button className="ir-secondary" disabled={loading} onClick={refresh}>Try again</button></div>}
      {loading && <p className="ir-loading" role="status">Loading your teaching workspace…</p>}
      <section className="ir-metrics" aria-label="Teaching statistics">
        {metrics.map(metric => <div className="ir-surface ir-metric" key={metric.label} title={metric.help}><p className="ir-metric-value">{metric.value}</p><h2>{metric.label}</h2><p className="ir-metric-caption">{metric.caption}</p></div>)}
      </section>
      <div className="ir-dashboard-grid">
        <section aria-labelledby="instructor-classes">
          <SectionHeading id="instructor-classes" action={<button className="ir-text-action" onClick={() => navigate('/instructor/classes')}>View all <span aria-hidden="true">→</span></button>}>My Classes</SectionHeading>
          {classes === null ? <div className="ir-surface"><EmptyState title={loading ? 'Loading classes…' : 'Classes unavailable'}>Your assigned classes will appear here.</EmptyState></div> : classes.length === 0 ? <div className="ir-surface"><EmptyState title="No assigned classes yet">Contact your administrator to get started.</EmptyState></div> : <div className="ir-class-list">{classes.slice(0, 5).map(cls => <article className="ir-surface ir-class-card" key={cls.id}><div><h3>{cls.name}</h3><p>Class {cls.section_no} · {number(cls.student_count)} students · {number(cls.problem_count)} quests</p></div><QuestButton className="ir-class-button" ariaLabel={`Open ${cls.name}, class ${cls.section_no}`} onClick={() => navigate(`/instructor/class/${cls.id}`)}>Open class</QuestButton></article>)}</div>}
        </section>
        <section aria-labelledby="instructor-actions">
          <SectionHeading id="instructor-actions">Quick Actions</SectionHeading>
          <div className="ir-surface ir-quick-actions"><QuestButton onClick={() => navigate('/instructor/create-problem/pick-class')}>Create quest</QuestButton><QuestButton onClick={() => navigate('/instructor/announcements')}>Post announcement</QuestButton></div>
        </section>
        <section aria-labelledby="instructor-activity">
          <SectionHeading id="instructor-activity" action={<div ref={filterAnchor}><button className="ir-secondary" aria-expanded={showFilter} onClick={() => setShowFilter(value => !value)}>{activityFilter === 'all' ? 'All sections' : `Class ${activityFilter}`} <span aria-hidden="true">⌄</span></button><MobileSheet show={showFilter} onClose={() => setShowFilter(false)} anchorRef={filterAnchor} widthClass="sm:w-60" panelClassName="ir-filter-panel"><div className="p-2">{['all', ...sections].map(section => <button key={section} className="ir-menu-option" aria-pressed={activityFilter === section} onClick={() => chooseSection(section)}>{section === 'all' ? 'All sections' : `Class ${section}`}</button>)}</div></MobileSheet></div>}>Recent Submission Activity</SectionHeading>
          <div className="ir-surface ir-activity">
            {activityLoading ? <EmptyState title="Loading submissions…" /> : activityError ? <div className="ir-empty" role="alert"><h3>Submissions unavailable</h3><p>Try loading this section again.</p><button className="ir-secondary" onClick={refresh}>Try again</button></div> : !stats ? <EmptyState title={loading ? 'Loading submissions…' : 'Submissions unavailable'} /> : activity.length === 0 ? <EmptyState title="No submissions yet">Student submissions will appear here once they start completing quests.</EmptyState> : activity.map((item, index) => { const [label, tone] = verdicts[item.status] ?? ['Result unavailable', 'muted']; return <article className="ir-activity-row" key={item.id ?? index}><div className="ir-activity-identity"><h3>{item.student}</h3><p>{item.problem}{item.section_no ? ` · Class ${item.section_no}` : ''}</p></div><span className={`ir-verdict ir-verdict-${tone}`}>{label}</span><time>{activityTime(item.submitted_at)}</time></article> })}
          </div>
        </section>
        <section aria-labelledby="instructor-performers">
          <SectionHeading id="instructor-performers">Top Performers</SectionHeading>
          <div className="ir-surface ir-performers">{!stats ? <EmptyState title={loading ? 'Loading rankings…' : 'Rankings unavailable'} /> : performers.length === 0 ? <EmptyState title="No rankings yet">Your top performers will appear when students earn XP.</EmptyState> : performers.map((student, index) => <div className="ir-performer" key={student.id}><span className="ir-rank">#{index + 1}</span><div><h3>{student.full_name || student.username}</h3><p>Level {number(student.level)}</p></div><strong className="ir-xp">{number(student.xp)} XP</strong></div>)}</div>
        </section>
      </div>
    </div>
  )
}
