import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE, authFetch } from '../../api/client'
import InstructorBackButton from '../../components/InstructorBackButton'
import ModuleIcon from './ModuleIcon'
import './QuestEditor.css'

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
  const submitting = useRef(false)
  const editorRef = useRef(null)
  const [loadError, setLoadError] = useState('')
  const [sectionsError, setSectionsError] = useState('')
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [sectionsVersion, setSectionsVersion] = useState(0)
  const subjectParam = searchParams.get('subject_id')
  const classParam = searchParams.get('class_id')

  // Automatically dismiss the toast after a few seconds
  useEffect(() => {
    if (!toast || toast.type !== 'success') return
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
    language_rule: 'optional',
    auto_grade: true,
    plagiarism_threshold: 0.85,
    starter_code: { python: '', java: '', csharp: '' },
    test_cases: [{ input: '', expected: '' }]
  })

  // Fetch subjects AND sections (and problem data if editing)
  useEffect(() => {
    let current = true
    const fetchData = async () => {
      setSubjectsLoading(true)
      setLoadError('')
      try {
        const token = localStorage.getItem('token')

        if (problemId) {
          setIsEditing(true)
          const problemRes = await authFetch(
            `${API_BASE}/api/instructor/problems/${problemId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          if (!problemRes.ok) throw new Error('Unable to load this quest. Retry before editing.')
          if (!current) return
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
              partial_credit: problemData.partial_credit ?? 100,
              language_rule: problemData.language_rule || 'optional',
              auto_grade: problemData.auto_grade !== undefined ? problemData.auto_grade : true,
              plagiarism_threshold: problemData.plagiarism_threshold || 0.85,
              starter_code: problemData.starter_code || { python: '', java: '', csharp: '' },
              test_cases: problemData.test_cases || [{ input: '', expected: '' }]
            }))

            if (problemData.subject_id) {
              setSelectedSubjectId(problemData.subject_id)
            }
          }
        }

        const subjectsRes = await authFetch(
          `${API_BASE}/api/instructor/assigned-subjects`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        if (!subjectsRes.ok) throw new Error('Unable to load your assigned subjects.')
        const subjects = await subjectsRes.json()
        if (!current) return
        setAssignedSubjects(subjects)

        // when arriving from inside a specific class, the subject is
        // already known — skip making the instructor pick it again
        const preselectedSubjectId = subjectParam
        if (preselectedSubjectId && !problemId) {
          setSelectedSubjectId(Number(preselectedSubjectId))
        }

      } catch (err) {
        if (current) setLoadError(err.message || 'Unable to load the quest editor.')
      } finally {
        if (current) setSubjectsLoading(false)
      }
    }
    fetchData()
    return () => { current = false }
  }, [problemId, subjectParam, loadVersion])

  // fetch SubjectSection objects when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setSectionsBySubject([])
      return
    }
    let current = true
    const fetchSections = async () => {
      setSectionsLoading(true)
      setSectionsError('')
      try {
        const token = localStorage.getItem('token')
        const res = await authFetch(
          `${API_BASE}/api/instructor/sections-by-subject?subject_id=${selectedSubjectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error('Unable to load assigned classes. Retry before publishing.')
        if (res.ok) {
          const data = await res.json()
          if (!current) return
          setSectionsBySubject(data)
          setFormData(prev => {
            // Remove any selected sections that are no longer valid for this subject
            const cleaned = prev.visible_to_sections.filter(sid =>
              data.some(s => s.id === sid)
            )
            // A quest belongs to one specific class code -- when we arrived
            // from inside a class (?class_id=) and nothing is picked yet,
            // default it to that class instead of leaving it empty (empty
            // used to silently mean "every section of this subject", which
            // is exactly how a quest ends up leaking into class codes it
            // was never meant for).
            const classIdParam = classParam
            if (!isEditing && cleaned.length === 0 && classIdParam &&
                data.some(s => s.id === Number(classIdParam))) {
              return { ...prev, visible_to_sections: [Number(classIdParam)] }
            }
            return { ...prev, visible_to_sections: cleaned }
          })
        }
      } catch (err) {
        if (current) setSectionsError(err.message || 'Unable to load assigned classes.')
      } finally {
        if (current) setSectionsLoading(false)
      }
    }
    fetchSections()
    return () => { current = false }
  }, [selectedSubjectId, classParam, isEditing, sectionsVersion])

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
    if (submitting.current || subjectsLoading || loadError || sectionsLoading || sectionsError) return
    if (activeSection !== 7) return

    const maxXP = { Easy: 100, Medium: 250, Hard: 500 }
    if (!Number.isInteger(formData.xp_reward) || formData.xp_reward < 0) {
      showToast('Enter a valid non-negative XP reward.'); setActiveSection(1); return
    }
    if (formData.xp_reward > maxXP[formData.difficulty]) {
      showToast(`XP reward exceeds maximum for ${formData.difficulty} difficulty.\n\nMax: ${maxXP[formData.difficulty]}\nYours: ${formData.xp_reward}`, 'error')
      return
    }
    if (!selectedSubjectId) {
      setActiveSection(1)
      showToast('Please select an assigned subject for this quest.', 'error')
      return
    }
    if (!formData.title.trim() || !formData.description.trim() || formData.test_cases.length === 0) {
      setActiveSection(1)
      showToast('Enter the quest title and instructions, and define at least one test case.', 'error')
      return
    }
    if (formData.languages.length === 0) {
      setActiveSection(2)
      showToast('Please select at least one programming language.', 'error')
      return
    }
    if (formData.visible_to_sections.length === 0) {
      setActiveSection(3)
      showToast('Please select at least one class code this quest should be visible to.', 'error')
      return
    }

    if (!Number.isInteger(formData.partial_credit) || formData.partial_credit < 0 || formData.partial_credit > 100) {
      showToast('Partial credit must be a whole percentage from 0 to 100.'); setActiveSection(3); return
    }
    if (formData.hints.some(h => !h.text.trim() || !Number.isInteger(h.xp_penalty) || h.xp_penalty < 0)) {
      showToast('Complete each hint and enter a non-negative XP penalty, or remove the hint.'); setActiveSection(6); return
    }
    submitting.current = true
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
        ? `${API_BASE}/api/problems/${problemId}`
        : `${API_BASE}/api/problems`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await authFetch(url, {
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
        const error = await res.json().catch(() => ({}))
        const message = error.error || error.msg || error.message || `Server returned HTTP ${res.status}.`
        showToast(`Failed to save quest: ${message}`, 'error')
        submitting.current = false
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('Failed to save problem:', err)
      showToast('Unable to confirm saving. Your entries are still here. Check the class quest list before trying again.', 'error')
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const steps = [
    ['Quest details', 'Title, instructions and reward'],
    ['Type & languages', 'How students answer'],
    ['Classes & settings', 'Who can access this quest'],
    ['Starter code', 'A starting point for each language'],
    ['Test cases', 'Inputs and expected output'],
    ['Hints', 'Optional guidance and XP cost'],
    ['Review & publish', 'Check everything before saving'],
  ]
  const languageNames = { python: 'Python', java: 'Java', csharp: 'C#' }
  const subject = assignedSubjects.find(s => s.id === selectedSubjectId)
  const visibleCount = formData.test_cases.filter(tc => tc.visible !== false).length
  const number = value => value === '' ? '' : Number(value)
  const changeStep = id => {
    setActiveSection(id)
    setToast(null)
    editorRef.current?.scrollIntoView({ block: 'start' })
  }
  const field = (label, control, help) => <label className="qe-field"><span>{label}</span>{control}{help && <small>{help}</small>}</label>
  const input = (key, props = {}) => <input value={formData[key]} onChange={e => handleInputChange(key, e.target.type === 'number' ? number(e.target.value) : e.target.value)} {...props} />
  const busy = isSubmitting || subjectsLoading || !!loadError

  return (
    <div className="qe-editor" ref={editorRef}>
      <header className="qe-header">
        <InstructorBackButton onClick={() => { if (!isSubmitting) navigate(resolveBackTarget()) }} />
        <div><h1>{isEditing ? 'Edit quest' : 'Create a quest'}</h1><p>Shape the challenge. Define the tests. Help your students grow.</p></div>
      </header>
      {toast && <div role={toast.type === 'error' ? 'alert' : 'status'} className={`qe-message qe-${toast.type}`}><span>{toast.message}</span><button type="button" aria-label="Dismiss message" onClick={() => setToast(null)}>×</button></div>}
      {loadError && <div className="qe-message qe-error" role="alert">{loadError}<button type="button" onClick={() => setLoadVersion(v => v + 1)}>Retry loading</button></div>}
      {subjectsLoading && <p className="qe-notice" role="status">Loading your assigned subjects and quest details…</p>}
      <div className="qe-layout" aria-busy={subjectsLoading}>
        <aside className="qe-rail">
          <nav aria-label="Quest creation steps">
            {steps.map(([title, detail], i) => <button type="button" key={title} disabled={busy} aria-current={activeSection === i + 1 ? 'step' : undefined} onClick={() => changeStep(i + 1)}><span className="qe-step-number">{i + 1}</span><span><strong>{title}</strong><small>{detail}</small></span></button>)}
          </nav>
          <p className="qe-rail-note"><ModuleIcon name="lock" size={16} />Nothing is published until you confirm on the final step.</p>
        </aside>
        <form className="qe-form" onSubmit={handleSubmit} noValidate>
          <fieldset disabled={busy}>
            <section className="qe-panel" aria-label={steps[activeSection - 1][0]}>
              <div className="qe-panel-heading"><div><p>Step {activeSection} of {steps.length}</p><h2>{steps[activeSection - 1][0]}</h2></div><ModuleIcon name={['file', 'edit', 'users', 'file', 'chart', 'book', 'eye'][activeSection - 1]} size={26} /></div>
              {activeSection === 1 && <div className="qe-fields">
                {field('Subject', (subjectParam || isEditing) ? <div className="qe-context">{subject?.name || 'No assigned subject found'}</div> : <select value={selectedSubjectId || ''} onChange={e => setSelectedSubjectId(Number(e.target.value) || null)}><option value="">Select an assigned subject</option>{assignedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>, !subjectsLoading && !assignedSubjects.length ? 'No assigned subjects. Contact your administrator.' : 'The quest will belong to this subject.')}
                {field('Quest title *', input('title', { placeholder: 'e.g. Sum of Two Numbers', required: true }))}
                <div className="qe-columns">
                  {field('Difficulty', <select value={formData.difficulty} onChange={e => handleInputChange('difficulty', e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select>)}
                  {field('XP reward *', input('xp_reward', { type: 'number', min: 0, max: {Easy:100,Medium:250,Hard:500}[formData.difficulty], step: 1 }), `Maximum for ${formData.difficulty}: ${{Easy:100,Medium:250,Hard:500}[formData.difficulty]} XP`)}
                </div>
                {field('Quest instructions *', <textarea rows={9} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Describe the task, input and output format, constraints, and examples." />, 'These instructions are shown to students. Keep hidden test data out of this description.')}
              </div>}
              {activeSection === 2 && <div className="qe-fields">
                <fieldset className="qe-choice-group"><legend>Quest type</legend><div className="qe-columns">{[['coding', 'Coding', 'Students write a complete solution.'], ['debugging', 'Debugging', 'Students find and fix bugs in starter code.']].map(([value,title,description]) => <label key={value} className="qe-choice"><input type="radio" name="quest-type" checked={formData.problem_type === value} onChange={() => handleInputChange('problem_type', value)} /><span><strong>{title}</strong><small>{description}</small></span></label>)}</div></fieldset>
                <fieldset className="qe-choice-group"><legend>Supported languages *</legend><div className="qe-languages">{Object.entries(languageNames).map(([value,title]) => <label key={value} className="qe-choice"><input type="checkbox" checked={formData.languages.includes(value)} onChange={() => handleLanguageToggle(value)} /><strong>{title}</strong></label>)}</div></fieldset>
                {formData.languages.length > 1 && <fieldset className="qe-choice-group"><legend>Language rule</legend>{[['required', 'All selected languages required', 'Quest XP is shared evenly between the selected languages.'], ['optional', 'Student choice + bonus XP', 'Students choose a language. Each extra language adds 25% of the quest XP (100% / 125% / 150%).']].map(([value,title,text]) => <label className="qe-choice" key={value}><input type="radio" name="language-rule" checked={formData.language_rule === value} onChange={() => handleInputChange('language_rule', value)} /><span><strong>{title}</strong><small>{text}</small></span></label>)}<p className="qe-help">Each language is graded once and locks independently.</p></fieldset>}
              </div>}
              {activeSection === 3 && <div className="qe-fields">
                <fieldset className="qe-choice-group"><legend>Visible to class codes *</legend><p className="qe-help">Only the selected classes can access this quest.</p>
                  {sectionsLoading ? <p role="status">Loading assigned classes…</p> : sectionsError ? <div role="alert" className="qe-message qe-error">{sectionsError}<button type="button" onClick={() => setSectionsVersion(v => v + 1)}>Retry</button></div> : !sectionsBySubject.length ? <p className="qe-notice">{selectedSubjectId ? 'No assigned classes found for this subject.' : 'Select a subject in Quest details first.'}</p> : sectionsBySubject.map(sec => <label className="qe-choice" key={sec.id}><input type="checkbox" checked={formData.visible_to_sections.includes(sec.id)} onChange={e => handleInputChange('visible_to_sections', e.target.checked ? [...formData.visible_to_sections, sec.id] : formData.visible_to_sections.filter(id => id !== sec.id))} /><span><strong>Class {sec.section_no}</strong><small>{[sec.semester,sec.schedule].filter(Boolean).join(' · ') || 'Assigned class'}</small></span></label>)}
                </fieldset>
                <label className="qe-choice"><input type="checkbox" checked={formData.is_event_quest} onChange={e => handleInputChange('is_event_quest', e.target.checked)} /><span><strong>Event quest</strong><small>Show this quest with the existing event badge.</small></span></label>
                <div className="qe-columns">{field('Estimated time', <select value={formData.estimated_time} onChange={e => handleInputChange('estimated_time', e.target.value)}>{[['5min','5 minutes'],['10min','10 minutes'],['15min','15 minutes'],['30min','30 minutes'],['1hr','1 hour'],['1hr+','1 hour+']].map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select>)}{field('Partial credit (%)', input('partial_credit', {type:'number',min:0,max:100,step:1}))}</div>
              </div>}
              {activeSection === 4 && <div className="qe-fields"><p className="qe-help">Optional starting code shown in the student editor. For debugging quests, include the code students should repair.</p>{!formData.languages.length && <p className="qe-notice">Select a language in Type & languages first.</p>}{formData.languages.map(lang => field(`${languageNames[lang]} starter code`, <textarea key={lang} className="qe-code" spellCheck={false} rows={12} value={formData.starter_code[lang] || ''} onChange={e => handleInputChange('starter_code', {...formData.starter_code, [lang]:e.target.value})} aria-label={`${languageNames[lang]} starter code`} />, undefined)).map((element,i) => <div key={formData.languages[i]}>{element}</div>)}</div>}
              {activeSection === 5 && <div className="qe-fields"><div className="qe-section-intro"><p className="qe-help">Use exact input and expected output. Line breaks are preserved; leave a field empty only when empty input or output is intended.</p><button type="button" className="qe-secondary" onClick={handleTestCaseAdd}><ModuleIcon name="plus" size={16} />Add test case</button></div>
                {formData.test_cases.map((tc,i) => <fieldset className="qe-test" key={i}><legend>Test {i + 1}</legend><div className="qe-test-toolbar"><label><input type="checkbox" checked={tc.visible === false} onChange={e => handleTestCaseUpdate(i, 'visible', !e.target.checked)} />Hidden from students</label>{formData.test_cases.length > 1 && <button className="qe-remove" type="button" aria-label={`Remove test ${i+1}`} onClick={() => handleTestCaseRemove(i)}><ModuleIcon name="trash" size={16} />Remove</button>}</div><div className="qe-columns">{field('Input', <textarea aria-label={`Test ${i+1} input`} className="qe-code" spellCheck={false} rows={4} value={tc.input} onChange={e => handleTestCaseUpdate(i,'input',e.target.value)} />)}{field('Expected output', <textarea aria-label={`Test ${i+1} expected output`} className="qe-code" spellCheck={false} rows={4} value={tc.expected} onChange={e => handleTestCaseUpdate(i,'expected',e.target.value)} />)}</div><p className="qe-help">{tc.visible === false ? 'Used for grading. Test details stay hidden from students.' : 'Visible test: students may see its input and expected output.'}</p></fieldset>)}
              </div>}
              {activeSection === 6 && <div className="qe-fields"><div className="qe-section-intro"><p className="qe-help">Give useful guidance without revealing the solution.</p><button type="button" className="qe-secondary" onClick={handleHintAdd}><ModuleIcon name="plus" size={16} />Add hint</button></div>{!formData.hints.length && <div className="qe-empty"><ModuleIcon name="book" size={32} /><h3>No hints added</h3><p>Hints are optional. Add one above, or continue to review.</p></div>}{formData.hints.map((hint,i) => <fieldset key={i} className="qe-test"><legend>Hint {i+1}</legend><div className="qe-test-toolbar"><span>Guidance for students</span><button type="button" className="qe-remove" onClick={() => handleHintRemove(i)} aria-label={`Remove hint ${i+1}`}><ModuleIcon name="trash" size={16} />Remove</button></div>{field('Hint text',<textarea rows={3} value={hint.text} onChange={e => handleHintUpdate(i,'text',e.target.value)} />)}{field('XP penalty',<input type="number" min={0} step={1} value={hint.xp_penalty} onChange={e => handleHintUpdate(i,'xp_penalty',number(e.target.value))} />, 'Deducted when the student reveals this hint.')}</fieldset>)}</div>}
              {activeSection === 7 && <div className="qe-fields"><p className="qe-help">Review the quest before publishing it to your selected classes.</p><dl className="qe-review">{[
                ['Title', formData.title || 'Not set',1], ['Subject', subject?.name || 'Not selected',1], ['Difficulty & reward', `${formData.difficulty} · ${formData.xp_reward} XP`,1], ['Quest type',formData.problem_type === 'debugging' ? 'Debugging' : 'Coding',2], ['Languages',formData.languages.map(l => languageNames[l]).join(' · ') || 'None selected',2], ['Language rule',formData.languages.length > 1 ? (formData.language_rule === 'required' ? 'All selected languages required' : 'Student choice + bonus XP') : 'Single language',2], ['Visible to', sectionsBySubject.filter(s => formData.visible_to_sections.includes(s.id)).map(s => `Class ${s.section_no}`).join(', ') || 'No classes selected',3], ['Test cases',`${visibleCount} visible · ${formData.test_cases.length - visibleCount} hidden`,5], ['Hints',`${formData.hints.length} optional ${formData.hints.length === 1 ? 'hint' : 'hints'}`,6],
              ].map(([label,value,step]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><button type="button" onClick={() => changeStep(step)} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button></div>)}</dl><div className="qe-publish-note"><ModuleIcon name="eye" size={20} /><p>{isEditing ? 'Saving updates publishes this quest to the selected classes.' : 'Publishing makes this quest available to the selected classes.'} Nothing on this page runs student code.</p></div></div>}
            </section>
          </fieldset>
          <footer className="qe-actions"><button className="qe-secondary" type="button" disabled={busy || activeSection === 1} onClick={() => changeStep(activeSection - 1)}>← Previous</button><span>Step {activeSection} / {steps.length}</span>{activeSection < 7 ? <button className="qe-primary" disabled={busy} type="button" onClick={() => changeStep(activeSection + 1)}>Continue <span aria-hidden="true">→</span></button> : <button className="qe-primary" type="submit" disabled={busy || sectionsLoading || !!sectionsError}>{isSubmitting ? 'Saving…' : isEditing ? 'Save & publish' : 'Publish quest'}<ModuleIcon name="announcement" size={17} /></button>}</footer>
        </form>
        <aside className="qe-summary"><h2>Quest overview</h2><h3>{formData.title || 'Your next quest'}</h3><p>{subject?.name || 'Choose an assigned subject'}</p><dl><div><dt>Reward</dt><dd className="qe-gold">{formData.xp_reward || 0} XP</dd></div><div><dt>Difficulty</dt><dd>{formData.difficulty}</dd></div><div><dt>Languages</dt><dd>{formData.languages.map(l => languageNames[l]).join(', ') || 'Not selected'}</dd></div><div><dt>Classes</dt><dd>{formData.visible_to_sections.length} selected</dd></div><div><dt>Test cases</dt><dd>{formData.test_cases.length}</dd></div></dl><p className="qe-summary-note">Your entries stay on this page as you move between steps. Leaving the editor does not save them.</p></aside>
      </div>
    </div>
  )
}
