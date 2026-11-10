// Enrollment CSV helpers. The preview mirrors the server's row rules so an administrator is not
// misled, but the SERVER stays the authority: it alone knows which class codes exist and which
// students already have accounts. Nothing here changes what is sent.
//
// Server rules (backend admin_bulk_enrollment_upload):
//   - columns student_id, firstname, lastname, student_type, section_no must exist (middlename/suffix optional,
//     any other column such as a legacy year_level is ignored)
//   - student_id required; for a NEW student it must have no spaces and no '@'
//   - student_type is "regular" or "irregular"
//   - section_no is required on EVERY row of both types (one row = one class-code enrollment;
//     an irregular student repeats the same student_id once per class code)
//   - firstname/lastname are needed only when the student does not have an account yet
//   - the class code must exist, be active and be a supported first-year subject: checked by the server only

export const REQUIRED_COLS = ['student_id', 'firstname', 'lastname', 'student_type', 'section_no']

export function parseCSV(text) {
  const lines = String(text).replace(/^﻿/, '').trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = []
    let cur = '', inQ = false
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    const row = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? '' })
    rows.push(row)
  }
  return { headers, rows }
}

// returns { errors: [...], warnings: [...] } for one row
export function checkRow(row) {
  const errors = [], warnings = []
  const sid = (row.student_id || '').trim()
  if (!sid) errors.push('student_id is empty')
  else if (/\s|@/.test(sid)) errors.push("student_id must not contain spaces or '@'")
  const st = (row.student_type || '').trim().toLowerCase()
  if (st !== 'regular' && st !== 'irregular') errors.push("student_type must be 'regular' or 'irregular'")
  if (!(row.section_no || '').trim()) errors.push('section_no (class code) is empty')
  if (!(row.firstname || '').trim() || !(row.lastname || '').trim()) {
    warnings.push('firstname/lastname empty: skipped unless this student already has an account')
  }
  return { errors, warnings }
}

// whole-file check; row numbers match the spreadsheet (header = row 1)
export function checkRows(rows) {
  const errs = [], warns = []
  rows.forEach((r, i) => {
    const { errors, warnings } = checkRow(r)
    if (errors.length) errs.push({ row: i + 2, student_id: r.student_id, errors })
    if (warnings.length && !errors.length) warns.push({ row: i + 2, student_id: r.student_id, errors: warnings })
  })
  return { errs, warns }
}
