import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function CreateProblem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const problemId = searchParams.get('edit')
  const [isEditing, setIsEditing] = useState(!!problemId)
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [sectionsBySubject, setSectionsBySubject] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [activeSection, setActiveSection] = useState(1)
  const [toast, setToast] = useState(null) // { message, type: 'success' | 'error' }
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Automatically dismiss the toast after a few seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const showToast = (message, type = 'error') => setToast({ message, type })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    xp_reward: 100,
    category: 'General',
    problem_type: 'coding',
    languages: ['python'],
    is_event_quest: false,
    // visible_to_sections stores SubjectSection IDs, not subject IDs
    visible_to_sections: [],
    hints: [],
    tags: [],
    prerequisites: [],
    estimated_time: '15min',
    partial_credit: 100,
    auto_grade: true,
    plagiarism_threshold: 0.85,
    starter_code: { python: '', java: '', csharp: '' },
    test_cases: [{ input: '', expected: '' }]
  })

  // Fetch subjects AND sections (and problem data if editing)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')

        if (problemId) {
          setIsEditing(true)
          const problemRes = await fetch(
            `http://localhost:5000/api/instructor/problems/${problemId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          if (problemRes.ok) {
            const problemData = await problemRes.json()
            setFormData(prev => ({
              ...prev,
              title: problemData.title,
              description: problemData.description,
              difficulty: problemData.difficulty,
              xp_reward: problemData.xp_reward,
              category: problemData.category || 'General',
              problem_type: problemData.problem_type || 'coding',
              languages: problemData.languages || ['python'],
              is_event_quest: problemData.is_event_quest || false,
              visible_to_sections: problemData.visible_to_sections || [],
              hints: problemData.hints || [],
              tags: problemData.tags || [],
              prerequisites: problemData.prerequisites || [],
              estimated_time: problemData.estimated_time || '15min',
              partial_credit: problemData.partial_credit || 100,
              auto_grade: problemData.auto_grade !== undefined ? problemData.auto_grade : true,
              plagiarism_threshold: problemData.plagiarism_threshold || 0.85,
              starter_code: problemData.starter_code || { python: '', java: '', csharp: '' },
              test_cases: problemData.test_cases || [{ input: '', expected: '' }]
            }))

            if (problemData.subject_id) {
              setTimeout(() => setSelectedSubjectId(problemData.subject_id), 100)
            }
          }
        }

        const subjectsRes = await fetch(
          'http://localhost:5000/api/instructor/assigned-subjects',
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        if (subjectsRes.ok) setAssignedSubjects(await subjectsRes.json())

        // when arriving from inside a specific class, the subject is
        // already known — skip making the instructor pick it again
        const preselectedSubjectId = searchParams.get('subject_id')
        if (preselectedSubjectId && !problemId) {
          setSelectedSubjectId(Number(preselectedSubjectId))
        }

      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchData()
  }, [problemId])

  // fetch SubjectSection objects when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setSectionsBySubject([])
      return
    }
    const fetchSections = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `http://localhost:5000/api/instructor/sections-by-subject?subject_id=${selectedSubjectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          setSectionsBySubject(data)
          // Remove any selected sections that are no longer valid for this subject
          setFormData(prev => ({
            ...prev,
            visible_to_sections: prev.visible_to_sections.filter(sid =>
              data.some(s => s.id === sid)
            )
          }))
        }
      } catch (err) {
        console.error('Failed to fetch sections for subject:', err)
      }
    }
    fetchSections()
  }, [selectedSubjectId])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // where Back / after-submit should go, this is for making sure it lands on the right class instead of just going back blind
  const resolveBackTarget = () => {
    const from = searchParams.get('from')
    if (from) return from
    if (formData.visible_to_sections.length > 0) {
      return `/instructor/class/${formData.visible_to_sections[0]}`
    }
    if (sectionsBySubject.length > 0) {
      return `/instructor/class/${sectionsBySubject[0].id}`
    }
    return '/instructor/problems'
  }

  // Toggle a programming language on or off in the allowed list
  const handleLanguageToggle = (language) => {
    setFormData(prev => {
      const languages = prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  // Add, edit, and remove hints for this problem
  const handleHintAdd = () => {
    setFormData(prev => ({ ...prev, hints: [...prev.hints, { text: '', xp_penalty: 10 }] }))
  }
  const handleHintUpdate = (index, field, value) => {
    const newHints = [...formData.hints]
    newHints[index][field] = value
    setFormData(prev => ({ ...prev, hints: newHints }))
  }
  const handleHintRemove = (index) => {
    setFormData(prev => ({ ...prev, hints: prev.hints.filter((_, i) => i !== index) }))
  }

  // Add, edit, and remove test cases for this problem
  const handleTestCaseAdd = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', expected: '' }]
    }))
  }
  const handleTestCaseUpdate = (index, field, value) => {
    const newTestCases = [...formData.test_cases]
    newTestCases[index][field] = value
    setFormData(prev => ({ ...prev, test_cases: newTestCases }))
  }
  const handleTestCaseRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }))
  }

  // Validate the quest form, then create or update it on the server
  const handleSubmit = async (e) => {
    e.preventDefault()
    // guards against a double-click (or an impatient re-click during the
    // 1.2s success-toast delay below) firing this twice and creating two
    // identical quests, since the backend has no dedup protection either
    if (isSubmitting) return

    const maxXP = { Easy: 100, Medium: 250, Hard: 500 }
    if (formData.xp_reward > maxXP[formData.difficulty]) {
      showToast(`XP reward exceeds maximum for ${formData.difficulty} difficulty.\n\nMax: ${maxXP[formData.difficulty]}\nYours: ${formData.xp_reward}`, 'error')
      return
    }
    if (!selectedSubjectId) {
      showToast('Please select a course subject for this problem.', 'error')
      return
    }
    if (!formData.title || !formData.description || formData.test_cases.length === 0) {
      showToast('Please fill in all required fields and add at least one test case.', 'error')
      return
    }
    if (formData.languages.length === 0) {
      showToast('Please select at least one programming language.', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        ...formData,
        subject_id: selectedSubjectId,
        // visible_to_sections holds SubjectSection IDs here too
        is_published: true
      }

      const url = isEditing
        ? `http://localhost:5000/api/problems/${problemId}`
        : 'http://localhost:5000/api/problems'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast(isEditing ? 'Quest updated successfully!' : 'Quest created successfully!', 'success')
        // gives the toast a moment on screen before leaving the page —
        // alert() used to force this pause automatically since it blocks
        // until dismissed; a toast doesn't block, so this does it manually
        setTimeout(() => navigate(resolveBackTarget()), 1200)
      } else {
        const error = await res.json()
        showToast(`Failed to save quest: ${error.error}`, 'error')
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Failed to save problem:', err)
      showToast('Failed to save problem. Check console for details.', 'error')
      setIsSubmitting(false)
    }
  }

  const sections_nav = [
    { id: 1, title: 'Basic Information',        icon: '📜' },
    { id: 2, title: 'Problem Type & Languages',  icon: '💻' },
    { id: 3, title: 'Visibility & Settings',     icon: '🔧' },
    { id: 4, title: 'Starter Code',              icon: '📝' },
    { id: 5, title: 'Test Cases',                icon: '🧪' },
    { id: 6, title: 'Hints',                     icon: '💡' },
    { id: 7, title: 'Review',                    icon: '🏆' },
  ]

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] max-w-sm rounded-xl border p-4 shadow-2xl ${
          toast.type === 'success'
            ? 'bg-green-900/90 border-green-500/50 shadow-green-900/30'
            : 'bg-red-900/90 border-red-500/50 shadow-red-900/30'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{toast.type === 'success' ? '✅' : '❌'}</span>
            <p className="text-white text-sm whitespace-pre-line leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(resolveBackTarget())} className="text-slate-400 hover:text-white transition">
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isEditing ? '✏️ Edit Quest' : '⚔️ Create New Quest'}
          </h1>
          <p className="text-slate-400">Design a coding quest for your students</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          {sections_nav.map((sec, idx) => (
            <div key={sec.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeSection === sec.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/40 scale-105'
                    : activeSection > sec.id
                    ? 'text-green-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className={`text-xl transition-transform duration-300 ${activeSection === sec.id ? 'scale-125' : ''}`}>{sec.icon}</span>
                <span className="hidden lg:inline font-medium text-sm">{sec.title}</span>
              </button>
              {idx < sections_nav.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 transition-colors duration-500 ${activeSection > sec.id ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-500"
            style={{ width: `${(activeSection / sections_nav.length) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Basic Information ── */}
        {activeSection === 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Course Subject *</label>
              {searchParams.get('subject_id') ? (
                <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white flex items-center justify-between">
                  <span>{assignedSubjects.find(s => s.id === selectedSubjectId)?.name || 'Loading...'}</span>
                  <span className="text-xs text-slate-500">🔒 Set by this class</span>
                </div>
              ) : (
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => setSelectedSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                  required
                >
                  <option value="">Select a subject you teach</option>
                  {assignedSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              )}
              {!subjectsLoading && assignedSubjects.length === 0 && (
                <p className="text-amber-400 text-xs mt-1">⚠️ No subjects assigned. Contact admin.</p>
              )}
              {/* Confirmation once a subject is picked here — echoes the tone of
                  the locked "🔒 Set by this class" state above, so choosing from
                  this dropdown feels just as deliberate/confirmed as arriving
                  with the subject already set. */}
              {!searchParams.get('subject_id') && selectedSubjectId && (
                <p className="text-xs text-purple-300 mt-2 flex items-center gap-1.5">
                  📚 Creating this quest for
                  <span className="font-semibold text-purple-200">
                    {assignedSubjects.find(s => s.id === selectedSubjectId)?.name}
                  </span>
                  {sectionsBySubject.length === 1 && (
                    <span className="text-slate-500">— Section {sectionsBySubject[0].section_no}</span>
                  )}
                </p>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📋</span> Quest Details
            </h2>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Problem Title *</label>
              <input
                type="text" value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Sum of Two Numbers"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Difficulty *</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">XP Reward *</label>
                <input
                  type="number" value={formData.xp_reward}
                  onChange={(e) => handleInputChange('xp_reward', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the quest details here..."
                rows="6"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* ── Section 2: Problem Type & Languages ── */}
        {activeSection === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>💻</span> Problem Type & Languages
            </h2>

            <div>
              <label className="block text-slate-400 text-sm mb-3">Problem Type *</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'coding',    icon: '📝', label: 'Coding',    desc: 'Student writes complete solution' },
                  { value: 'debugging', icon: '🐛', label: 'Debugging', desc: 'Student fixes bugs in code' },
                ].map(t => (
                  <button
                    key={t.value} type="button"
                    onClick={() => handleInputChange('problem_type', t.value)}
                    className={`p-4 rounded-xl border-2 transition ${
                      formData.problem_type === t.value
                        ? 'border-purple-600 bg-purple-600/10 text-purple-400'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{t.icon}</div>
                    <div className="font-bold">{t.label}</div>
                    <div className="text-xs mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-3">Programming Languages *</label>
              <div className="space-y-3">
                {[
                  { lang: 'python', icon: '🐍' },
                  { lang: 'java',   icon: '☕' },
                  { lang: 'csharp', icon: '🔷' },
                ].map(({ lang, icon }) => (
                  <label key={lang} className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang)}
                      onChange={() => handleLanguageToggle(lang)}
                      className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-lg">{icon}</span>
                    <span className="text-white font-medium capitalize">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Section 3: Visibility & Settings ── */}
        {activeSection === 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🔧</span> Visibility & Settings
            </h2>

            {/* Event Quest toggle */}
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎉</span>
                    <span className="text-white font-bold text-lg">Event Quest</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    Extra credit problem for at-risk students. Displays with special badge.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_event_quest}
                  onChange={(e) => handleInputChange('is_event_quest', e.target.checked)}
                  className="w-6 h-6 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>

            {/* section visibility, lists SubjectSection objects, IDs sent match what the backend expects */}
            <div>
              <label className="block text-slate-400 text-sm mb-3">
                Visible To Sections
                <span className="ml-2 text-slate-500 font-normal text-xs">
                  (leave empty = all your sections for this subject)
                </span>
              </label>
              <div className="bg-slate-800 rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto border border-slate-700">
                {sectionsBySubject.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">
                    {selectedSubjectId
                      ? 'No sections found for this subject'
                      : 'Select a subject first to see available sections'}
                  </p>
                ) : (
                  sectionsBySubject.map(sec => (
                    <label key={sec.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition cursor-pointer">
                      <input
                        type="checkbox"
                        // stores SubjectSection.id here
                        checked={formData.visible_to_sections.includes(sec.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleInputChange('visible_to_sections', [...formData.visible_to_sections, sec.id])
                          } else {
                            handleInputChange('visible_to_sections', formData.visible_to_sections.filter(id => id !== sec.id))
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          Section {sec.section_no}
                          {sec.semester ? <span className="text-slate-400 text-sm ml-2">— {sec.semester}</span> : ''}
                          {sec.schedule ? <span className="text-slate-500 text-xs ml-2">{sec.schedule}</span> : ''}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Select which sections can see this problem. Leave empty to share with all your sections.
              </p>
            </div>

            {/* Advanced settings */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Estimated Time</label>
                <select
                  value={formData.estimated_time}
                  onChange={(e) => handleInputChange('estimated_time', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                >
                  <option value="5min">5 minutes</option>
                  <option value="10min">10 minutes</option>
                  <option value="15min">15 minutes</option>
                  <option value="30min">30 minutes</option>
                  <option value="1hr">1 hour</option>
                  <option value="1hr+">1 hour+</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Partial Credit (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={formData.partial_credit}
                  onChange={(e) => handleInputChange('partial_credit', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Section 4: Starter Code ── */}
        {activeSection === 4 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📝</span> Starter Code
            </h2>
            {formData.languages.map(lang => (
              <div key={lang}>
                <label className="block text-slate-400 text-sm mb-2 capitalize flex items-center gap-2">
                  <span>{lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}</span>
                  {lang} Starter Code
                </label>
                <textarea
                  value={formData.starter_code[lang] || ''}
                  onChange={(e) => {
                    handleInputChange('starter_code', { ...formData.starter_code, [lang]: e.target.value })
                  }}
                  placeholder={
                    lang === 'python' ? 'def solve():\n    # Your code here\n    pass'
                    : lang === 'java' ? 'public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}'
                    : 'using System;\n\nclass Solution {\n    static void Main() {\n        // Your code here\n    }\n}'
                  }
                  rows="8"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-green-400 font-mono text-sm focus:border-purple-500 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Section 5: Test Cases ── */}
        {activeSection === 5 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🧪</span> Test Cases
              </h2>
              <button
                type="button" onClick={handleTestCaseAdd}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition"
              >
                + Add Test Case
              </button>
            </div>
            <div className="space-y-4">
              {formData.test_cases.map((tc, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Test Case {idx + 1}</span>
                    {formData.test_cases.length > 1 && (
                      <button type="button" onClick={() => handleTestCaseRemove(idx)} className="text-red-400 hover:text-red-300 text-sm">
                        Remove
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={tc.visible === false}
                      onChange={(e) => handleTestCaseUpdate(idx, 'visible', !e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    🔒 Hide from students (used for grading only)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      {/* was a single-line <input>, so there was no way to press
                          Enter for a real 2nd line of input (needed when a quest
                          calls input() more than once). textarea = press Enter,
                          get an actual line break, no hidden tricks needed. */}
                      <label className="block text-slate-500 text-xs mb-1">Input (press Enter for a new line)</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => handleTestCaseUpdate(idx, 'input', e.target.value)}
                        placeholder={"e.g.\n3\n5"}
                        rows="3"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono resize-y"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-xs mb-1">Expected Output</label>
                      <textarea
                        value={tc.expected}
                        onChange={(e) => handleTestCaseUpdate(idx, 'expected', e.target.value)}
                        placeholder="Output..."
                        rows="3"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono resize-y"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 6: Hints ── */}
        {activeSection === 6 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>💡</span> Hints (Optional)
              </h2>
              <button
                type="button" onClick={handleHintAdd}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition"
              >
                + Add Hint
              </button>
            </div>
            <div className="space-y-4">
              {formData.hints.map((hint, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Hint {idx + 1}</span>
                    <button type="button" onClick={() => handleHintRemove(idx)} className="text-red-400 hover:text-red-300 text-sm">
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs mb-1">Hint Text</label>
                    <textarea
                      value={hint.text}
                      onChange={(e) => handleHintUpdate(idx, 'text', e.target.value)}
                      placeholder="Provide a helpful hint..."
                      rows="2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs mb-1">XP Penalty</label>
                    <input
                      type="number" value={hint.xp_penalty}
                      onChange={(e) => handleHintUpdate(idx, 'xp_penalty', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Students lose this much XP if they view the hint</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 7: Review ── */}
        {activeSection === 7 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📋</span> Review Quest
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Title',              value: formData.title || <span className="text-slate-500 italic">Not set</span> },
                { label: 'Difficulty / XP',    value: `${formData.difficulty} — ${formData.xp_reward} XP` },
                { label: 'Type / Languages',   value: `${formData.problem_type} · ${formData.languages.join(', ')}` },
                { label: 'Test Cases',         value: `${formData.test_cases.length} test case(s) defined` },
                { label: 'Hints',              value: `${formData.hints.length} hint(s) added` },
                {
                  label: 'Visible To Sections',
                  value: formData.visible_to_sections.length === 0
                    ? 'All my sections'
                    : `${formData.visible_to_sections.length} section(s) selected`
                },
              ].map(row => (
                <div key={row.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{row.label}</p>
                  <p className="text-white font-semibold">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection(Math.max(1, activeSection - 1))}
            disabled={activeSection === 1}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-slate-300 font-bold transition"
          >
            ← Previous
          </button>

          {activeSection < sections_nav.length ? (
            <button
              type="button"
              onClick={() => setActiveSection(Math.min(sections_nav.length, activeSection + 1))}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/20"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/20"
            >
              {isSubmitting ? '⏳ Saving...' : (isEditing ? '✨ Update Quest' : '✨ Create Quest')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
