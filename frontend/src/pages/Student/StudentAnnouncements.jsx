// Announcements for one specific subject — students only read these,
// no create/edit/delete (that's instructor-only). Reuses the same
// /api/announcements?class_id=X endpoint the instructor side already
// uses, since it's already correctly scoped and open to any logged-in
// user to read.
//
// Read state lives in the dashboard (localStorage, per student), so it is
// handed in as `readIds` + `onMarkRead` and the bell stays in sync.

import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api/client'
import { parseApiTimestamp } from '../../utils/apiTimestamp'

const PRIORITY = {
  low:    { label: 'Low',    cls: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
  medium: { label: 'Medium', cls: 'text-sky-300 border-sky-400/30 bg-sky-400/10' },
  high:   { label: 'High',   cls: 'text-orange-300 border-orange-400/35 bg-orange-400/10' },
  urgent: { label: 'Urgent', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' },
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4h6l-1 6 3 3H7l3-3-1-6Z" /><path d="M12 13v7" />
  </svg>
)
const HornIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10v4h3l7 4V6L7 10H4Z" /><path d="M17.5 9.5a4 4 0 0 1 0 5" />
  </svg>
)

export default function StudentAnnouncements({ classId, sectionName, readIds, onMarkRead }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)

  // Fetch announcements posted for this subject
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true)
      try {
        const data = await api.get(`/api/announcements?class_id=${classId}`)
        setAnnouncements(data)
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setLoading(false)
      }
    }
    if (classId) fetchAnnouncements()
  }, [classId])

  const isRead = (a) => !!readIds?.has(a.id)

  // pinned first, then newest first
  const sorted = useMemo(() => [...announcements].sort((a, b) => {
    if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1
    return new Date(b.created_at) - new Date(a.created_at)
  }), [announcements])

  const counts = {
    all: sorted.length,
    unread: sorted.filter(a => !isRead(a)).length,
    pinned: sorted.filter(a => a.is_pinned).length,
  }
  const visible = sorted.filter(a =>
    filter === 'unread' ? !isRead(a) : filter === 'pinned' ? a.is_pinned : true
  )

  const toggle = (a) => {
    const opening = openId !== a.id
    setOpenId(opening ? a.id : null)
    if (opening && !isRead(a)) onMarkRead?.(a.id)
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-800/60" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-amber-300/10 bg-[#0b1224]" />
        ))}
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] px-6 py-14 text-center">
        <span className="mx-auto mb-4 block h-2 w-2 rotate-45 bg-amber-300" aria-hidden="true" />
        <h2 className="font-cinzel text-xl font-bold text-amber-100">No announcements yet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your instructor hasn't posted anything for {sectionName} yet.
        </p>
      </div>
    )
  }

  const pills = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'pinned', label: 'Pinned' },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter announcements">
          {pills.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={filter === p.id}
              onClick={() => setFilter(p.id)}
              className={`min-h-[44px] rounded-lg border px-4 text-[11px] font-bold uppercase tracking-[0.16em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:min-h-[36px] ${
                filter === p.id
                  ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {p.label} <span className="ml-1 opacity-70">{counts[p.id]}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Pinned first, then newest. Posted by your instructor.</p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
          {filter === 'unread' ? 'You are all caught up.' : 'Nothing is pinned in this subject.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(a => {
            const pc = PRIORITY[a.priority] || PRIORITY.medium
            const read = isRead(a)
            const open = openId === a.id
            const accent = a.is_pinned ? 'bg-amber-300' : read ? 'bg-slate-600' : 'bg-violet-400'
            return (
              <li
                key={a.id}
                className="relative overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024]"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden="true" />
                <button
                  onClick={() => toggle(a)}
                  aria-expanded={open}
                  className="flex w-full items-start gap-4 p-4 pl-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300 sm:p-5 sm:pl-6"
                >
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    a.is_pinned ? 'border-amber-300/50 bg-amber-300/10 text-amber-200' : 'border-violet-400/30 bg-violet-500/10 text-violet-200'
                  }`}>
                    {a.is_pinned ? <PinIcon /> : <HornIcon />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      <span>Instructor · {a.instructor}</span>
                      <span aria-hidden="true">·</span>
                      <span>{parseApiTimestamp(a.created_at)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>
                    <span className="mt-1.5 block font-cinzel text-lg font-bold leading-snug text-amber-50">{a.title}</span>
                    <span className={`mt-1.5 block whitespace-pre-line text-sm leading-relaxed text-slate-300 ${open ? '' : 'line-clamp-2'}`}>
                      {a.content}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {a.is_pinned && <span className="rounded border border-amber-300/50 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">Pinned</span>}
                    {!read
                      ? <span className="rounded border border-violet-400/50 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-200">New</span>
                      : <span className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Read</span>}
                    {a.priority && a.priority !== 'medium' && (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pc.cls}`}>{pc.label}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
