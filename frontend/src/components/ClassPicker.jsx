// Reusable "pick one of your classes" flow — two steps: pick the subject,
// then pick which class/section you teach it in. An instructor can teach the
// same subject across several sections, or teach a handful of unrelated
// subjects, so a single flat list of classes gets confusing fast. If there's
// only one subject, or only one class overall, we skip straight past
// whichever step has nothing to pick.
//
// Extracted from SelectClassForQuest.jsx (the quest-creation "pick a class
// first" screen) so the same safeguard — "you must pick a specific class
// before you can continue" — can be reused anywhere else that has the same
// problem, e.g. Announcements.jsx's standalone route.
//
// Presentational only: it doesn't navigate anywhere. The caller supplies
// onSelect(cls) and decides what happens next (navigate, set state, etc).

import { useState, useEffect, useMemo } from 'react'
import { API_BASE } from '../api/client'

const GRADIENTS = [
  'from-purple-600 to-pink-600',
  'from-blue-600 to-purple-600',
  'from-emerald-600 to-teal-600',
  'from-rose-600 to-orange-600',
  'from-amber-600 to-yellow-600',
  'from-cyan-600 to-blue-600',
]
const SUBJECT_ICONS = ['📐', '🧪', '🌐', '💻', '📊', '🎨', '🔬', '📚']

// Stable-ish pick based on an id, so a subject/class keeps its color even
// if the list re-sorts between renders.
const pickFrom = (arr, id) => arr[Math.abs(Number(id) || 0) % arr.length]

export default function ClassPicker({
  onSelect,
  onCancel,
  actionLabel = 'Choose a Class',
  actionIcon = '🏫',
  prompt = 'Which class is this for?',
}) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch and normalize the instructor's classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/instructor/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setClasses(data.map(c => ({
          id:         c.id,
          subjectId:  c.subject_id,
          name:       c.section_no,
          title:      c.subjects?.length > 0 ? c.subjects.join(' · ') : c.name,
          subjectName: c.subjects?.length > 0 ? c.subjects[0] : (c.name || 'Untitled Subject'),
          semester:   c.semester || 'Current Semester',
          students:   c.student_count || 0,
          problems:   c.problem_count || 0,
        })))
      } catch (err) {
        console.error('Failed to fetch classes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  // Group classes by subject, so step 1 can show "one card per subject"
  const subjectGroups = useMemo(() => {
    const bySubject = new Map()
    for (const cls of classes) {
      const key = cls.subjectId ?? `unassigned-${cls.id}`
      if (!bySubject.has(key)) {
        bySubject.set(key, {
          subjectId: cls.subjectId,
          name: cls.subjectName,
          classes: [],
        })
      }
      bySubject.get(key).classes.push(cls)
    }
    return Array.from(bySubject.values())
  }, [classes])

  const onlyOneSubject = subjectGroups.length <= 1
  // Nothing to pick between subjects — treat the only one as already chosen
  const effectiveSubjectId = selectedSubjectId ?? (onlyOneSubject ? subjectGroups[0]?.subjectId : null)
  const step = effectiveSubjectId != null || onlyOneSubject ? 'class' : 'subject'
  const selectedGroup = subjectGroups.find(g => g.subjectId === effectiveSubjectId) || subjectGroups[0]

  // Nothing to choose between at all — skip both steps and hand back the one
  // class that exists.
  useEffect(() => {
    if (!loading && subjectGroups.length === 1 && subjectGroups[0].classes.length === 1) {
      onSelect(subjectGroups[0].classes[0], { auto: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, subjectGroups])

  const handleBack = () => {
    if (step === 'class' && !onlyOneSubject) {
      setSelectedSubjectId(null)
      setSearchTerm('')
    } else if (onCancel) {
      onCancel()
    }
  }

  const filteredSubjects = subjectGroups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredClasses = (selectedGroup?.classes || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        {(step === 'class' && !onlyOneSubject) || onCancel ? (
          <button
            onClick={handleBack}
            className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
            aria-label="Back"
          >
            ←
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {step === 'subject' ? (
              <>{actionIcon} {actionLabel} — Choose a Subject</>
            ) : (
              <>{actionIcon} {actionLabel}</>
            )}
          </h1>
          {step === 'subject' ? (
            <p className="text-slate-400 mt-0.5 text-sm">
              Which subject is this for?
            </p>
          ) : (
            <p className="text-slate-400 mt-0.5 text-sm flex items-center gap-1.5 flex-wrap">
              {!onlyOneSubject && (
                <button
                  onClick={() => { setSelectedSubjectId(null); setSearchTerm('') }}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition"
                >
                  {selectedGroup?.name}
                </button>
              )}
              {!onlyOneSubject && <span className="text-slate-600">/</span>}
              <span>{prompt}</span>
            </p>
          )}
        </div>
      </div>

      {/* Search */}
      {!loading && (step === 'subject' ? filteredSubjects.length > 3 : (selectedGroup?.classes.length || 0) > 3) && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder={step === 'subject' ? 'Search subjects...' : 'Search by class code...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 pl-12 text-white placeholder-slate-600 focus:border-purple-500/60 focus:outline-none transition text-sm min-h-[44px]"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
            <p className="text-slate-500 text-sm animate-pulse">Loading your classes...</p>
          </div>
        </div>
      ) : subjectGroups.length === 0 ? (
        <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">🏫</div>
          <p className="text-slate-300 text-lg font-semibold mb-1">No classes assigned yet</p>
          <p className="text-slate-500 text-sm">Contact your admin to get assigned to a class first.</p>
        </div>

      ) : step === 'subject' ? (
        filteredSubjects.length === 0 ? (
          <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-300 text-lg font-semibold mb-1">No subjects match your search</p>
            <p className="text-slate-500 text-sm">Try a different search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((group, idx) => {
              const gradient = pickFrom(GRADIENTS, group.subjectId ?? idx)
              const icon = pickFrom(SUBJECT_ICONS, group.subjectId ?? idx)
              const totalStudents = group.classes.reduce((sum, c) => sum + c.students, 0)
              return (
                <button
                  key={group.subjectId ?? `unassigned-${idx}`}
                  onClick={() => { setSelectedSubjectId(group.subjectId); setSearchTerm('') }}
                  style={{ animationDelay: `${idx * 60}ms`, animation: 'fadeSlideUp 0.4s ease-out both' }}
                  className="text-left bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-purple-500 hover:shadow-lg hover:shadow-purple-600/20 transition-all duration-300 group hover:scale-[1.02] min-h-[44px]"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                        {icon}
                      </div>
                      <span className="px-3 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full text-xs font-bold text-purple-300 whitespace-nowrap">
                        {group.classes.length} {group.classes.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-purple-300 transition truncate">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-700 text-xs text-slate-500">
                      <span>👥 {totalStudents} students total</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )

      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">🏫</div>
          <p className="text-slate-300 text-lg font-semibold mb-1">No classes match your search</p>
          <p className="text-slate-500 text-sm">Try a different search.</p>
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls, idx) => {
            const gradient = pickFrom(GRADIENTS, cls.id)
            return (
              <button
                key={cls.id}
                onClick={() => onSelect(cls)}
                style={{ animationDelay: `${idx * 60}ms`, animation: 'fadeSlideUp 0.4s ease-out both' }}
                className="text-left bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/40 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 group hover:scale-[1.02] min-h-[44px]"
              >
                <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-lg shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                      🏫
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold group-hover:text-purple-300 transition truncate">{cls.name}</h3>
                      <p className="text-slate-400 text-xs truncate">{cls.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-800">
                    <span>👥 {cls.students} students</span>
                    <span>📝 {cls.problems} quests</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
