// The API returns one row per assigned subject/class pairing.
export function normalizeAssignedClasses(data) {
  if (!Array.isArray(data)) throw new Error('Invalid class response')
  return data.map(c => {
    if (!c || c.id == null || c.section_no == null) throw new Error('Incomplete class response')
    return {
      id: c.id, subjectId: c.subject_id,
      name: String(c.section_no),
      title: c.subjects?.length ? c.subjects.join(' · ') : (c.name || 'Assigned course'),
      subjectName: c.subjects?.[0] || c.name || 'Assigned course',
      semester: c.semester || 'Semester not specified',
      students: c.student_count, problems: c.problem_count,
    }
  })
}
export function groupAssignedClasses(classes) {
  const groups = new Map()
  for (const cls of classes) {
    const key = cls.subjectId != null ? `subject-${cls.subjectId}` : `class-${cls.id}`
    if (!groups.has(key)) groups.set(key, { key, name: cls.subjectName, classes: [] })
    groups.get(key).classes.push(cls)
  }
  return [...groups.values()]
}
export function enrollmentTotal(classes) {
  return classes.every(c => Number.isFinite(c.students)) ? classes.reduce((sum, c) => sum + c.students, 0) : null
}
