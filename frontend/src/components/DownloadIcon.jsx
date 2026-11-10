// shared download icon — plain inline SVG, not an emoji.
//
// found via a real bug: the Instructor/Student mobile app's WebView doesn't
// have a full emoji font, so "⬇️"/"📥" render as an unrelated fallback glyph
// (looked like a stray "I", then a ticket icon) instead of an arrow. An SVG
// draws identically on every device regardless of what emoji glyphs that
// device's font happens to support, so anything that actually needs to read
// as "download" (not just decorative) should use this instead of an emoji.
//
// same path data as the hand-drawn icon already used on the Admin side
// (UserManagement.jsx / SectionsManagement.jsx) — copied exactly so a
// download icon looks like the same icon everywhere in the app.
export default function DownloadIcon({ size = 14, color = 'currentColor', className }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  )
}
