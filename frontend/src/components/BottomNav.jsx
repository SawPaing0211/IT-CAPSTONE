// fixed bottom tab bar, mobile only — the desktop top-tab row stays as-is
// and just hides itself below the sm: breakpoint. Native-app style: icon on
// top, short label under it, safe-area padding so it clears the iPhone home
// indicator.

export default function BottomNav({ tabs, activeId, onSelect, accentId }) {
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-purple-600/40 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(tab => {
        const active = activeId === tab.id
        const accent = tab.id === accentId ? 'emerald' : 'purple'
        return (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onSelect(tab.id)}
            disabled={tab.disabled}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition ${
              tab.disabled
                ? 'text-slate-700'
                : active
                  ? accent === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
                  : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[9px] font-bold leading-none">{tab.shortLabel}</span>
            {active && (
              <span className={`absolute top-0 h-0.5 w-8 rounded-full ${accent === 'emerald' ? 'bg-emerald-400' : 'bg-purple-400'}`} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
