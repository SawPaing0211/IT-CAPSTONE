// Desktop sidebar for the student area (shown from 1024px up; below that the
// fixed bottom nav is used instead). Same destinations as the bottom nav.
// It is a real <nav>: buttons, keyboard focusable, aria-current on the active item.

import crystalIcon from '../../../assets/landing/forge-crystal-logo.webp'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICONS = {
  dashboard: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  subjects: <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v15h6.5a1.5 1.5 0 0 1 1.5 1.5z" />,
  bounty: <path d="M6 21V4m0 1h11l-2.5 4L17 13H6" />,
  hero: <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6z" />,
  hall: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4m-3.5 3h7M10 17h4" />,
  sandbox: <path d="M4 5h16v14H4zM7.5 10l2.5 2-2.5 2M12.5 14.5h4" />,
}

export const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'subjects',  label: 'My Subjects' },
  { id: 'bounty',    label: 'Bounty Board' },
  { id: 'hero',      label: 'Hero Sheet' },
  { id: 'hall',      label: 'Hall of Champions' },
  { id: 'sandbox',   label: 'Sandbox' },
]

export default function StudentSidebar({ activeId, onSelect }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[232px] flex-col bg-slate-950/90 backdrop-blur border-r border-amber-300/15">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img src={crystalIcon} alt="" className="h-11 w-auto shrink-0 select-none" draggable="false" />
          <span className="font-cinzel font-bold text-lg tracking-wide text-white">FORGE.DEV</span>
        </div>
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      </div>

      <nav aria-label="Student navigation" className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {SIDEBAR_ITEMS.map(item => {
          const active = activeId === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                active
                  ? 'bg-violet-600/25 text-white border border-violet-400/40'
                  : 'text-slate-300 border border-transparent hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-300" aria-hidden="true" />}
              <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true" className={active ? 'text-violet-200' : 'text-slate-400'}>
                {ICONS[item.id]}
              </svg>
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="px-5 py-4 text-[11px] text-slate-500">
        <p className="text-amber-300/80 font-semibold tracking-[0.18em] uppercase">Shadow Citadel</p>
        <p className="mt-0.5">Your coding journey</p>
      </div>
    </aside>
  )
}
