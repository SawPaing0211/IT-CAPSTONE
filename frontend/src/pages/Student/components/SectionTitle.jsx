// Gold-diamond section heading used on the Dashboard home ("Courses", "Bounty Board", ...).
// The diamond is a placeholder until the real ornament art arrives.

export default function SectionTitle({ children, actionLabel, onAction }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-2 h-2 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />
      <h2 className="font-cinzel text-xl font-bold tracking-wide text-white">{children}</h2>
      <span className="flex-1 h-px bg-gradient-to-r from-amber-300/30 to-transparent" aria-hidden="true" />
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-xs font-bold text-amber-200 hover:text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 rounded"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
