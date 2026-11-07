// The Hero Sheet: profile, level, combat stats, activity calendar, skills and
// achievements. Everything is real data from /api/student/stats, the student's
// submissions and the shared achievements list. There are no rank titles or
// per-quest XP-earned fields in the app, so none are shown.

import { useState, useEffect, useRef, useMemo } from 'react'
import AchievementModal from '../../../components/AchievementModal'
import useAchievements from '../../../hooks/useAchievements'
import { splitAchievements, isUnavailable } from '../../../utils/achievementView'
import MedalArt from '../../../components/MedalArt'
import MobileSheet from '../../../components/MobileSheet'
import { API_BASE, authFetch } from '../../../api/client'
import pythonEmblem from '../../../assets/instructor/quest-language-python.png'
import javaEmblem from '../../../assets/instructor/quest-language-java.png'
import csharpEmblem from '../../../assets/instructor/quest-language-csharp.png'

const ico = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const BookIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" {...ico} aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.500a1.500 1.500 0 0 1 1.500 1.500z" /></svg>
const FlagIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" {...ico} aria-hidden="true"><path d="M6 21V4M6 5h11l-2 4 2 4H6" /></svg>
const StarIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" {...ico} aria-hidden="true"><path d="m12 3.500 2.600 5.300 5.800.8-4.200 4.100 1 5.800L12 16.800l-5.200 2.700 1-5.800L3.600 9.600l5.800-.8z" /></svg>
const FlameIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" {...ico} aria-hidden="true"><path d="M12 3c1 4-3.500 5.500-3.500 10a3.500 3.500 0 0 0 7 0c0-1.200-.5-2.200-1.200-3 3 1.500 4.700 3.800 4.700 6.500A7 7 0 0 1 5 16c0-3 1.500-5 3-6.500C9.500 8 11 5.500 12 3z" /></svg>

// Panel with the four small gold corner diamonds from the design
function Panel({ children, className = '', glow = false }) {
  return (
    <div className={`relative rounded-xl border bg-gradient-to-br from-[#0f1836] to-[#0a1024] ${glow ? 'border-amber-300/60' : 'border-amber-300/25'} ${className}`}>
      {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map(p => (
        <span key={p} className={`absolute ${p} h-2 w-2 rotate-45 bg-amber-300/80`} aria-hidden="true" />
      ))}
      {children}
    </div>
  )
}

function Head({ children, right }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-2 w-2 shrink-0 rotate-45 bg-amber-300" aria-hidden="true" />
      <h2 className="font-cinzel text-xl font-bold tracking-wide text-white">{children}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-amber-300/30 to-transparent" aria-hidden="true" />
      {right && <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">{right}</span>}
    </div>
  )
}

const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function ProgressStats({ stats, username, fullName, onOpenQuests }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const { achievements, loading: loadingAchievements, error: achError } = useAchievements()
  const ach = splitAchievements(achievements)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [selectedAchievementId, setSelectedAchievementId] = useState(null)
  const [realStats, setRealStats] = useState(null)
  const [recentSubmissions, setRecentSubmissions] = useState([])

  // 'all' = every subject mixed together; otherwise a subject id scopes every stat below
  const [subjectId, setSubjectId] = useState('all')
  const [subjectsList, setSubjectsList] = useState([])
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const subjectPickerAnchorRef = useRef(null)

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await authFetch(`${API_BASE}/api/student/subjects`, { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) setSubjectsList(await res.json())
      } catch (err) {
        console.error('Failed to fetch subjects list:', err)
      }
    }
    fetchSubjects()
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const subjectParam = subjectId !== 'all' ? `&subject_id=${subjectId}` : ''
        const [statsRes, subsRes] = await Promise.all([
          authFetch(`${API_BASE}/api/student/stats${subjectId !== 'all' ? `?subject_id=${subjectId}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          authFetch(`${API_BASE}/api/student/submissions?limit=50${subjectParam}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ])
        if (statsRes.ok) setRealStats(await statsRes.json())
        if (subsRes.ok) {
          const subsData = await subsRes.json()
          setRecentSubmissions(subsData.submissions || [])
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      }
    }
    fetchStats()
  }, [subjectId])

  const level = realStats?.level ?? stats?.level ?? 1
  const totalXp = realStats?.total_xp ?? 0
  const xpInLevel = totalXp % 100
  const questsDone = realStats?.quests_done ?? realStats?.accepted_submissions ?? 0
  const streak = realStats?.streak ?? 0
  const totalAttempts = realStats?.total_submissions ?? 0
  const failedAttempts = totalAttempts - (realStats?.accepted_submissions ?? 0)
  const successRate = realStats?.success_rate ?? 0
  const name = fullName || username

  const languages = [
    { name: 'Python', key: 'python', emblem: pythonEmblem, dot: 'bg-emerald-400', txt: 'text-emerald-300' },
    { name: 'Java', key: 'java', emblem: javaEmblem, dot: 'bg-orange-400', txt: 'text-orange-300' },
    { name: 'C#', key: 'csharp', emblem: csharpEmblem, dot: 'bg-violet-400', txt: 'text-violet-300' },
  ].map(l => {
    const total = recentSubmissions.filter(s => s.language === l.key).length
    const solved = recentSubmissions.filter(s => s.language === l.key && s.status === 'accepted').length
    return { ...l, solved, total, pct: total > 0 ? Math.round((solved / total) * 100) : 0 }
  })

  // counts quests, not submissions: cleared / visible quests per level
  const difficulty = [
    { level: 'Easy', dot: 'bg-emerald-400', txt: 'text-emerald-300' },
    { level: 'Medium', dot: 'bg-amber-300', txt: 'text-amber-200' },
    { level: 'Hard', dot: 'bg-rose-400', txt: 'text-rose-300' },
  ].map(l => {
    const r = (realStats?.difficulty_progress || []).find(x => x.level === l.level)
    const completed = r?.completed ?? 0
    const total = r?.total ?? 0
    return { ...l, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
  })

  // 4 calendar weeks, Monday first, the last row is the current week
  const calendar = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const mondayOffset = (today.getDay() + 6) % 7
    const start = new Date(today); start.setDate(today.getDate() - mondayOffset - 21)
    const counts = {}
    recentSubmissions.forEach(s => {
      if (!s.submitted_at) return
      const k = localKey(new Date(s.submitted_at))
      counts[k] = (counts[k] || 0) + 1
    })
    const days = []
    for (let i = 0; i < 28; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const count = counts[localKey(d)] || 0
      days.push({
        date: d,
        count,
        future: d > today,
        isToday: d.getTime() === today.getTime(),
        level: count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4,
      })
    }
    const elapsed = days.filter(d => !d.future)
    let longest = 0, run = 0
    elapsed.forEach(d => { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run) })
    return { days, active: elapsed.filter(d => d.count > 0).length, elapsed: elapsed.length, longest }
  }, [recentSubmissions])

  const cellCls = (d) => d.future ? 'border-slate-800/60 bg-transparent'
    : ['border-slate-700/60 bg-[#0a1024]', 'border-emerald-900 bg-emerald-950', 'border-emerald-700/70 bg-emerald-800/70', 'border-emerald-500/70 bg-emerald-600', 'border-emerald-300/70 bg-emerald-400'][d.level]

  const fmtDay = (d) => d.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase() + (d.isToday ? ' · TODAY' : '')
  const infoDay = hoveredDay || calendar.days.find(d => d.isToday)

  const selectedLabel = subjectId === 'all'
    ? 'All Subjects (Mixed)'
    : (() => {
        const s = subjectsList.find(s => String(s.id) === String(subjectId))
        return s ? `${s.name}${s.section_no ? ` — ${s.section_no}` : ''}` : 'All Subjects (Mixed)'
      })()

  const subjectCount = subjectId === 'all' ? subjectsList.length : 1

  const tiles = [
    { label: 'Total Subjects', value: subjectCount, icon: <BookIcon />, ring: 'border-violet-400/50 text-violet-300 bg-violet-500/10' },
    { label: 'Quests Completed', value: questsDone, icon: <FlagIcon />, ring: 'border-emerald-400/50 text-emerald-300 bg-emerald-400/10' },
    { label: 'Total XP', value: totalXp, icon: <StarIcon />, ring: 'border-amber-300/60 text-amber-200 bg-amber-300/10' },
    { label: 'Current Streak', value: streak, icon: <FlameIcon />, ring: 'border-orange-400/50 text-orange-300 bg-orange-400/10' },
  ]

  const combat = [
    { label: 'Success Rate', value: `${successRate}%`, cls: 'text-emerald-300' },
    { label: 'Quest Completion', value: `${successRate}%`, cls: 'text-violet-300' },
    { label: 'Total Attempts', value: totalAttempts, cls: 'text-white' },
    { label: 'Failed', value: failedAttempts, cls: 'text-rose-300' },
  ]

  const recent = recentSubmissions.slice(0, 8)
  const statusLabel = { accepted: 'Conquered', partial: 'Partial', wrong_answer: 'Wrong answer' }
  const statusCls = {
    accepted: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10',
    partial: 'text-sky-300 border-sky-400/40 bg-sky-400/10',
  }

  return (
    <div className="space-y-9">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rotate-45 bg-amber-300" aria-hidden="true" />
            <h1 className="font-cinzel text-3xl font-black uppercase tracking-wide text-white">The Hero Sheet</h1>
          </div>
          <p className="mt-1 pl-[22px] text-sm text-slate-400">Your profile, level, and progress.</p>
        </div>

        <div ref={subjectPickerAnchorRef}>
          <button
            onClick={() => setShowSubjectPicker(!showSubjectPicker)}
            aria-haspopup="listbox"
            aria-expanded={showSubjectPicker}
            className="flex min-h-[44px] max-w-[280px] items-center gap-2 rounded-full border border-amber-300/40 bg-[#0b1224] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-amber-100 transition hover:border-amber-300/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <span className="truncate">Viewing: {selectedLabel}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" {...ico} aria-hidden="true" className="shrink-0"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <MobileSheet show={showSubjectPicker} onClose={() => setShowSubjectPicker(false)} widthClass="sm:w-72" anchorRef={subjectPickerAnchorRef}>
            <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Viewing</p>
            <button
              onClick={() => { setSubjectId('all'); setShowSubjectPicker(false) }}
              className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition sm:py-2 ${subjectId === 'all' ? 'bg-amber-300/10 text-amber-200' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              All Subjects (Mixed)
            </button>
            {subjectsList.map(s => (
              <button
                key={s.id}
                onClick={() => { setSubjectId(s.id); setShowSubjectPicker(false) }}
                className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition sm:py-2 ${String(s.id) === String(subjectId) ? 'bg-amber-300/10 text-amber-200' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                {s.name}{s.section_no ? ` — ${s.section_no}` : ''}
              </button>
            ))}
          </MobileSheet>
        </div>
      </div>

      {/* Hero card + stat tiles */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        <Panel className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-1 shadow-lg shadow-amber-500/25" role="img" aria-label={`Level ${level}`}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-violet-500/40 bg-[#0b1224] leading-none">
                <span className="text-[10px] font-bold tracking-[0.25em] text-amber-200">LV</span>
                <span className="mt-1 font-cinzel text-5xl font-black text-white">{level}</span>
              </div>
            </div>
            <p className="mt-4 max-w-full break-words font-cinzel text-xl font-bold text-white">{name}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Level {level}</p>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.18em]">
              <span className="text-slate-500">Experience</span>
              <span className="text-slate-300">{xpInLevel} / 100</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-slate-700/60 bg-[#070b18]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpInLevel} aria-label="Progress to next level">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500" style={{ width: `${Math.max(xpInLevel, 3)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{100 - xpInLevel} XP to next level</p>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {tiles.map(t => (
            <Panel key={t.label} className="flex items-center gap-5 p-5">
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${t.ring}`}>{t.icon}</span>
              <div className="min-w-0">
                <p className="font-cinzel text-4xl font-black leading-none text-white">{t.value}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{t.label}</p>
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Combat stats */}
      <section aria-label="Combat stats">
        <Head>Combat Stats</Head>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {combat.map(c => (
            <Panel key={c.label} className="p-5">
              <p className={`font-cinzel text-3xl font-black leading-none ${c.cls}`}>{c.value}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{c.label}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Activity calendar */}
      <section aria-label="Activity calendar">
        <Head right="Last 4 Weeks">Activity Calendar</Head>
        <Panel className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full max-w-[460px] shrink-0">
              <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-1.5 sm:grid-cols-[52px_repeat(7,minmax(0,1fr))]">
                <span />
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <span key={d} className="pb-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">{d}</span>
                ))}
                {[0, 1, 2, 3].map(w => (
                  <div key={w} className="contents">
                    <span className="self-center text-[10px] text-slate-500">{calendar.days[w * 7].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    {calendar.days.slice(w * 7, w * 7 + 7).map(d => (
                      <button
                        key={d.date.getTime()}
                        type="button"
                        disabled={d.future}
                        onMouseEnter={() => setHoveredDay(d)}
                        onMouseLeave={() => setHoveredDay(null)}
                        onFocus={() => setHoveredDay(d)}
                        onBlur={() => setHoveredDay(null)}
                        onClick={() => setHoveredDay(d)}
                        aria-label={`${d.date.toLocaleDateString()}: ${d.count} submissions`}
                        className={`aspect-square rounded-md border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${cellCls(d)} ${d.isToday ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0a1024]' : ''}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="inline-block rounded-lg border border-amber-300/40 bg-[#0b1224] px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">{infoDay ? fmtDay(infoDay) : ''}</p>
                <p className="mt-0.5 text-xs text-slate-300">{infoDay ? `${infoDay.count} ${infoDay.count === 1 ? 'submission' : 'submissions'}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map(l => <span key={l} className={`h-3 w-3 rounded-sm border ${cellCls({ level: l })}`} />)}
                <span>More</span>
              </div>
              {calendar.active === 0 && (
                <p className="max-w-xs text-sm text-slate-400">No activity yet. Clear a quest or cast a spell to light up the calendar.</p>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-6 border-t border-slate-700/50 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {[
                { v: `${calendar.active} / ${calendar.elapsed}`, l: 'Active days' },
                { v: `${calendar.longest} ${calendar.longest === 1 ? 'Day' : 'Days'}`, l: 'Longest streak' },
                { v: `${streak} ${streak === 1 ? 'Day' : 'Days'}`, l: 'Current streak' },
              ].map(x => (
                <div key={x.l}>
                  <p className="whitespace-nowrap font-cinzel text-xl font-black text-white sm:text-2xl">{x.v}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{x.l}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      {/* Language skills + difficulty */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-label="Language skills">
          <Head>Language Skills</Head>
          <Panel className="space-y-5 p-5">
            {languages.map(l => (
              <div key={l.key} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3">
                <img src={l.emblem} alt="" width="40" height="40" className="h-10 w-10 object-contain" />
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold text-white" title="Accepted submissions out of all submissions in this language">{l.name}</span>
                    <span className={`text-xs font-bold tabular-nums ${l.txt}`}>{l.pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[#070b18]" aria-hidden="true">
                    <div className={`h-full rounded-full ${l.dot}`} style={{ width: `${l.pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{l.solved} of {l.total} {l.total === 1 ? 'submission' : 'submissions'} accepted</p>
                </div>
              </div>
            ))}
          </Panel>
        </section>

        <section aria-label="Difficulty progress">
          <Head>Difficulty Progress</Head>
          <Panel className="space-y-5 p-5">
            {difficulty.map(l => (
              <div key={l.level}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-bold text-white">{l.level}</span>
                  <span className={`text-xs font-bold ${l.txt}`}>{l.pct}%</span>
                </div>
                <div className="relative mt-2 h-1.5 rounded-full bg-[#070b18]">
                  <div className={`h-full rounded-full ${l.dot}`} style={{ width: `${l.pct}%` }} />
                  {l.pct === 0 && <span className={`absolute -top-[1px] left-0 h-2 w-2 rounded-full ${l.dot}`} aria-hidden="true" />}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{l.completed} of {l.total} quests cleared</p>
              </div>
            ))}
          </Panel>
        </section>
      </div>

      {/* Achievements */}
      <section aria-label="Achievements">
        <Head right={loadingAchievements || achError ? '' : `${ach.earned.length} of ${ach.denominator} earned`}>Achievements</Head>
        {subjectId !== 'all' && (
          <p className="-mt-2 mb-3 text-[11px] italic text-slate-500">Badges are earned account-wide, across all subjects, not scoped by this filter.</p>
        )}
        {loadingAchievements ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-amber-300/10 bg-[#0b1224]" />)}
          </div>
        ) : achError ? (
          <p role="alert" className="text-sm text-slate-400">Achievements could not be loaded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map(a => {
              const unavailable = isUnavailable(a)
              const earned = !!a.is_earned
              const pct = a.max_progress > 0 ? Math.min(100, Math.round((a.progress / a.max_progress) * 100)) : 0
              return (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAchievementId(a.id); setShowAllBadges(true) }}
                  className={`relative flex items-center gap-4 rounded-xl border bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                    earned ? 'border-amber-300/60 hover:border-amber-200' : unavailable ? 'border-dashed border-slate-700/80 opacity-70' : 'border-slate-700/70 hover:border-amber-300/40'
                  }`}
                >
                  <MedalArt badge={a} earned={earned} unavailable={unavailable} className="h-16 w-16 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className={`block font-cinzel text-sm font-bold uppercase tracking-wide ${earned ? 'text-amber-100' : 'text-slate-400'}`}>{a.name}</span>
                    <span className="mt-1 line-clamp-2 block text-xs text-slate-400">{a.description}</span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        earned ? 'border-emerald-400/50 text-emerald-300' : unavailable ? 'border-slate-700 text-slate-500' : 'border-slate-600 text-slate-400'
                      }`}>{earned ? 'Earned' : unavailable ? 'Coming soon' : 'Locked'}</span>
                      {!earned && !unavailable && a.max_progress > 0 && (
                        <span className="text-[10px] text-slate-500">{a.progress} / {a.max_progress} ({pct}%)</span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {showAllBadges && (
        <AchievementModal achievements={achievements} initialSelectedId={selectedAchievementId} onClose={() => { setShowAllBadges(false); setSelectedAchievementId(null) }} onOpenQuests={onOpenQuests} />
      )}

      {/* Recent quests */}
      <section aria-label="Recent quests">
        <Head>Recent Quests</Head>
        {recent.length === 0 ? (
          <Panel className="p-6 text-sm text-slate-400">No submissions yet. Take a quest from the Bounty Board to start your record.</Panel>
        ) : (
          <ul className="space-y-3">
            {recent.map((s, idx) => (
              <li key={s.id ?? idx} className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
                <span className={`absolute inset-y-0 left-0 w-1 ${s.status === 'accepted' ? 'bg-emerald-400' : s.status === 'partial' ? 'bg-sky-400' : 'bg-rose-400'}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-cinzel text-sm font-bold text-amber-50">{s.problem_title || 'Quest'}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(s.submitted_at).toLocaleDateString()}
                    {s.difficulty ? ` · ${s.difficulty}` : ''}
                    {s.language ? ` · ${({ python: 'Python', java: 'Java', csharp: 'C#' })[s.language] || s.language}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCls[s.status] || 'text-rose-300 border-rose-400/40 bg-rose-400/10'}`}>{statusLabel[s.status] || 'Failed'}</span>
                  <span className="font-cinzel text-sm font-bold text-amber-300">+{s.score || 0} XP</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
