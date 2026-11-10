// Small line icons for the admin screens (they replace emoji). They use currentColor,
// so colour them with a text-* class. Size them with className (default size-4).
const PATHS = {
  check: <polyline points="20 6 9 17 4 12" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  alert: <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M10 4v16" /></>,
  disk: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.700 3.600 3 8 3s8-1.300 8-3V5M4 12c0 1.700 3.600 3 8 3s8-1.300 8-3" /></>,
  download: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  redo: <path d="M3 12a9 9 0 1 0 3-6.700L3 8M3 3v5h5" />,
  save: <path d="M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7" />,
  users: <><circle cx="9" cy="8" r="3.500" /><path d="M2.500 20c0-3.500 3-6 6.500-6s6.500 2.500 6.500 6M16 4.500a3.500 3.500 0 0 1 0 7M18 14.500c2.200.8 3.500 2.800 3.500 5.500" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16" />,
  layers: <path d="m12 3 10 5-10 5L2 8zM2 13l10 5 10-5" />,
  puzzle: <path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v5H4v-5h2a2 2 0 1 0 0-4H4V6h6z" />,
  filetext: <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h6" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />,
  link: <path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" />,
  megaphone: <path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1zM19 9a4 4 0 0 1 0 6" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900 7 7M17 17l2.100 2.100M19.100 4.900 17 7M7 17l-2.100 2.100" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  unlock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.500-2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  clipboard: <><rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 3h6v4H9zM9 12h6M9 16h4" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.300-4.300" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.600 5.600 12.800 12.800" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.500" /></>,
  tag: <path d="m20.600 13.400-7.200 7.200a2 2 0 0 1-2.800 0L3 13V3h10l7.600 7.600a2 2 0 0 1 0 2.800zM7.500 7.500h.01" />,
  shield: <path d="M12 3 4 6v6c0 5 3.500 8 8 9 4.500-1 8-4 8-9V6z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  edit: <path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" />,
  leaf: <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15zM5 19l8-8" />,
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5" />,
  flask: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />,
  code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
  star: <path d="m12 2 3 7 7 .500-5.300 4.700L18.500 22 12 18l-6.500 4 1.800-7.800L2 9.500 9 9z" />,
  building: <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />,
  school: <path d="M3 9 12 4l9 5-9 5zM7 11.500V16c0 1 2.200 2.500 5 2.500s5-1.500 5-2.500v-4.500" />,
}

export default function AdminIcon({ name, className = 'size-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

// Use for an icon that sits in front of text inside a button, label or heading.
export const INLINE = 'inline-block size-4 align-[-0.2em] mr-1.5'
