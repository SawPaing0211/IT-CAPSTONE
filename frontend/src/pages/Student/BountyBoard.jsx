// Bounty Board page: every open quest across the student's courses, grouped by course.
// Data: /api/student/open-quests (open = no real Submit yet; a required multi-language
// quest stays open until every language is submitted). Filters are client-side:
// quest type (All / Coding / Debugging / Event) and course.
// Each course shows its first three quests; "Show all" expands it.
// States: loading, error with retry, empty, nothing matches the filters.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../api/client'
import QuestButton from './components/QuestButton'
import { CourseEmblem } from './components/CourseGrid'

const PREVIEW_COUNT = 3

const TYPE_FILTERS = [
  { key: 'all', label: 'All Quests' },
  { key: 'coding', label: 'Coding' },
  { key: 'debugging', label: 'Debugging' },
  { key: 'event', label: 'Event Quests' },
]

const LANG = {
  python: { name: 'Python', dot: 'bg-sky-400' },
  java: { name: 'Java', dot: 'bg-orange-400' },
  csharp: { name: 'C#', dot: 'bg-fuchsia-400' },
}

const DIFF = {
  Easy: 'text-emerald-300',
  Medium: 'text-amber-300',
  Hard: 'text-rose-300',
}

function RuneIcon({ debugging }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f3d78a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {debugging
        ? <path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM3 12h3m12 0h3M5 6l3 2m11-2-3 2M5 18l3-2m11 2-3-2M12 9v9" />
        : <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 5l-4 14" />}
    </svg>
  )
}

function dueText(d) {
  if (!d) return null
  const t = new Date(d)
  if (isNaN(t)) return null
  return `Due ${t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function QuestRow({ quest, group, onSelectQuest }) {
  const debugging = quest.problem_type === 'debugging'
  const due = dueText(quest.due_date)
  return (
    <li className="relative rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 hover:border-amber-300/45 transition">
      <div className="flex items-center gap-4 min-w-0 md:flex-1">
        <div className="shrink-0 w-11 h-11 rounded-full border border-amber-300/50 bg-[#0b1224] flex items-center justify-center">
          <RuneIcon debugging={debugging} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-cinzel font-bold text-[15px] leading-snug text-white break-words">
            {quest.title}
            {quest.is_event_quest && (
              <span className="ml-2 align-middle px-1.5 py-0.5 rounded border border-amber-300/40 text-[9px] tracking-[0.14em] uppercase text-amber-200">Event</span>
            )}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold tracking-[0.14em] uppercase text-slate-400">
            <span>{debugging ? 'Debugging' : 'Coding'}</span>
            {(quest.languages || []).map(l => (
              <span key={l} className="inline-flex items-center gap-1.5 normal-case tracking-normal font-semibold text-slate-300">
                <span className={`w-1.5 h-1.5 rounded-full ${(LANG[l] || {}).dot || 'bg-slate-400'}`} aria-hidden="true" />
                {(LANG[l] || {}).name || l}
              </span>
            ))}
            {quest.difficulty && <span className={DIFF[quest.difficulty] || 'text-slate-300'}>{quest.difficulty}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-5 md:gap-7">
        <div>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-500">Reward</p>
          <p className="font-cinzel text-xl font-bold text-amber-200 leading-tight">+{quest.xp_reward} XP</p>
        </div>
        <p className="hidden lg:flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] uppercase text-emerald-300 w-[110px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          {due ? due : 'Available'}
        </p>
        <QuestButton
          onClick={() => onSelectQuest(quest, group)}
          ariaLabel={`Take quest: ${quest.title}`}
          className="shrink-0 !px-5 !py-2.5 !text-xs max-sm:min-h-[44px]"
        />
      </div>
    </li>
  )
}

function SubjectBlock({ group, quests, expanded, onToggle, onSelectQuest }) {
  const shown = expanded ? quests : quests.slice(0, PREVIEW_COUNT)
  const more = quests.length > PREVIEW_COUNT
  return (
    <section aria-label={group.subject_name} className="mb-9">
      <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-3 mb-3">
        <div className="shrink-0 w-12 h-12 rounded-full border-2 border-amber-300/70 bg-[#0b1224] flex items-center justify-center" aria-hidden="true">
          <CourseEmblem name={group.subject_name} />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="font-cinzel text-lg font-bold tracking-wide text-white uppercase break-words">{group.subject_name}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {quests.length} open {quests.length === 1 ? 'quest' : 'quests'}
            {more && !expanded ? ` · showing ${PREVIEW_COUNT} of ${quests.length}` : ''}
            {group.section_no ? ` · ${group.section_no}` : ''}
            {group.instructor ? ` · ${group.instructor}` : ''}
          </p>
        </div>
        {more && (
          <button
            onClick={onToggle}
            aria-expanded={expanded}
            className="shrink-0 max-sm:w-full px-4 py-2 rounded-lg border border-amber-300/40 bg-slate-950/40 hover:bg-slate-900/70 text-amber-100 text-[11px] font-bold tracking-[0.14em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 max-sm:min-h-[44px]"
          >
            {expanded ? 'Show fewer' : `Show all ${quests.length}`}
          </button>
        )}
      </div>
      <ul className="space-y-3">
        {shown.map(q => <QuestRow key={q.id} quest={q} group={group} onSelectQuest={onSelectQuest} />)}
      </ul>
    </section>
  )
}

export default function BountyBoard({ onSelectQuest }) {
  const [state, setState] = useState('loading') // loading | ready | error
  const [groups, setGroups] = useState([])
  const [type, setType] = useState('all')
  const [subjectId, setSubjectId] = useState('all')
  const [expanded, setExpanded] = useState({})

  const load = useCallback(async () => {
    setState('loading')
    try {
      const data = await api.get('/api/student/open-quests')
      setGroups(Array.isArray(data) ? data : [])
      setState('ready')
    } catch (err) {
      console.error('Failed to load bounty board:', err)
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const matches = useCallback((q) => {
    if (type === 'coding') return q.problem_type !== 'debugging'
    if (type === 'debugging') return q.problem_type === 'debugging'
    if (type === 'event') return !!q.is_event_quest
    return true
  }, [type])

  const visible = useMemo(() => groups
    .filter(g => subjectId === 'all' || String(g.subject_id) === subjectId)
    .map(g => ({ group: g, quests: (g.quests || []).filter(matches) }))
    .filter(x => x.quests.length > 0), [groups, subjectId, matches])

  const totalAll = groups.reduce((n, g) => n + (g.quests || []).length, 0)
  const totalShown = visible.reduce((n, x) => n + x.quests.length, 0)

  const Title = (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />
        <h1 className="font-cinzel text-3xl font-bold tracking-wide text-white uppercase">Bounty Board</h1>
      </div>
      {state === 'ready' && totalAll > 0 && (
        <p className="mt-1 ml-[22px] text-sm text-slate-400">
          {totalAll} open {totalAll === 1 ? 'quest' : 'quests'} across {groups.length} {groups.length === 1 ? 'course' : 'courses'}
        </p>
      )}
    </div>
  )

  if (state === 'loading') {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto" aria-busy="true">
        {Title}
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map(i => <div key={i} className="h-[76px] rounded-xl bg-slate-900/70 border border-slate-800" />)}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {Title}
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-6 text-center">
          <p role="alert" className="text-sm text-slate-300 mb-3">We could not load the bounty board.</p>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 max-sm:min-h-[44px]">Try again</button>
        </div>
      </div>
    )
  }

  if (totalAll === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {Title}
        <div className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-8 text-center">
          <h2 className="font-cinzel text-xl font-bold text-white mb-1">The Bounty Board is quiet</h2>
          <p className="text-sm text-slate-400">No open quests across your courses right now. New bounties appear as your professors publish them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {Title}

      <div className="flex flex-wrap items-center gap-2 mb-8">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setType(f.key)}
            aria-pressed={type === f.key}
            className={`px-4 py-2 rounded-full border text-xs font-bold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 max-sm:min-h-[44px] ${
              type === f.key
                ? 'border-amber-300/70 bg-violet-600/30 text-white'
                : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-amber-300/40'
            }`}
          >
            {f.label}
          </button>
        ))}
        <label className="sr-only" htmlFor="bounty-course">Course</label>
        <select
          id="bounty-course"
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          className="px-4 py-2 rounded-full border border-slate-700 bg-slate-900/50 text-xs font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 max-sm:min-h-[44px] max-w-full"
        >
          <option value="all">All Courses</option>
          {groups.map(g => <option key={g.subject_id} value={String(g.subject_id)}>{g.subject_name}</option>)}
        </select>
        <p className="w-full lg:w-auto lg:ml-auto text-xs text-slate-500">Open quests are listed first in each course.</p>
      </div>

      {totalShown === 0 ? (
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-6 text-center">
          <p className="text-sm text-slate-300 mb-3">No open quests match these filters.</p>
          <button
            onClick={() => { setType('all'); setSubjectId('all') }}
            className="px-4 py-2 rounded-lg border border-amber-300/40 bg-slate-950/40 hover:bg-slate-900/70 text-amber-100 text-xs font-bold tracking-[0.14em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 max-sm:min-h-[44px]"
          >
            Clear filters
          </button>
        </div>
      ) : (
        visible.map(({ group, quests }) => (
          <SubjectBlock
            key={group.subject_id}
            group={group}
            quests={quests}
            expanded={!!expanded[group.subject_id]}
            onToggle={() => setExpanded(e => ({ ...e, [group.subject_id]: !e[group.subject_id] }))}
            onSelectQuest={onSelectQuest}
          />
        ))
      )}
    </div>
  )
}
