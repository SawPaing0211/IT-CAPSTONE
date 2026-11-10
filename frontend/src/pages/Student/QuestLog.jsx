import { useState, useEffect } from 'react'
import { API_BASE, authFetch } from '../../api/client'

export default function QuestLog({ sectionId }) {
  const [submissions, setSubmissions] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [loading, setLoading] = useState(true)

  // QuestLog only ever gets opened from inside one subject's course tabs, so
  // sectionId is always given — just resolve that one subject's details,
  // no need to offer a "pick a subject" dropdown here at all
  useEffect(() => {
    const fetchSectionInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        const subjectsRes = await authFetch(`${API_BASE}/api/student/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subjects = await subjectsRes.json()

        const subject = subjects.find(s => s.section_id === sectionId)
        if (subject) {
          setSelectedSection({
            id: subject.section_id,
            section_code: subject.section_no,
            name: subject.name,
            subject_id: subject.id,
            semester: subject.semester
          })
        } else {
          setSelectedSection({ id: sectionId, section_code: 'Section', name: 'Current Subject', subject_id: null })
        }
      } catch (err) {
        console.error('Failed to fetch section info:', err)
        setSelectedSection({ id: sectionId, section_code: 'Section', name: 'Current Subject', subject_id: null })
      }
    }
    fetchSectionInfo()
  }, [sectionId])

  // Fetch quests and submissions for the selected section, then merge them by quest
  useEffect(() => {
    if (!selectedSection) return

    const fetchSubmissions = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')

        const questsRes = await authFetch(
          `${API_BASE}/api/problems${selectedSection.subject_id ? `?subject_id=${selectedSection.subject_id}` : ''}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const allQuests = await questsRes.json()

        const subsRes = await authFetch(
          `${API_BASE}/api/student/submissions/by-section?section_id=${selectedSection.id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const subsData = await subsRes.json()
        const submissions = subsData.submissions || []
    
    // Merge: Each quest appears once with its best submission
    const questsWithStatus = allQuests.map(quest => {
      // Find best submission for this quest (accepted or latest)
      const questSubmissions = submissions.filter(s => s.problem_id === quest.id)
      const bestSubmission = questSubmissions.find(s => s.status === 'accepted') || 
                      questSubmissions[questSubmissions.length - 1]

const statusMap = {
  'accepted':     'conquered',
  'partial':      'partial',
  'wrong_answer': 'wrong',
  'error':        'error',
  'compile_error':'error',
  'timeout':      'timeout',
}
return {
  ...quest,
  status: bestSubmission
    ? (statusMap[bestSubmission.status] || 'ongoing')
    : 'not_started',
        submission: bestSubmission,
        attempts: questSubmissions.length
      }
    })
    
    setSubmissions(questsWithStatus)
  } catch (err) {
    console.error("Failed to load quests", err)
  } finally {
    setLoading(false)
  }
}
    
    fetchSubmissions()
  }, [selectedSection])

  // Show a loading message while section info resolves
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-amber-300/10 bg-[#0b1224]" />)}
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-amber-300/10 bg-[#0b1224]" />)}
      </div>
    )
  }

  const conquered = submissions.filter(s => s.status === 'conquered').length
  const attempted = submissions.filter(s => s.status !== 'not_started').length
  const xpEarned = submissions.reduce((sum, s) => {
    if (!s.submission) return sum
    return sum + (s.submission.score ?? 0)
  }, 0)
  const rate = attempted > 0 ? Math.round((conquered / attempted) * 100) : 0

  const STATUS = {
    conquered:   { label: 'Conquered',    cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' },
    partial:     { label: 'Partial',      cls: 'text-sky-300 border-sky-400/40 bg-sky-400/10' },
    wrong:       { label: 'Wrong answer', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' },
    error:       { label: 'Error',        cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' },
    timeout:     { label: 'Timeout',      cls: 'text-orange-300 border-orange-400/40 bg-orange-400/10' },
    not_started: { label: 'Not started',  cls: 'text-slate-400 border-slate-600' },
    ongoing:     { label: 'Ongoing',      cls: 'text-amber-200 border-amber-300/40 bg-amber-300/10' },
  }

  const tiles = [
    { label: 'Quests conquered', value: `${conquered} / ${submissions.length}` },
    { label: 'Attempted', value: attempted },
    { label: 'Success rate', value: `${rate}%` },
    { label: 'Quest XP', value: xpEarned },
  ]

  if (submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] px-6 py-14 text-center">
        <span className="mx-auto mb-4 block h-2 w-2 rotate-45 bg-amber-300" aria-hidden="true" />
        <h3 className="font-cinzel text-xl font-bold text-amber-100">No quests yet</h3>
        <p className="mt-2 text-sm text-slate-400">
          There are no quests in {selectedSection?.name} yet. Check the Quest Board later.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(t => (
          <div key={t.label} className="rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{t.label}</p>
            <p className="mt-1 font-cinzel text-2xl font-bold text-amber-300">{t.value}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-3">
        {submissions.map(quest => {
          const st = STATUS[quest.status] || STATUS.ongoing
          const isConquered = quest.status === 'conquered'
          const accent = isConquered ? 'bg-emerald-400' : quest.status === 'not_started' ? 'bg-slate-600' : quest.status === 'wrong' || quest.status === 'error' ? 'bg-rose-400' : 'bg-amber-300'
          return (
            <li key={quest.id} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 pl-5 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pl-6">
              <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="font-cinzel text-base font-bold leading-snug text-amber-50 sm:text-lg">{quest.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {quest.difficulty}
                  {quest.languages?.length ? ` · ${quest.languages.map(l => ({ python: 'Python', java: 'Java', csharp: 'C#' }[l] || l)).join(', ')}` : ''}
                  {quest.attempts > 0 ? ` · ${quest.attempts} attempt${quest.attempts > 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <span className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                <span className={`min-w-[84px] text-right font-cinzel text-lg font-bold ${isConquered ? 'text-amber-300' : 'text-slate-500'}`}>
                  {quest.submission
                    ? (isConquered ? `+${quest.submission.score ?? 0} XP` : `${quest.submission.score ?? 0} / ${quest.xp_reward}`)
                    : `${quest.xp_reward} XP`}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
