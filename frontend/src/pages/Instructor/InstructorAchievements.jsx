import { useState } from 'react'
import useAchievements from '../../hooks/useAchievements'
import { splitAchievements, isUnavailable } from '../../utils/achievementView'
import MedalArt from '../../components/MedalArt'
import AchievementModal from '../../components/AchievementModal'
import ModuleIcon from './ModuleIcon'
import './InstructorAchievements.css'

const statusOf = badge => badge.is_earned ? 'Earned' : isUnavailable(badge) ? 'Not available yet' : badge.progress > 0 ? 'In progress' : 'Locked'
const targetOf = badge => Math.max(0, Number(badge.requirement_value ?? badge.max_progress) || 0)
const progressOf = badge => Math.max(0, Number(badge.progress) || 0)

export default function InstructorAchievements() {
  const { achievements, loading, error, reload } = useAchievements()
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('default')
  const [selectedId, setSelectedId] = useState(null)
  const split = splitAchievements(achievements)
  const inProgress = split.locked.filter(badge => progressOf(badge) > 0)
  const locked = split.locked.filter(badge => progressOf(badge) === 0)
  const list = filter === 'earned' ? split.earned : filter === 'progress' ? inProgress : filter === 'locked' ? locked : filter === 'unavailable' ? split.unavailable : achievements
  const filtered = [...list].sort((a, b) => {
    if (sortBy === 'xp') return b.xp_reward - a.xp_reward
    const progress = badge => targetOf(badge) ? progressOf(badge) / targetOf(badge) : 0
    if (sortBy === 'progress') return progress(b) - progress(a)
    return Number(!!b.is_earned) - Number(!!a.is_earned) || progress(b) - progress(a)
  })
  const filters = [
    { key: 'all', label: 'All', count: achievements.length },
    { key: 'earned', label: 'Earned', count: split.earned.length },
    { key: 'progress', label: 'In progress', count: inProgress.length },
    { key: 'locked', label: 'Locked', count: locked.length },
    { key: 'unavailable', label: 'Not available yet', count: split.unavailable.length },
  ]

  return <section className="ia-page" aria-labelledby="teaching-achievements-title">
    <header className="ia-heading"><h1 id="teaching-achievements-title">Teaching Achievements</h1><p>Every milestone begins with your next class. Explore your teaching achievements.</p></header>
    {loading ? <div className="ia-empty" role="status">Loading your achievements…</div> : error ? <div className="ia-empty" role="alert"><ModuleIcon name="warning" size={32} /><h2>Achievements unavailable</h2><p>{error.message || 'We could not load your achievements. Please try again.'}</p><button className="ir-secondary" onClick={() => reload().catch(() => {})}>Try again</button></div> : <>
      <dl className="ia-summary">
        <div><dd>{split.earned.length} <span>/ {split.denominator}</span></dd><dt>Attainable earned</dt></div>
        <div><dd>{inProgress.length}</dd><dt>In progress</dt></div>
        <div><dd>{locked.length}</dd><dt>Locked</dt></div>
        <div><dd>{split.unavailable.length}</dd><dt>Not available yet</dt></div>
      </dl>
      <div className="ia-toolbar">
        <div className="ia-filters" role="group" aria-label="Filter teaching achievements">{filters.map(tab => <button key={tab.key} type="button" aria-pressed={filter === tab.key} onClick={() => setFilter(tab.key)}>{tab.label} <span>({tab.count})</span></button>)}</div>
        <label className="ia-sort">Sort <select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="default">Default</option><option value="xp">XP reward</option><option value="progress">Progress</option></select></label>
      </div>
      {filtered.length ? <div className="ia-grid">{filtered.map(badge => {
        const target = targetOf(badge)
        const progress = progressOf(badge)
        const unavailable = isUnavailable(badge)
        return <button key={badge.id} type="button" className={`ia-card ${badge.is_earned ? 'ia-earned' : unavailable ? 'ia-unavailable' : ''}`} aria-label={`View ${badge.name}, ${statusOf(badge)}`} onClick={() => setSelectedId(badge.id)}>
          <MedalArt badge={badge} earned={!!badge.is_earned} unavailable={unavailable} className="ia-medal" />
          <h2>{badge.name}</h2><p className="ia-description">{badge.description}</p>
          <span className={`ia-state ${badge.is_earned ? 'earned' : unavailable ? 'unavailable' : progress > 0 ? 'progress' : ''}`}>{statusOf(badge)}{!badge.is_earned && !unavailable && target > 0 ? ` · ${progress} / ${target}` : ''}</span>
          {!unavailable && target > 0 && <span className="ia-track" role="progressbar" aria-label={`${badge.name} progress`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(progress, target)}><span style={{ width: `${Math.min(progress / target * 100, 100)}%` }} /></span>}
          <span className="ia-card-footer"><strong>+{badge.xp_reward} XP</strong><span>View details <span aria-hidden="true">→</span></span></span>
        </button>
      })}</div> : <div className="ia-empty"><ModuleIcon name="book" size={40} /><h2>{filter === 'earned' ? 'Your first medal awaits' : 'No achievements in this view'}</h2><p>{filter === 'earned' ? 'Meet a teaching milestone to earn your first medal.' : 'Choose another filter to explore your achievements.'}</p><button className="ir-secondary" onClick={() => setFilter('all')}>View all achievements</button></div>}
      <footer className="ia-footer"><p>Select an achievement to view its requirements, progress and reward.</p><p>{split.earned.reduce((sum, badge) => sum + (Number(badge.xp_reward) || 0), 0)} XP from earned medals</p></footer>
    </>}
    {selectedId !== null && <AchievementModal achievements={filtered} initialSelectedId={selectedId} onClose={() => setSelectedId(null)} />}
  </section>
}
