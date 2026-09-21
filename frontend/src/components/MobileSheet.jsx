// a dropdown menu on desktop, a swipe-down-to-dismiss bottom sheet on mobile.
// used for the little popup menus (templates, settings, notifications, profile, etc)
// so mobile gets a native-feeling sheet instead of a tiny floating box that has
// nowhere good to anchor to on a narrow screen.
//
// rendered through a portal straight into <body>. reason: a `position: fixed`
// element is supposed to be positioned against the viewport, but any ancestor
// with backdrop-blur (or a transform) turns itself into the containing block
// instead — that's what was pinning this to the top of the sticky header
// instead of the bottom of the screen. a portal sidesteps that no matter what
// blur/transform classes get added around the trigger button later.

import { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

export default function MobileSheet({ show, onClose, widthClass = 'sm:w-56', anchorRef, children }) {
  const [dragY, setDragY] = useState(0)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [desktopPos, setDesktopPos] = useState({ top: 64, right: 16 })

  // Figure out where to anchor on desktop (below the trigger button) the moment
  // the sheet opens — a portal escapes the trigger's own DOM position, so CSS
  // alone can't line it up anymore, this has to be measured in JS.
  useLayoutEffect(() => {
    if (!show) return
    const desktop = window.matchMedia('(min-width: 640px)').matches
    setIsDesktop(desktop)
    if (desktop && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setDesktopPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
  }, [show, anchorRef])

  if (!show) return null

  // Track the drag handle so a swipe down far enough closes the sheet
  const handlePointerDown = (e) => {
    draggingRef.current = true
    startYRef.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const handlePointerMove = (e) => {
    if (!draggingRef.current) return
    const delta = e.clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }
  const endDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (dragY > 90) onClose()
    setDragY(0)
  }

  // strip the "sm:" prefix so the same class works as a plain width once
  // we're picking mobile vs desktop layout in JS instead of via a media query
  const desktopWidthClass = widthClass.replace(/^sm:/, '')

  return createPortal(
    // display:contents so this wrapper never affects layout — it only exists
    // so outside-click handlers elsewhere can recognize "click landed inside
    // a sheet" via data-mobile-sheet-portal and not treat it as an outside click
    <div data-mobile-sheet-portal style={{ display: 'contents' }}>
      {/* Click-away catcher. Dimmed on mobile (real bottom sheet feel),
          invisible on desktop (just closes the dropdown like before) */}
      <div
        className={isDesktop ? 'fixed inset-0 z-40' : 'fixed inset-0 bg-black/60 z-40'}
        onClick={onClose}
      />

      <div
        className={`fixed z-50 bg-slate-900 border border-slate-700 shadow-2xl transition-transform duration-150 ease-out overflow-y-auto ${
          isDesktop
            ? `rounded-xl max-h-[70vh] ${desktopWidthClass}`
            : 'inset-x-0 bottom-0 rounded-t-2xl w-full max-h-[75vh] pb-[env(safe-area-inset-bottom)]'
        }`}
        style={isDesktop ? { top: desktopPos.top, right: desktopPos.right } : { transform: `translateY(${dragY}px)` }}
      >
        {/* Drag handle — mobile only, swipe down on this to dismiss */}
        {!isDesktop && (
          <div
            className="flex justify-center py-2.5 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="w-10 h-1.5 bg-slate-600 rounded-full" />
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body
  )
}
