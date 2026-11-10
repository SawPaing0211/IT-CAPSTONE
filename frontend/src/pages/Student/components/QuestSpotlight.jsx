// Quest Spotlight — the "next quest" card at the top of the student's
// My Subjects page. It shows ONE real open quest (from /api/student/open-quests,
// the same data the Bounty Board uses) and drops the student straight into it.
//
// Pick rule: the open quest with the nearest due date, otherwise the first one.
// States: loading skeleton, error with Retry, empty ("all clear"), and the quest.
// The banner art is decorative (alt=""); all text and buttons are real elements.

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api/client'
import { parseApiTimestamp } from '../../../utils/apiTimestamp'
import QuestButton from './QuestButton'
import bannerArt from '../../../assets/landing/dashboard-spotlight-banner.webp'

const LANG_LABEL = { python: 'Python', java: 'Java', csharp: 'C#' }

function pickSpotlight(groups) {
  const all = []
  for (const g of groups || []) {
    for (const q of g.quests || []) all.push({ quest: q, group: g })
  }
  if (all.length === 0) return null
  const dated = all.filter(x => x.quest.due_date)
  if (dated.length > 0) {
    return dated.reduce((a, b) => (parseApiTimestamp(b.quest.due_date) < parseApiTimestamp(a.quest.due_date) ? b : a))
  }
  return all[0]
}

// the card shell: banner art + readability gradient + content
function Shell({ children, labelledBy, busy }) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-busy={busy ? 'true' : undefined}
      className="relative overflow-hidden rounded-2xl border border-amber-300/25 bg-slate-950 shadow-xl shadow-purple-950/30 mb-6 sm:mb-8"
    >
      <img
        src={bannerArt}
        alt=""
        aria-hidden="true"
        draggable="false"
        className="absolute inset-x-0 top-0 h-[200px] w-full object-cover object-[90%_50%] sm:inset-0 sm:h-full sm:object-[75%_54%] select-none pointer-events-none"
      />
      {/* mobile: fade the art into the card below it; desktop: keep the dark left side readable */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent from-[28%] via-slate-950/80 via-[40%] to-slate-950 to-[48%] sm:hidden" />
      <div className="absolute inset-0 pointer-events-none hidden sm:block bg-gradient-to-r from-slate-950/75 via-slate-950/45 via-[42%] to-transparent to-[62%]" />
      <div className="relative px-5 pb-6 pt-[188px] sm:px-9 sm:py-8 sm:min-h-[264px] sm:flex sm:flex-col sm:justify-center">
        <div className="sm:max-w-[58%]">{children}</div>
      </div>
    </section>
  )
}

export default function QuestSpotlight({ onSelectQuest, onBrowse }) {
  const [state, setState] = useState('loading') // loading | ready | empty | error
  const [pick, setPick] = useState(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const groups = await api.get('/api/student/open-quests')
      const chosen = pickSpotlight(Array.isArray(groups) ? groups : [])
      setPick(chosen)
      setState(chosen ? 'ready' : 'empty')
    } catch (err) {
      console.error('Failed to load quest spotlight:', err)
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (state === 'loading') {
    return (
      <Shell labelledBy="spotlight-loading" busy>
        <p id="spotlight-loading" className="sr-only">Loading your next quest</p>
        <div className="animate-pulse space-y-3" aria-hidden="true">
          <div className="h-3 w-32 rounded bg-slate-700/70" />
          <div className="h-8 w-3/4 rounded bg-slate-700/70" />
          <div className="h-4 w-full rounded bg-slate-700/60" />
          <div className="flex gap-2"><div className="h-6 w-20 rounded-full bg-slate-700/60" /><div className="h-6 w-16 rounded-full bg-slate-700/60" /></div>
          <div className="h-11 w-44 rounded-lg bg-slate-700/70" />
        </div>
      </Shell>
    )
  }

  if (state === 'error') {
    return (
      <Shell labelledBy="spotlight-title">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90 mb-2">Quest Spotlight</p>
        <h2 id="spotlight-title" className="font-cinzel text-2xl sm:text-3xl font-bold text-white mb-2">The scroll would not open</h2>
        <p role="alert" className="text-sm sm:text-base text-slate-300 mb-5">We could not load your next quest. Check your connection and try again.</p>
        <button
          onClick={load}
          className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Try again
        </button>
      </Shell>
    )
  }

  if (state === 'empty' || !pick) {
    return (
      <Shell labelledBy="spotlight-title">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90 mb-2">Quest Spotlight</p>
        <h2 id="spotlight-title" className="font-cinzel text-2xl sm:text-3xl font-bold text-white mb-2">Every quest conquered</h2>
        <p className="text-sm sm:text-base text-slate-300 mb-5">No open quests right now. New ones appear when your professor publishes them.</p>
        <button
          onClick={onBrowse}
          className="px-5 py-2.5 rounded-lg border border-slate-500/60 bg-slate-900/60 hover:bg-slate-800/80 text-slate-100 font-bold text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          Open the Bounty Board
        </button>
      </Shell>
    )
  }

  const { quest, group } = pick
  const langs = (quest.languages || ['python']).map(l => LANG_LABEL[l] || l)
  const multi = langs.length > 1
  const chips = [
    langs.join(' · '),
    ...(multi ? [quest.language_rule === 'required' ? 'All languages required' : 'Bonus XP for extra languages'] : []),
    quest.difficulty,
    quest.xp_reward != null ? `+${quest.xp_reward} XP` : null,
  ].filter(Boolean)

  return (
    <Shell labelledBy="spotlight-title">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/90 mb-2 truncate">
        Quest Spotlight{group?.subject_name ? <span className="text-slate-300/80 normal-case tracking-normal font-medium"> · {group.subject_name}</span> : null}
      </p>
      <h2 id="spotlight-title" className="font-cinzel text-2xl sm:text-4xl font-bold text-white leading-tight mb-2 break-words line-clamp-2">
        {quest.title}
      </h2>
      {quest.description && (
        <p className="text-sm sm:text-base text-slate-300 mb-4 line-clamp-2 break-words">{quest.description}</p>
      )}
      <ul className="flex flex-wrap gap-2 mb-5" aria-label="Quest details">
        {chips.map(c => (
          <li key={c} className="px-3 py-1 rounded-full border border-amber-300/25 bg-slate-950/50 text-xs font-bold text-slate-100">{c}</li>
        ))}
      </ul>
      <div className="flex flex-col sm:flex-row gap-3">
        <QuestButton
          onClick={() => onSelectQuest && onSelectQuest(quest, group)}
          ariaLabel={`Take quest: ${quest.title}`}
          className="w-full sm:w-auto"
        />
        <button
          onClick={onBrowse}
          className="w-full sm:w-auto px-6 py-3 rounded-lg border border-amber-300/40 bg-slate-950/50 hover:bg-slate-900/70 hover:border-amber-300/70 text-amber-100 font-cinzel font-bold text-sm uppercase tracking-[0.14em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          Bounty Board
        </button>
      </div>
    </Shell>
  )
}
