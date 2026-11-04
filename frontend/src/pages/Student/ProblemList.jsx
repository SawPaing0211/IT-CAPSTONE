import { useState, useEffect, useMemo } from 'react'
import { API_BASE, authFetch } from '../../api/client'

const PAGE_SIZE = 6
const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 }
const DIFF_STYLE = {
  Easy:   'text-emerald-300 border-emerald-400/35 bg-emerald-400/10',
  Medium: 'text-amber-200 border-amber-300/40 bg-amber-300/10',
  Hard:   'text-rose-300 border-rose-400/40 bg-rose-400/10',
}
const LANG_LABEL = { python: 'Python', java: 'Java', csharp: 'C#' }
const TYPE_PILLS = [
  { id: 'all', label: 'All quests' },
  { id: 'coding', label: 'Coding' },
  { id: 'debugging', label: 'Debugging' },
  { id: 'event', label: 'Event' },
]
const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'xp', label: 'Most XP' },
  { id: 'difficulty', label: 'Easiest first' },
  { id: 'due', label: 'Due soonest' },
]

const selectCls = 'min-h-[44px] rounded-lg border border-slate-700 bg-[#0b1224] px-3 text-sm text-slate-200 focus:border-amber-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:min-h-[38px]'

export default function ProblemList({ onSelectQuest, currentLevel, sectionId, subjectId }) {
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({})   // { [questId]: { languages_done: [...] } }
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  // Re-fetch quests whenever the filter or subject changes
  useEffect(() => {
    fetchQuests()
  }, [filter, sectionId, subjectId])

  // any change to what's shown starts again from page 1
  useEffect(() => { setPage(1) }, [filter, search, langFilter, sort, sectionId, subjectId])

  // Fetch the quest list for the current filter and subject
  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = `${API_BASE}/api/problems`

      // (section filtering happens server-side from the student's own
      // enrollment — no section_id param needed or read by the backend)
      const params = []
      if (subjectId) params.push(`subject_id=${subjectId}`)
      if (filter === 'coding' || filter === 'debugging') params.push(`type=${filter}`)
      if (params.length > 0) url += '?' + params.join('&')

      const res = await authFetch(url, { headers: { 'Authorization': `Bearer ${token}` } })

      // which languages this student already submitted, per quest (for the card progress)
      try {
        const pr = await authFetch(`${API_BASE}/api/student/quest-progress`, { headers: { 'Authorization': `Bearer ${token}` } })
        if (pr.ok) setProgress(await pr.json())
      } catch { /* rows just show no progress */ }

      if (res.ok) {
        const data = await res.json()
        setQuests(filter === 'event' ? data.filter(q => q.is_event_quest) : data)
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err)
    } finally {
      setLoading(false)
    }
  }

  // per-language progress: Optional quests count as conquered after the first language,
  // Required quests only when every ticked language is submitted
  const statusOf = (quest) => {
    const done = progress[String(quest.id)]?.languages_done || []
    const total = quest.languages?.length || 1
    const multi = total > 1
    const conquered = done.length > 0 && (!multi || quest.language_rule !== 'required' || done.length >= total)
    return { done, total, multi, conquered, started: done.length > 0 }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = quests.filter(x =>
      (!q || x.title?.toLowerCase().includes(q) || x.description?.toLowerCase().includes(q)) &&
      (langFilter === 'all' || x.languages?.includes(langFilter))
    )
    list = [...list]
    if (sort === 'xp') list.sort((a, b) => b.xp_reward - a.xp_reward)
    else if (sort === 'difficulty') list.sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9))
    else if (sort === 'due') list.sort((a, b) => (a.due_date ? new Date(a.due_date) : Infinity) - (b.due_date ? new Date(b.due_date) : Infinity))
    else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return list
  }, [quests, search, langFilter, sort])

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const pageItems = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-11 animate-pulse rounded-lg bg-slate-800/60" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-amber-300/10 bg-[#0b1224]" />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Search + selects */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search quests"
          aria-label="Search quests"
          className={`${selectCls} w-full placeholder:text-slate-500`}
        />
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)} aria-label="Filter by language" className={selectCls}>
          <option value="all">All languages</option>
          {Object.entries(LANG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort quests" className={selectCls}>
          {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Type pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Quest type">
        {TYPE_PILLS.map(p => (
          <button
            key={p.id}
            role="tab"
            aria-selected={filter === p.id}
            onClick={() => setFilter(p.id)}
            className={`min-h-[44px] rounded-lg border px-4 text-[11px] font-bold uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:min-h-[36px] ${
              filter === p.id
                ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{visible.length} {visible.length === 1 ? 'quest' : 'quests'}</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] px-6 py-14 text-center">
          <span className="mx-auto mb-4 block h-2 w-2 rotate-45 bg-amber-300" aria-hidden="true" />
          <h3 className="font-cinzel text-xl font-bold text-amber-100">
            {quests.length === 0 ? 'No quests available' : 'No quests match'}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {quests.length === 0 ? 'Check back later or ask your instructor for new challenges.' : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pageItems.map(quest => {
            const st = statusOf(quest)
            const label = st.conquered ? 'Conquered' : st.started ? 'In progress' : 'Not started'
            const statusCls = st.conquered
              ? 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10'
              : st.started ? 'text-amber-200 border-amber-300/40 bg-amber-300/10'
              : 'text-slate-400 border-slate-600'
            const cta = st.started ? (st.multi && st.done.length < st.total && !st.conquered ? 'Continue' : 'View quest') : 'Start quest'
            return (
              <li key={quest.id}>
                <button
                  onClick={() => onSelectQuest(quest)}
                  className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 pl-5 text-left transition hover:border-amber-300/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:flex-row sm:items-center sm:gap-5 sm:p-5 sm:pl-6"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${st.conquered ? 'bg-emerald-400' : st.started ? 'bg-amber-300' : 'bg-violet-400'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-cinzel text-lg font-bold leading-snug text-amber-50 group-hover:text-amber-200">{quest.title}</span>
                      {quest.is_event_quest && (
                        <span className="rounded border border-violet-400/50 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">Event</span>
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-slate-400">{quest.description}</span>
                    <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                      <span className={`rounded border px-2 py-0.5 font-bold uppercase tracking-wider ${DIFF_STYLE[quest.difficulty] || DIFF_STYLE.Medium}`}>{quest.difficulty}</span>
                      {quest.languages?.map(l => (
                        <span key={l} className={`rounded border px-2 py-0.5 font-bold ${st.done.includes(l) ? 'border-emerald-400/40 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>
                          {LANG_LABEL[l] || l}{st.done.includes(l) ? ' ✓' : ''}
                        </span>
                      ))}
                      {st.multi && st.started && <span>{st.done.length} of {st.total} languages</span>}
                      {quest.estimated_time ? <span>~{quest.estimated_time} min</span> : null}
                      {quest.due_date && <span className="text-orange-300">Due {new Date(quest.due_date).toLocaleDateString()}</span>}
                      {!sectionId && quest.section_names?.[0] && <span>{quest.section_names[0]}</span>}
                    </span>
                  </span>

                  <span className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-2">
                    <span className="text-left sm:text-right">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Reward</span>
                      <span className="font-cinzel text-xl font-bold text-amber-300">{quest.xp_reward} XP</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCls}`}>{label}</span>
                      <span className="rounded-lg border border-amber-300/55 bg-gradient-to-b from-violet-500 via-violet-600 to-violet-800 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.65)] transition group-hover:border-amber-200/80">{cta}</span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Quest pages">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 1}
            className="min-h-[44px] rounded-lg border border-slate-700 px-4 text-xs font-bold uppercase tracking-wider text-slate-300 transition enabled:hover:border-amber-300/50 disabled:opacity-40 sm:min-h-[36px]"
          >Prev</button>
          <span className="px-2 text-xs text-slate-400">Page {current} of {pages}</span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current === pages}
            className="min-h-[44px] rounded-lg border border-slate-700 px-4 text-xs font-bold uppercase tracking-wider text-slate-300 transition enabled:hover:border-amber-300/50 disabled:opacity-40 sm:min-h-[36px]"
          >Next</button>
        </nav>
      )}
    </div>
  )
}
