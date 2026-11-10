// "Bounty Board" section of the Dashboard home: the next few open quests
// (from /api/student/open-quests, same data as the Bounty Board page).
// Order: nearest due date first, undated last. Shows up to three.
// States: loading, error with retry, empty ("quiet" + Browse Courses), quests.

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api/client'
import { parseApiTimestamp } from '../../../utils/apiTimestamp'
import QuestButton from './QuestButton'
import SectionTitle from './SectionTitle'

const MAX_ROWS = 3

function flatten(groups) {
  const all = []
  for (const g of groups || []) for (const q of g.quests || []) all.push({ quest: q, group: g })
  all.sort((a, b) => {
    const da = a.quest.due_date ? (parseApiTimestamp(a.quest.due_date)?.getTime() ?? Infinity) : Infinity
    const db = b.quest.due_date ? (parseApiTimestamp(b.quest.due_date)?.getTime() ?? Infinity) : Infinity
    return da - db
  })
  return all
}

function dueText(d) {
  if (!d) return null
  const t = parseApiTimestamp(d)
  if (!t) return null
  return `Due ${t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export default function BountyPreview({ onSelectQuest, onBrowseBoard, onBrowseCourses }) {
  const [state, setState] = useState('loading') // loading | ready | empty | error
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const groups = await api.get('/api/student/open-quests')
      const all = flatten(Array.isArray(groups) ? groups : [])
      setTotal(all.length)
      setRows(all.slice(0, MAX_ROWS))
      setState(all.length ? 'ready' : 'empty')
    } catch (err) {
      console.error('Failed to load bounty preview:', err)
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <section aria-labelledby="bounty-heading" className="mb-8">
      <h2 id="bounty-heading" className="sr-only">Bounty Board</h2>
      <SectionTitle actionLabel={state === 'ready' && total > MAX_ROWS ? `View all ${total} →` : null} onAction={onBrowseBoard}>
        Bounty Board
      </SectionTitle>

      {state === 'loading' && (
        <div className="space-y-3 animate-pulse" aria-busy="true">
          {[0, 1].map(i => <div key={i} className="h-[72px] rounded-xl bg-slate-900/70 border border-slate-800" />)}
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-5 text-center">
          <p role="alert" className="text-sm text-slate-300 mb-3">We could not load the bounty board.</p>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Try again</button>
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="shrink-0 w-14 h-14 rounded-full border-2 border-amber-300/70 bg-[#0b1224] flex items-center justify-center" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f3d78a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21V4m0 1h11l-2.500 4L17 13H6" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-cinzel font-bold text-white">The Bounty Board is quiet</h3>
            <p className="text-sm text-slate-400 mt-0.5">No open quests across your courses right now. New bounties appear as your professors publish them.</p>
          </div>
          <button
            onClick={onBrowseCourses}
            className="shrink-0 px-5 py-2.5 rounded-lg border border-amber-300/40 bg-slate-950/40 hover:bg-slate-900/70 text-amber-100 text-xs font-bold tracking-[0.15em] uppercase transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Browse courses
          </button>
        </div>
      )}

      {state === 'ready' && (
        <ul className="space-y-3">
          {rows.map(({ quest, group }) => {
            const due = dueText(quest.due_date)
            return (
              <li key={`${group.subject_id}-${quest.id}`} className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-cinzel font-bold text-[15px] text-white truncate">{quest.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{group.subject_name}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
                    {quest.difficulty && <span className="px-2.5 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-200">{quest.difficulty}</span>}
                    {quest.xp_reward != null && <span className="px-2.5 py-0.5 rounded-full border border-amber-300/30 text-amber-200">+{quest.xp_reward} XP</span>}
                    {due && <span className="px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300">{due}</span>}
                  </div>
                </div>
                <QuestButton
                  onClick={() => onSelectQuest && onSelectQuest(quest, group)}
                  ariaLabel={`Take quest: ${quest.title}`}
                  className="shrink-0 w-full sm:w-auto"
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
