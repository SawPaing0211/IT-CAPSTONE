// Primary "Take Quest" button used on the Quest Spotlight and the Bounty preview.
// Violet gradient with a thin gold edge, Cinzel caps, soft glow and a small arrow.

export default function QuestButton({ onClick, ariaLabel, children = 'Take Quest', className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-lg border border-amber-300/55 bg-gradient-to-b from-violet-500 via-violet-600 to-violet-800 px-7 py-3 font-cinzel text-sm font-bold uppercase tracking-[0.16em] text-white shadow-[0_6px_22px_-4px_rgba(124,58,237,0.65),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.25)] transition duration-200 hover:-translate-y-px hover:border-amber-200/80 hover:from-violet-400 hover:via-violet-500 hover:shadow-[0_10px_28px_-4px_rgba(139,92,246,0.8),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.25)] active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
    >
      <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" aria-hidden="true" />
      <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{children}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f3d78a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
        <path d="M5 12h13m-5-5 5 5-5 5" />
      </svg>
    </button>
  )
}
