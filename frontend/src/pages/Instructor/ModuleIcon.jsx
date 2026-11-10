export default function ModuleIcon({ name = 'book', size = 22 }) {
  const paths = {
    edit: 'm15 3 6 6M4 16 16 4a3 3 0 0 1 4 4L8 20l-5 1 1-5Z',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    book: 'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15',
    file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h8',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 0a4 4 0 0 1 0 8',
    warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
    chart: 'M3 21h18M5 17v-5h3v5Zm6 0V7h3v10Zm6 0V3h3v14Z',
    announcement: 'm3 10 17-6v16L3 14v-4Zm4 5 2 6h3l-2-5',
    search: 'M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
    plus: 'M12 4v16M4 12h16',
    clip: 'm8 13 7-7a3 3 0 0 1 4 4l-9 9a5 5 0 0 1-7-7l10-10m-7 13 9-9',
    lock: 'M5 10h14v12H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v3',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.book} /></svg>
}
