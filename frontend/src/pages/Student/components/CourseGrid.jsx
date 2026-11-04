// "Courses" section of the Dashboard home: the student's enrolled courses as
// cards (name, code, semester, instructor, quest progress). Shows the first four;
// "View all courses" opens the full My Subjects page.
// "Mastery" = quests cleared out of the quests the student can see in that course.
// States: loading skeleton, error with retry, empty.

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api/client'

const MAX_CARDS = 4

function SectionTitle({ onViewAll, showLink }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-2 h-2 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />
      <h2 className="font-cinzel text-xl font-bold tracking-wide text-white">Courses</h2>
      <span className="flex-1 h-px bg-gradient-to-r from-amber-300/30 to-transparent" aria-hidden="true" />
      {showLink && (
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-amber-200 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 rounded"
        >
          View all courses →
        </button>
      )}
    </div>
  )
}

function CourseCard({ subject, onOpen }) {
  const total = subject.quests_total || 0
  const done = subject.quests_done || 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <button
      onClick={() => onOpen(subject)}
      aria-label={`Enter course: ${subject.name}`}
      className="group text-left rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 hover:border-amber-300/60 hover:shadow-lg hover:shadow-violet-900/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-full border-2 border-amber-300/70 bg-[#0b1224] flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2.500 18 12l-6 9.500L6 12z" fill="#a78bfa" /><path d="M12 2.500 18 12h-6z" fill="#c4b5fd" /></svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-cinzel font-bold text-[15px] leading-snug text-white group-hover:text-amber-100 transition line-clamp-2 break-words">{subject.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {[subject.section_no, subject.semester].filter(Boolean).join(' · ') || 'Current'}
          </p>
          <span className="inline-block mt-1.5 max-w-full truncate px-2.5 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-[10px] font-semibold text-slate-300">
            {subject.instructor || 'TBA'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] font-bold tracking-[0.18em] uppercase">
        <span className="text-slate-500">Mastery</span>
        <span className="text-amber-200">{pct}%</span>
      </div>
      <div
        className="mt-1 h-1.5 rounded-full bg-[#070b18] border border-slate-700/60 overflow-hidden"
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        aria-label={`${done} of ${total} quests cleared`}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-slate-500">{done} of {total} {total === 1 ? 'quest' : 'quests'} cleared</p>

      <p className="mt-2 text-right text-[10px] font-bold tracking-[0.2em] uppercase text-amber-200 group-hover:text-white transition">
        Enter course ▸
      </p>
    </button>
  )
}

export default function CourseGrid({ onSelectSubject, onViewAll }) {
  const [state, setState] = useState('loading') // loading | ready | empty | error
  const [subjects, setSubjects] = useState([])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const rows = await api.get('/api/student/subjects')
      const list = Array.isArray(rows) ? rows : []
      setSubjects(list)
      setState(list.length ? 'ready' : 'empty')
    } catch (err) {
      console.error('Failed to load courses:', err)
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = (s) => onSelectSubject && onSelectSubject({
    id: s.id,
    name: s.name,
    section_id: s.section_id,
    section_no: s.section_no,
    semester: s.semester,
    instructor: s.instructor,
  })

  return (
    <section aria-labelledby="courses-heading" className="mb-8">
      <h2 id="courses-heading" className="sr-only">Courses</h2>
      <SectionTitle onViewAll={onViewAll} showLink={state === 'ready' && subjects.length > MAX_CARDS} />

      {state === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse" aria-busy="true">
          {[0, 1].map(i => <div key={i} className="h-[170px] rounded-xl bg-slate-900/70 border border-slate-800" />)}
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-5 text-center">
          <p role="alert" className="text-sm text-slate-300 mb-3">We could not load your courses.</p>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Try again</button>
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-xl border border-amber-300/25 bg-[#0b1224] p-6 text-center">
          <p className="font-cinzel font-bold text-white mb-1">No courses yet</p>
          <p className="text-sm text-slate-400">You are not enrolled in any course. Contact your administrator to be added to a class.</p>
        </div>
      )}

      {state === 'ready' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.slice(0, MAX_CARDS).map(s => <CourseCard key={s.id} subject={s} onOpen={open} />)}
        </div>
      )}
    </section>
  )
}
