// "The Hero" panel on the Dashboard home: level medallion, name, XP in the current
// level, streak and trophy count, plus the most recent earned trophies.
// Data: the same hero stats the top bar uses, and the shared achievements list.
// There are no rarity tiers or rank titles in the app, so none are shown.

import useAchievements from '../../../hooks/useAchievements'
import { splitAchievements } from '../../../utils/achievementView'

const MAX_RECENT = 4

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-700/70 bg-[#0b1326] px-3 py-2.5">
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="font-cinzel font-bold text-white text-sm leading-tight">{value}</p>
        <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function HeroPanel({ stats, user, onOpenHeroSheet }) {
  const { achievements, loading, error } = useAchievements()
  const ach = splitAchievements(achievements)
  const level = stats?.level || 1
  const totalXp = stats?.total_xp || 0
  const xpInLevel = totalXp % 100
  const name = user?.full_name || user?.username || 'Adventurer'

  const recent = [...ach.earned]
    .sort((a, b) => new Date(b.earned_at || 0) - new Date(a.earned_at || 0))
    .slice(0, MAX_RECENT)

  return (
    <aside aria-labelledby="hero-heading" className="rounded-2xl border border-amber-300/25 bg-gradient-to-b from-[#101a3a] to-[#0a1024] p-5 shadow-xl shadow-purple-950/30">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-300/40" aria-hidden="true" />
        <h2 id="hero-heading" className="font-cinzel text-sm font-bold tracking-[0.25em] uppercase text-amber-200">The Hero</h2>
        <span className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-300/40" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/25" role="img" aria-label={`Level ${level}`}>
          <div className="w-full h-full rounded-full bg-[#0b1224] border border-violet-500/40 flex flex-col items-center justify-center leading-none">
            <span className="text-[10px] font-bold tracking-[0.25em] text-amber-200">LV</span>
            <span className="font-cinzel text-5xl font-black text-white mt-1">{level}</span>
          </div>
        </div>
        <p className="font-cinzel font-bold text-lg text-white mt-4 break-words max-w-full">{name}</p>
        <p className="text-xs text-slate-400">Level {level}</p>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-[10px] font-bold tracking-[0.18em] uppercase">
          <span className="text-slate-500">Experience</span>
          <span className="text-slate-300">{xpInLevel} / 100</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-[#070b18] border border-slate-700/60 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpInLevel} aria-label="Progress to next level">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500" style={{ width: `${Math.max(xpInLevel, 3)}%` }} />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">{totalXp} XP total · {100 - xpInLevel} to next level</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat
          icon={<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2c1 4-3 5.500-3 9.500a3 3 0 0 0 6 0c0-1-.4-1.800-1-2.500 3 1.500 5 4 5 7A7 7 0 0 1 5 16c0-3 1.500-5 3-6.500C9 8 11 5.500 12 2z" fill="#fb923c" /></svg>}
          value={`${stats?.streak || 0} ${(stats?.streak || 0) === 1 ? 'Day' : 'Days'}`}
          label="Streak"
        />
        <Stat
          icon={<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f3d78a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.500A3 3 0 0 0 8 10.500M16 6h3v1.500a3 3 0 0 1-3 3M12 13v4m-3.500 3h7M10 17h4" /></svg>}
          value={loading || error ? '–' : `${ach.earned.length} / ${ach.denominator}`}
          label="Trophies"
        />
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-2">Recent trophies</p>
        {loading ? (
          <div className="flex gap-3 animate-pulse" aria-busy="true">
            {[0, 1, 2, 3].map(i => <div key={i} className="w-11 h-11 rounded-full bg-slate-800" />)}
          </div>
        ) : error ? (
          <p role="alert" className="text-xs text-slate-400">Trophies could not be loaded.</p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-slate-400">No trophies yet. Clear a quest to earn your first.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {recent.map(t => (
              <li key={t.id} className="w-14 text-center" title={t.name}>
                <div className="mx-auto w-11 h-11 rounded-full border-2 border-amber-300/60 bg-[#0b1224] flex items-center justify-center text-xl" aria-hidden="true">{t.icon || '🏆'}</div>
                <p className="mt-1 text-[9px] leading-tight text-slate-400 line-clamp-2 break-words">{t.name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onOpenHeroSheet}
        className="mt-5 w-full py-2.5 rounded-lg border border-amber-300/40 bg-slate-950/40 hover:bg-slate-900/70 hover:border-amber-300/70 text-amber-100 font-cinzel text-xs font-bold uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        Open Hero Sheet
      </button>
    </aside>
  )
}
