const glyphs = {
  dashboard: 'M3 13a9 9 0 0 1 18 0v5H3z M6 13h1m5-6v1m5 5h1m-6 2 3-4',
  sections: 'M4 7h16v13H4z M7 4h10m-9 7-2 2 2 2m8-4 2 2-2 2m-3-5-2 6',
  users: 'M15 20H3v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z M17 14h1a3 3 0 0 1 3 3v3h-3 M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M16 5a3 3 0 0 1 0 6',
  assignments: 'm2 9 10-5 10 5-10 5z M6 11v5c2 3 10 3 12 0v-5 M22 9v6',
  activity: 'M6 3h8l4 4v14H6z M14 3v5h4 M9 11h6m-6 3h6m-6 3h4',
}

export default function AdminNavIcon({ name, className }) {
  return (
    <svg aria-hidden="true" className={`admin-nav-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={glyphs[name]} />
    </svg>
  )
}
