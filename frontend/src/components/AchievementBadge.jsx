import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function AchievementBadge({ badge, showTooltip = true, size = 'md' }) {
  const [showTip, setShowTip] = useState(false)
  const [portalElement, setPortalElement] = useState(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  const { 
    name, 
    icon, 
    description, 
    is_earned, 
    progress, 
    max_progress,
    xp_reward,
    earned_at 
  } = badge

  // Prepare the portal to render on the whole page body
  useEffect(() => {
    setPortalElement(document.body)
  }, [])

  const handleMouseEnter = (e) => {
    if (showTooltip) {
      setShowTip(true)
      // Track mouse position to place the tooltip
      setPosition({ x: e.clientX, y: e.clientY })
    }
  }

  const sizes = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  }

  const progressPercent = Math.min((progress / max_progress) * 100, 100)
  
  const badgeColor = is_earned 
    ? 'from-purple-600 to-pink-600 border-purple-400 shadow-purple-600/30' 
    : 'from-slate-700 to-slate-800 border-slate-600 shadow-slate-900/30'
  
  const textColor = is_earned ? 'text-white' : 'text-slate-400'
  const progressColor = is_earned ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-slate-600'

  // Calculate tooltip position (slightly offset from mouse so it doesn't block it)
  const tooltipStyle = {
    left: position.x + 10, // 10px to the right of mouse
    top: position.y + 10,  // 10px below mouse
  }

  return (
    <>
      {/* Badge Button */}
      <button
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTip(false)}
        className={`
          relative rounded-xl border-2 p-1 
          bg-gradient-to-br ${badgeColor}
          ${textColor} shadow-lg
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-xl hover:border-purple-300
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${sizes[size]}
          flex items-center justify-center
          ${!is_earned && 'grayscale hover:grayscale-0'}
        `}
        title={name}
      >
        <span className="drop-shadow-lg">{icon || '🔒'}</span>
        
        {is_earned && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px]">✓</span>
        )}
        
        {is_earned && xp_reward > 0 && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-yellow-600 text-white text-[8px] font-bold rounded-full whitespace-nowrap shadow">
            +{xp_reward} XP
          </span>
        )}
      </button>

      {/* ✅ Portal renders the tooltip directly on the page body, breaking out of all boxes! */}
      {showTip && showTooltip && portalElement && createPortal(
        <div 
          className="fixed z-[100] w-64 p-4 bg-slate-900 border border-purple-600/40 rounded-xl shadow-2xl shadow-purple-900/50 animate-fade-in pointer-events-none"
          style={tooltipStyle}
        >
          {/* Arrow pointing to mouse */}
          <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-900 border-l border-t border-purple-600/40 rotate-45" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{icon || '🔒'}</span>
              <h4 className={`font-bold ${is_earned ? 'text-white' : 'text-slate-300'}`}>{name}</h4>
            </div>
            
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">{description}</p>
            
            {!is_earned && max_progress > 0 && (
              <div className="mb-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progress</span>
                  <span>{progress}/{max_progress}</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${progressColor} transition-all duration-500 ease-out rounded-full`} style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            )}
            
            {is_earned && earned_at && (
              <p className="text-xs text-green-400">🎉 Earned: {new Date(earned_at).toLocaleDateString()}</p>
            )}
            
            {xp_reward > 0 && (
              <p className="text-xs text-yellow-400 font-bold mt-1">🎁 Reward: +{xp_reward} XP</p>
            )}
          </div>
        </div>,
        portalElement
      )}
    </>
  )
}