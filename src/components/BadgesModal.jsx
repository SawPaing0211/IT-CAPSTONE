import { X, Lock, CheckCircle, Trophy, Bug, Zap, Star } from 'lucide-react';

const BADGE_DEFINITIONS = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Solve your first coding problem.',
    icon: Trophy,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10'
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Get a perfect 100% score on any submission.',
    icon: Star,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10'
  },
  {
    id: 'grinder',
    title: 'Grinder',
    description: 'Make 5 submissions in total.',
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Maintain a 7-day login streak.',
    icon: Bug,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10'
  }
];

function BadgesModal({ isOpen, onClose, userBadges = {} }) {
  if (!isOpen) return null;

  const count = Object.keys(userBadges).filter(k => userBadges[k]).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-white/10 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Your Badges</h2>
            <p className="text-slate-400 text-sm">{count} / {BADGE_DEFINITIONS.length} Earned</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Badge Grid */}
        <div className="p-6 grid grid-cols-1 gap-4">
          {BADGE_DEFINITIONS.map((badge) => {
            const isEarned = !!userBadges[badge.id];
            const Icon = badge.icon;

            return (
              <div 
                key={badge.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isEarned 
                    ? 'bg-slate-900/50 border-white/20' 
                    : 'bg-slate-900/20 border-white/5 opacity-60'
                }`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                  isEarned ? `${badge.bg} ${badge.color}` : 'bg-slate-800 text-slate-600'
                }`}>
                  {isEarned ? <Icon size={28} /> : <Lock size={28} />}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold ${isEarned ? 'text-white' : 'text-slate-500'}`}>
                      {badge.title}
                    </h3>
                    {isEarned && <CheckCircle size={16} className="text-green-400" />}
                  </div>
                  <p className="text-sm text-slate-400">{badge.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BadgesModal;