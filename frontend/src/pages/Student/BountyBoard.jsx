// Bounty Board — every open quest across all of a student's enrolled
// subjects, in one place, grouped by subject with a clear break between
// each one so it's obvious at a glance which subject each quest belongs to.
//
// "open" means no submission exists yet for that quest — running code
// doesn't remove it from here, only a real Submit does (matches how
// resubmission already gets locked everywhere else in the app).
//
// clicking a quest hands both the quest AND its subject info back up to
// StudentDashboard, so it can drop the student straight into that quest
// inside the correct subject's tabs — same as picking it normally from
// that subject's own Quest Board.

import { useState, useEffect } from 'react'
import { api } from '../../api/client'

export default function BountyBoard({ onSelectQuest }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch every open quest across the student's enrolled subjects
  useEffect(() => {
    const fetchOpenQuests = async () => {
      try {
        const data = await api.get('/api/student/open-quests')
        setGroups(data)
      } catch (err) {
        console.error('Failed to load bounty board:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOpenQuests()
  }, [])

  const difficultyStyles = {
    Easy: 'bg-green-600/20 text-green-400 border-green-600/40',
    Medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
    Hard: 'bg-red-600/20 text-red-400 border-red-600/40'
  }

  // Show skeleton quest cards while everything is still loading
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <div className="h-8 bg-slate-800 rounded w-56 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-800 rounded w-72 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 sm:p-5 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-700 rounded w-full mb-2" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show an empty state when there are no open quests anywhere
  if (groups.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🏴</div>
          <h2 className="text-2xl font-bold text-white mb-2">Bounty Board Clear!</h2>
          <p className="text-slate-400">No open quests across any of your subjects right now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-4xl">🏴</span> Bounty Board
        </h1>
        <p className="text-slate-400 mt-1">Every open quest across all your subjects, in one place.</p>
      </div>

      {groups.map((group, gi) => (
        <div key={group.subject_id}>
          {/* Subject section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-xl shrink-0">
              📖
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{group.subject_name}</h2>
              <p className="text-xs text-slate-500">
                🏷️ {group.section_no} · 👨‍🏫 {group.instructor} · {group.quests.length} open
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {group.quests.map(quest => (
              <div
                key={quest.id}
                onClick={() => onSelectQuest(quest, group)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-5 hover:border-purple-500/50 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3 flex-wrap gap-1">
                  <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${difficultyStyles[quest.difficulty]}`}>
                    {quest.difficulty}
                  </span>
                  {quest.is_event_quest && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-[10px] sm:text-xs font-bold">
                      🎉 EVENT
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2">{quest.title}</h3>
                <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-800">
                  <div className="flex gap-1">
                    {quest.languages?.map(lang => (
                      <span key={lang} className="text-sm" title={lang}>
                        {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}
                      </span>
                    ))}
                  </div>
                  <span className="text-yellow-400 font-bold text-sm">{quest.xp_reward} XP</span>
                </div>
              </div>
            ))}
          </div>

          {/* Divider between subjects — not after the last one */}
          {gi < groups.length - 1 && (
            <div className="mt-8 border-t border-dashed border-slate-700"></div>
          )}
        </div>
      ))}
    </div>
  )
}