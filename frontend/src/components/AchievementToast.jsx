import { useState, useEffect } from 'react';

export default function AchievementToast({ badge, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setVisible(true), 50);
    
    // Auto dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  if (!badge) return null;

  return (
    <div className={`fixed top-6 right-6 z-[200] transition-all duration-500 transform ${
      visible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
    }`}>
      <div className="bg-slate-900 border border-purple-500/50 rounded-xl shadow-2xl shadow-purple-500/20 p-4 flex items-center gap-4 max-w-sm">
        {/* Badge Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl shadow-lg animate-bounce">
          {badge.icon || '🏆'}
        </div>
        
        {/* Content */}
        <div>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Achievement Unlocked!</p>
          <h4 className="text-white font-bold text-sm mt-0.5">{badge.name}</h4>
          {badge.xp_reward > 0 && (
            <p className="text-yellow-400 text-xs font-bold mt-0.5">+{badge.xp_reward} XP Earned</p>
          )}
        </div>
      </div>
    </div>
  );
}