import { useState, useEffect, useRef } from 'react'
import './Leaderboard.css'
import SectionTitle from './SectionTitle'
import crown from '../../../assets/hall/crown.svg'
import cornerDiamond from '../../../assets/hall/corner-diamond.svg'
import rankFirst from '../../../assets/hall/rank-first.svg'
import rankSecond from '../../../assets/hall/rank-second.svg'
import rankThird from '../../../assets/hall/rank-third.svg'
import MobileSheet from '../../../components/MobileSheet'
import { API_BASE, authFetch } from '../../../api/client'

const AVATAR_GRADIENTS = [
  'from-purple-600 to-blue-600',
  'from-slate-600 to-slate-700',
  'from-orange-500 to-yellow-500',
  'from-green-600 to-emerald-600',
  'from-red-600 to-pink-600',
  'from-red-500 to-orange-500',
  'from-green-500 to-teal-500',
  'from-amber-700 to-yellow-700',
  'from-purple-700 to-indigo-700',
  'from-cyan-600 to-blue-500',
  'from-rose-600 to-fuchsia-600',
  'from-lime-600 to-green-600',
]

function getGradient(index) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
}

function getInitial(player) {
  const name = player.full_name || player.username || '?'
  return name[0].toUpperCase()
}

function getDisplayName(player) {
  return player.full_name || player.username
}

export default function Leaderboard({ currentUsername }) {
  const [filter, setFilter] = useState('section')
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const subjectPickerAnchorRef = useRef(null)

  // Load the student's subjects once, so "My Guild" can offer a picker when
  // they're enrolled in more than one — previously this always silently used
  // whichever subject happened to be first
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await authFetch(`${API_BASE}/api/student/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setSubjects(data)
          if (data.length > 0) {
            setSelectedSectionId(data[0].section_id)
          } else {
            // no subjects to scope "My Guild" to — stop waiting on a
            // section_id that's never going to arrive
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load subjects for leaderboard picker:', err)
        setError('Could not load your courses. Please reopen Hall of Champions to try again.')
        setLoading(false)
      }
    }
    loadSubjects()
  }, [])

  // Re-fetch the leaderboard whenever the filter or the picked subject changes
  useEffect(() => {
    fetchLeaderboard()
  }, [filter, selectedSectionId])

  // Fetch the leaderboard for the selected filter
  const fetchLeaderboard = async () => {
    // "My Guild" needs to know which subject before it can fetch anything —
    // wait for that rather than briefly flashing the global board first
    if (filter === 'section' && !selectedSectionId) return

    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')

      let url = `${API_BASE}/api/leaderboard`
      if (filter === 'section' && selectedSectionId) {
        url += `?section_id=${selectedSectionId}`
      }

      const res = await authFetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const data = await res.json()

      // Enrich with display helpers
      const enriched = data.map((player, idx) => ({
        ...player,
        color: getGradient(idx),
        avatar: getInitial(player),
      }))

      setLeaders(enriched)
    } catch (err) {
      console.error('Leaderboard fetch error:', err)
      setError('Could not load leaderboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Derive the podium and the logged-in student's own standing
  const topThree = leaders.slice(0, 3)
  const currentUser = leaders.find(u => u.username === currentUsername) || null

  const previousRank = currentUser ? leaders[leaders.indexOf(currentUser) - 1] : null
  const leadingXP = Math.max(1, Number(leaders[0]?.xp) || 0)
  const rankArt = [rankFirst, rankSecond, rankThird]

  return (
    <div className="champions-hall space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTitle>Hall of Champions</SectionTitle>
          <p className="text-sm text-slate-400 sm:ml-5">Ranked by total XP.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Ranking scope">
          {['section', 'global'].map(scope => (
            <button key={scope} type="button" onClick={() => setFilter(scope)} aria-pressed={filter === scope}
              className={`hall-filter ${filter === scope ? 'hall-filter-active' : ''}`}>
              {scope === 'section' ? 'My Guild' : 'Global'}
            </button>
          ))}
        </div>
      </header>

      {filter === 'section' && subjects.length > 1 && (
        <div ref={subjectPickerAnchorRef} className="flex justify-end">
          <button onClick={() => setShowSubjectPicker(!showSubjectPicker)} aria-expanded={showSubjectPicker}
            className="hall-filter flex max-w-full items-center gap-3">
            <span className="truncate">{subjects.find(s => s.section_id === selectedSectionId)?.section_no} · {subjects.find(s => s.section_id === selectedSectionId)?.name}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          <MobileSheet show={showSubjectPicker} onClose={() => setShowSubjectPicker(false)} widthClass="sm:w-72" anchorRef={subjectPickerAnchorRef}>
            <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-amber-200">Choose a course</p>
            {subjects.map(s => (
              <button key={s.section_id} onClick={() => { setSelectedSectionId(s.section_id); setShowSubjectPicker(false) }}
                className={`w-full px-4 py-3 text-left text-sm transition hover:bg-violet-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 ${s.section_id === selectedSectionId ? 'bg-violet-600/20 text-amber-200' : 'text-slate-300'}`}>
                {s.section_no} · {s.name}
              </button>
            ))}
          </MobileSheet>
        </div>
      )}

      {loading && <div role="status" className="hall-panel flex flex-col items-center gap-4 py-16"><span aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-amber-200/25 border-t-amber-200 motion-safe:animate-spin" /><p className="text-sm text-slate-300">Loading the champions…</p></div>}
      {!loading && error && <div role="alert" className="hall-panel p-8 text-center"><p className="text-rose-300">{error}</p><button onClick={fetchLeaderboard} className="hall-filter mt-4">Retry</button></div>}
      {!loading && !error && leaders.length === 0 && <div className="hall-panel py-16 text-center"><img src={crown} alt="" className="mx-auto mb-5 h-9 w-9 opacity-60" /><h3 className="font-cinzel text-lg text-amber-100">No rankings yet</h3><p className="mt-2 text-sm text-slate-400">{filter === 'section' && !subjects.length ? 'Enroll in a course to see your guild rankings.' : 'Earn quest XP to begin your journey.'}</p></div>}

      {!loading && !error && leaders.length > 0 && <>
        <div className="hall-podium">
          {[1, 0, 2].map(index => topThree[index] && (
            <article key={topThree[index].id} className={`hall-panel hall-champion hall-champion-${index + 1}`} aria-label={`Rank ${topThree[index].rank}: ${getDisplayName(topThree[index])}`}>
              {['tl','tr','bl','br'].map(position => <img key={position} src={cornerDiamond} alt="" className={`hall-corner hall-corner-${position}`} />)}
              {index === 0 && <img src={crown} alt="" className="hall-crown" />}
              <div className="hall-avatar-wrap">
                <div className="hall-avatar">{topThree[index].avatar}</div>
                <div className="hall-rank-medallion"><img src={rankArt[index]} alt="" /><span>{topThree[index].rank}</span></div>
              </div>
              <h3 className="mt-5 max-w-full truncate px-1 font-cinzel text-xs font-bold text-white sm:text-base" title={getDisplayName(topThree[index])}>{getDisplayName(topThree[index])}</h3>
              <p className="mt-1 flex flex-wrap justify-center gap-x-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300"><span>Level {topThree[index].level}</span><span aria-hidden="true">·</span><span className="tabular-nums">{topThree[index].xp} XP</span></p>
              {topThree[index].username === currentUsername && <span className="hall-you mt-2">You</span>}
            </article>
          ))}
        </div>
        {leaders.length > 3 && <section aria-label="Remaining rankings">
          <SectionTitle>The Ranks</SectionTitle>
          <ol start="4" className="space-y-2.5">
            {leaders.slice(3).map(player => <li key={player.id} className={`hall-panel hall-rank-row ${player.username === currentUsername ? 'hall-own-row' : ''}`}>
              <span className="font-cinzel font-bold text-slate-400 tabular-nums">#{player.rank}</span>
              <span className="hall-row-avatar" aria-hidden="true">{player.avatar}</span>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-white" title={getDisplayName(player)}>{getDisplayName(player)} {player.username === currentUsername && <span className="hall-you ml-1">You</span>}</p><p className="mt-1 text-[11px] text-amber-200 sm:hidden">Level {player.level}</p></div>
              <span className="hall-level">Lv {player.level}</span>
              <div className="hall-xp-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, Number(player.xp) || 0) / leadingXP * 100)}%` }} /></div>
              <span className="text-right font-cinzel text-sm font-bold text-white tabular-nums sm:text-lg">{player.xp} XP</span>
            </li>)}
          </ol>
        </section>}
        <section className="hall-panel hall-standing" aria-label="Your standing">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Your Standing</p><p className="mt-1 font-cinzel text-2xl font-bold text-white">{currentUser ? `#${currentUser.rank}` : 'Not ranked yet'}</p></div>
          {currentUser ? <><span className="hall-row-avatar" aria-hidden="true">{currentUser.avatar}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{getDisplayName(currentUser)}</p><p className="mt-1 text-xs text-amber-200">Level {currentUser.level} · {currentUser.xp} XP</p></div><p className="text-sm text-slate-300 sm:ml-auto">{previousRank ? `${Math.max(0, Number(previousRank.xp) - Number(currentUser.xp))} XP behind ${getDisplayName(previousRank)}` : 'Leading this board'}</p></> : <p className="text-sm text-slate-300">Your account is not listed on this board.</p>}
        </section>
      </>}
    </div>
  )
}
