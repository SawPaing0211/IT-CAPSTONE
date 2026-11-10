import emptyBell from '../../../assets/hall/notification-empty.svg'

const PRIORITY = {
  urgent: 'border-rose-400/60 bg-rose-400/10 text-rose-200',
  high: 'border-orange-300/60 bg-orange-300/10 text-orange-200',
  medium: 'border-violet-300/60 bg-violet-300/10 text-violet-200',
  low: 'border-amber-300/50 bg-amber-300/10 text-amber-100',
}

export default function NotificationsPanel({ notifications, unreadCount, loading = false, error, onRetry, onMarkAllRead, onSelect, onBrowse }) {
  return (
    <section id="student-notifications-panel" aria-label="Notifications" className="relative rounded-xl bg-gradient-to-b from-[#1b2140] to-[#0b1021] p-3 text-left">
      <div aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-lg border border-amber-200/20" />
      <header className="relative flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/20 px-2 pb-3 pt-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">Notifications</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-200">{unreadCount} unread</span>
          {unreadCount > 0 && <button type="button" onClick={onMarkAllRead} className="min-h-[44px] rounded px-1 text-[10px] font-bold uppercase tracking-wide text-slate-300 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Mark all read</button>}
        </div>
      </header>
      <div className="relative max-h-[45vh] space-y-2 overflow-y-auto py-3 sm:max-h-96" aria-busy={loading}>
        {loading ? <p role="status" className="px-3 py-8 text-center text-sm text-slate-300">Loading announcements…</p>
          : error ? <div role="alert" className="px-3 py-8 text-center"><p className="text-sm text-rose-200">{error}</p><button onClick={onRetry} className="mt-3 min-h-[44px] rounded-lg border border-amber-300/40 px-4 text-xs font-bold text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Try again</button></div>
          : notifications.length === 0 ? <div className="px-3 py-7 text-center">
            <img className="mx-auto mb-4" src={emptyBell} width="56" height="56" alt="" aria-hidden="true" />
            <h3 className="font-cinzel text-sm font-bold text-amber-100">All quiet in the realm</h3>
            <p className="mx-auto mt-2 max-w-[250px] text-xs leading-relaxed text-slate-400">Announcements from your courses will appear here.</p>
          </div>
          : notifications.map(note => <button key={note.id} type="button" onClick={() => onSelect(note)}
            aria-label={`${note.read ? '' : 'Unread: '}${note.title}, ${note.class_label || 'Announcement'}`}
            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-amber-200/60 hover:bg-violet-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200 ${note.read ? 'border-slate-600/40 bg-slate-950/20' : 'border-amber-300/35 bg-amber-200/5'}`}>
            <span aria-hidden="true" className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${PRIORITY[note.priority] || PRIORITY.low}`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 5h14v11H9l-4 4ZM9 9h6M9 12h4" /></svg></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2"><span className="break-words text-sm font-semibold text-amber-100">{note.title}</span>{!note.read && <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />}</span>
              <span className="mt-1 block text-[11px] text-violet-200">{note.class_label}</span>
              <span className="mt-1 block line-clamp-2 break-words text-xs leading-relaxed text-slate-300">{note.content}</span>
              <span className="mt-2 flex flex-wrap justify-between gap-1 text-[11px] text-slate-400"><span>{note.instructor}</span><span>{note.date} · {note.time}</span></span>
              {(note.priority === 'urgent' || note.priority === 'high') && <span className={`mt-2 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY[note.priority]}`}>{note.priority}</span>}
            </span>
          </button>)}
      </div>
      <footer className="relative border-t border-amber-300/20 pt-2 text-center"><button type="button" onClick={onBrowse} className="min-h-[44px] rounded px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200">Browse My Subjects <span aria-hidden="true">→</span></button></footer>
    </section>
  )
}
