// One success / warning / error banner for every admin dialog.
// error -> role="alert", success and warning -> role="status".
const TONES = {
  success: {
    box: 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100',
    chip: 'bg-emerald-500/20 text-emerald-300',
    title: 'text-emerald-200',
    icon: <polyline points="20 6 9 17 4 12" />,
  },
  warning: {
    box: 'border-amber-500/40 bg-amber-950/50 text-amber-100',
    chip: 'bg-amber-500/20 text-amber-300',
    title: 'text-amber-200',
    icon: <><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  },
  error: {
    box: 'border-red-500/40 bg-red-950/50 text-red-100',
    chip: 'bg-red-500/20 text-red-300',
    title: 'text-red-200',
    icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
  },
}

export default function FormBanner({ tone = 'error', title, children, className = '' }) {
  const t = TONES[tone] ?? TONES.error
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${t.box} ${className}`}>
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${t.chip}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">{t.icon}</svg>
      </span>
      <div className="min-w-0">
        {title && <p className={`font-semibold ${t.title}`}>{title}</p>}
        <p className={`break-words leading-relaxed ${title ? 'mt-0.5' : ''}`}>{children}</p>
      </div>
    </div>
  )
}
