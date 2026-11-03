import { useState, useEffect, useRef } from 'react';

// Visual-only celebration card (announcement lives in AchievementCelebrations).
export default function AchievementToast({ badge, onClose, reducedMotion = false, remaining = 0 }) {
  const [visible, setVisible] = useState(reducedMotion);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const timer = reducedMotion ? null : setTimeout(() => setVisible(true), 50);
    let exit;
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      exit = setTimeout(() => closeRef.current && closeRef.current(), reducedMotion ? 0 : 300);
    }, 5000);
    return () => { clearTimeout(timer); clearTimeout(dismissTimer); clearTimeout(exit); };
  }, [reducedMotion]);

  if (!badge) return null;

  const motion = reducedMotion ? '' : 'transition-all duration-500 transform ' + (visible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0');

  return (
    <div aria-hidden="true" data-testid="achievement-toast" data-reduced-motion={reducedMotion ? 'true' : 'false'}
         className={`fixed top-6 right-6 z-[200] ${motion}`}>
      <div className="bg-slate-900 border border-purple-500/50 rounded-xl shadow-2xl shadow-purple-500/20 p-4 flex items-center gap-4 max-w-sm">
        <div className={`w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl shadow-lg ${reducedMotion ? '' : 'animate-bounce'}`}>
          {badge.icon || '🏆'}
        </div>
        <div>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Achievement Unlocked!</p>
          <h4 className="text-white font-bold text-sm mt-0.5">{badge.name}</h4>
          {badge.xp_reward > 0 && (
            <p className="text-yellow-400 text-xs font-bold mt-0.5">+{badge.xp_reward} XP Earned</p>
          )}
          {remaining > 0 && (
            <p className="text-slate-400 text-[10px] mt-0.5">+{remaining} more to show</p>
          )}
        </div>
      </div>
    </div>
  );
}
