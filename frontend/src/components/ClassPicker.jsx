import { useState, useEffect, useMemo, useRef } from 'react'
import { API_BASE, authFetch } from '../api/client'
import InstructorBackButton from './InstructorBackButton'
import QuestButton from '../pages/Student/components/QuestButton'
import bookIcon from '../assets/instructor/nav-book.svg'
import searchIcon from '../assets/instructor/search.svg'
import { normalizeAssignedClasses, groupAssignedClasses, enrollmentTotal } from './classPickerData'
import './ClassPicker.css'

const number = value => Number.isFinite(value) ? value.toLocaleString() : '—'

// Shared by the two dashboard quick actions. Selection never creates content.
export default function ClassPicker({ onSelect, onCancel, actionLabel = 'Continue', prompt = 'Choose the class this is for.' }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [selectedKey, setSelectedKey] = useState(null)
  const [search, setSearch] = useState('')
  const selectionMade = useRef(false)
  const onSelectRef = useRef(onSelect)
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await authFetch(`${API_BASE}/api/instructor/classes`, { signal: controller.signal })
        if (!res.ok) throw new Error('Classes unavailable')
        const next = normalizeAssignedClasses(await res.json())
        if (current) setClasses(next)
      } catch {
        if (current) setError(true)
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => { current = false; controller.abort() }
  }, [reload])

  const groups = useMemo(() => groupAssignedClasses(classes), [classes])
  const oneCourse = groups.length === 1
  const activeGroup = groups.find(g => g.key === selectedKey) || (oneCourse ? groups[0] : null)
  const showingClasses = Boolean(activeGroup)
  useEffect(() => {
    if (!loading && !error && classes.length === 1 && !selectionMade.current) {
      selectionMade.current = true
      onSelectRef.current(classes[0], { auto: true })
    }
  }, [loading, error, classes])

  const chooseClass = cls => {
    if (selectionMade.current) return
    selectionMade.current = true
    onSelect(cls)
  }
  const chooseCourse = group => {
    setSearch('')
    // Once a course is explicitly chosen, skip a redundant one-class choice.
    if (group.classes.length === 1) chooseClass(group.classes[0])
    else setSelectedKey(group.key)
  }
  const term = search.trim().toLowerCase()
  const visibleGroups = groups.filter(g => g.name.toLowerCase().includes(term))
  const visibleClasses = (activeGroup?.classes || []).filter(c => [c.name, c.title, c.semester].some(v => v.toLowerCase().includes(term)))
  const back = () => {
    if (showingClasses && !oneCourse) { setSelectedKey(null); setSearch('') }
    else onCancel?.()
  }

  return <section className="icp" aria-label={`${actionLabel} class selection`}>
    <div className="icp-back">{(onCancel || (showingClasses && !oneCourse)) && <InstructorBackButton onClick={back}>{showingClasses && !oneCourse ? 'All courses' : 'Back'}</InstructorBackButton>}<span>{actionLabel}</span></div>
    <header className="icp-heading"><div><h1>{showingClasses ? 'Choose a class' : 'Choose a course'}</h1><p>{showingClasses ? prompt : 'Choose an assigned course, then the class you want to work with.'}</p></div>
      {!loading && !error && groups.length > 0 && <span className="icp-count">{showingClasses ? `${activeGroup.classes.length} class codes` : `${groups.length} assigned courses`}</span>}
    </header>
    {showingClasses && <div className="icp-context"><img src={bookIcon} alt="" width="26" height="26" /><strong>{activeGroup.name}</strong><span>{actionLabel} for one assigned class</span></div>}
    {!loading && !error && classes.length > 0 && <label className="icp-search"><img src={searchIcon} alt="" width="22" height="22" /><span className="sr-only">{showingClasses ? 'Search class codes' : 'Search courses'}</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={showingClasses ? 'Search by class code or semester…' : 'Search assigned courses…'} /></label>}
    {loading ? <div className="icp-state" role="status"><h2>Loading your assigned classes…</h2></div>
      : error ? <div className="icp-state" role="alert"><h2>Unable to load your classes</h2><p>We could not confirm your assignments. Check your connection and try again.</p><button className="ir-secondary" onClick={() => setReload(n => n + 1)}>Try again</button></div>
      : groups.length === 0 ? <div className="icp-state"><img src={bookIcon} alt="" width="48" height="48" /><h2>No assigned classes yet</h2><p>Contact your administrator to get assigned to a class before continuing.</p></div>
      : <>
        <div className="icp-grid">{showingClasses ? visibleClasses.map(cls => <article className="icp-card" key={cls.id}>
          <div className="icp-card-heading"><span className="icp-emblem"><img src={bookIcon} alt="" width="32" height="32" /></span><div><h2>Class {cls.name}</h2><p>{cls.semester}</p></div></div>
          <dl className="icp-class-stats"><div><dt>Students</dt><dd>{number(cls.students)}</dd></div><div><dt>Quests</dt><dd>{number(cls.problems)}</dd></div></dl>
          <QuestButton className="icp-action" ariaLabel={`${actionLabel} for class ${cls.name}`} onClick={() => chooseClass(cls)}>{actionLabel}</QuestButton>
        </article>) : visibleGroups.map(group => <article className="icp-card" key={group.key}>
          <div className="icp-card-heading"><span className="icp-emblem"><img src={bookIcon} alt="" width="32" height="32" /></span><h2>{group.name}</h2></div>
          <div className="icp-course-stats"><span>{group.classes.length} class {group.classes.length === 1 ? 'code' : 'codes'}</span><span title="Student enrollments across the assigned class codes"><strong>{number(enrollmentTotal(group.classes))}</strong> student enrollments</span></div>
          <QuestButton className="icp-action" ariaLabel={`Choose course ${group.name}`} onClick={() => chooseCourse(group)}>Choose course</QuestButton>
        </article>)}</div>
        {(showingClasses ? visibleClasses : visibleGroups).length === 0 && <div className="icp-state"><h2>No matching {showingClasses ? 'class codes' : 'courses'}</h2><p>Try another search.</p><button className="ir-secondary" onClick={() => setSearch('')}>Clear search</button></div>}
        <p className="icp-note">Only your assigned courses and classes are listed. Selecting a class opens the workspace; nothing is posted or published here.</p>
      </>}
  </section>
}
