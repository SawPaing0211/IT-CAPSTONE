import { useEffect, useState } from 'react'
import AchievementBadge from './AchievementBadge'

export default function AchievementModal({ achievements, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const [filter, setFilter] = useState('all')

  const earned = achievements.filter(b => b.is_earned)
  const locked = achievements.filter(b => !b.is_earned)
  const visible = filter === 'earned' ? earned : filter === 'locked' ? locked : achievements

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-purple-600/40 rounded-2xl shadow-2xl shadow-purple-900/50 flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-purple-600/30">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>🏆</span> My Achievements
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {earned.length} of {achievements.length} badges earned
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-purple-600/30">
          {[
            { key: 'all',    label: `All (${achievements.length})` },
            { key: 'earned', label: `Earned (${earned.length})` },
            { key: 'locked', label: `Locked (${locked.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <span className="text-4xl mb-3">🎯</span>
              <p className="text-sm">No badges here</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visible.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-2">
                <AchievementBadge badge={badge} size="md" showTooltip={true} />
                <p className={`text-xs text-center font-medium ${badge.is_earned ? 'text-white' : 'text-slate-400'}`}>
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-600/30 text-center">
          <p className="text-xs text-slate-500">
            Hover over badges for details • Keep exploring to earn more! ✨
          </p>
        </div>
      </div>
    </div>
  )
}