import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Trophy, TrendingUp, Target, Flame, Clock, 
  CheckCircle, AlertCircle, Play, ArrowRight, Star,
  Sword, Shield, Sparkles, Crown, Gamepad2, ChevronRight
} from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log("🔍 Dashboard fetching with token:", token ? token.substring(0, 50) + "..." : "NO TOKEN");
        
        const response = await fetch('http://localhost:5000/api/student/dashboard', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log("📡 Response status:", response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log("✅ Dashboard data loaded:", result);
          setData(result);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Dashboard fetch failed:", response.status, errorData);
        }
      } catch (err) {
        console.error('💥 Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <Gamepad2 size={64} className="relative text-yellow-400 animate-bounce" />
        </div>
        <p className="text-slate-400 text-lg">Loading your quest data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-red-400 text-lg">Failed to load quest data</p>
        <p className="text-slate-500 text-sm">Check console for details (F12)</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { user, stats, quests, recommended, daily, activity } = data;
  const xpProgress = Math.min((user.xp % user.xp_to_next) / user.xp_to_next * 100, 100);

  return (
    <div className="space-y-8 pb-10">
      
      {/* HERO CARD */}
      <div className="relative bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-8 rounded-2xl border border-white/10 backdrop-blur-sm overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-purple-600 rounded-full blur-lg opacity-50"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-slate-800">
                {JSON.parse(localStorage.getItem('user') || '{}').name?.charAt(0) || 'A'}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center border-4 border-slate-800">
                <Crown size={16} className="text-white" />
              </div>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Ready to Code, {JSON.parse(localStorage.getItem('user') || '{}').name || 'Adventurer'}?
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 text-orange-400">
                  <Flame size={16} />
                  {user.streak}-day streak! Keep it up! 🔥
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center px-6 py-3 bg-slate-800/50 rounded-xl border border-white/10">
              <div className="text-3xl font-bold text-yellow-400">{stats.completed}</div>
              <div className="text-xs text-slate-400">Problems Solved</div>
            </div>
            <div className="text-center px-6 py-3 bg-slate-800/50 rounded-xl border border-white/10">
              <div className="text-3xl font-bold text-purple-400">{user.xp}</div>
              <div className="text-xs text-slate-400">Total XP</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* ACTIVE QUESTS */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Target size={20} className="text-yellow-400" />
                </div>
                Active Quests
              </h2>
              <button className="text-sm text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1 transition">
                View All <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {quests.length > 0 ? quests.map((quest) => (
                <div key={quest.id} className="group bg-slate-900/50 p-5 rounded-xl border border-white/5 hover:border-yellow-500/30 transition-all hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition mb-2">{quest.title}</h3>
                      <div className="flex gap-3 items-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          quest.difficulty === 'Easy' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                          quest.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'
                        }`}>{quest.difficulty}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Zap size={12} className="text-yellow-400" /> {quest.xp_reward} XP
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/student/challenge/${quest.id}`)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all transform hover:scale-105 ${
                        quest.attempts > 0 
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500' 
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      <Play size={14} /> {quest.attempts > 0 ? 'Continue' : 'Start'}
                    </button>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-purple-600 h-2 rounded-full transition-all" style={{ width: `${Math.random() * 100}%` }}></div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
                    <Sword size={32} className="text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-lg mb-2">No Active Quests Available</p>
                  <p className="text-slate-500 text-sm">Instructors haven't posted any problems yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* RECOMMENDED */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Star size={20} className="text-purple-400" />
              </div>
              Recommended For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommended.length > 0 ? recommended.map((prob) => (
                <div 
                  key={prob.id} 
                  onClick={() => navigate(`/student/challenge/${prob.id}`)}
                  className="bg-slate-900/50 p-5 rounded-xl border border-white/5 hover:border-purple-500/30 cursor-pointer transition-all hover:scale-105 group"
                >
                  <h3 className="font-bold text-white text-sm mb-3 group-hover:text-purple-400 transition line-clamp-2">{prob.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-3 py-1 rounded-full border ${
                      prob.difficulty === 'Easy' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                      prob.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'
                    }`}>{prob.difficulty}</span>
                    <span className="text-xs text-yellow-400 flex items-center gap-1"><Zap size={12} /> {prob.xp_reward}</span>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 text-center py-8 text-slate-500">
                  <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
                  <p>No recommendations yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          
          {/* STATS CARD */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp size={20} className="text-blue-400" />
              </div>
              Your Stats
            </h2>
            <div className="space-y-4">
              <StatRow label="Problems Completed" value={stats.completed} />
              <StatRow label="Total XP Earned" value={stats.total_xp} highlight color="yellow" />
              <StatRow label="Average Score" value={`${stats.avg_score}%`} />
              <StatRow label="Current Streak" value={`${stats.streak} days`} icon={<Flame size={16} className="text-orange-500" />} />
            </div>
            
            {/* XP Progress */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Level {user.level}</span>
                <span className="text-yellow-400 font-semibold">{user.xp % user.xp_to_next} / {user.xp_to_next} XP</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-purple-600 h-full rounded-full transition-all" 
                  style={{ width: `${xpProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* DAILY CHALLENGE */}
          {daily && (
            <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl border border-purple-500/30 p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Zap size={20} className="text-purple-400" />
                  </div>
                  <h2 className="font-bold text-white text-lg">Daily Challenge</h2>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{daily.title}</h3>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xs px-3 py-1 rounded-full border ${
                    daily.difficulty === 'Easy' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                    daily.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'
                  }`}>{daily.difficulty}</span>
                  <span className="text-sm text-purple-300 font-semibold">+{daily.xp_reward} XP Bonus</span>
                </div>
                <button 
                  onClick={() => navigate(`/student/challenge/${daily.id}`)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
                >
                  Start Challenge
                </button>
              </div>
            </div>
          )}

          {/* RECENT ACTIVITY */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="p-2 bg-slate-600/20 rounded-lg">
                <Clock size={20} className="text-slate-400" />
              </div>
              Recent Activity
            </h2>
            <div className="space-y-4">
              {activity.length > 0 ? activity.map((act, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition">
                  <div className={`p-2 rounded-full ${
                    act.status === 'passed' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {act.status === 'passed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{act.title}</div>
                    <div className="text-xs text-slate-500">Score: {act.score}%</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    {act.submitted_at ? new Date(act.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Clock size={32} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight, color, icon }) {
  const highlightColors = {
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400'
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
      <span className="text-slate-400 text-sm flex items-center gap-2">{icon} {label}</span>
      <span className={`font-bold ${highlight ? (highlightColors[color] || 'text-yellow-400') : 'text-white'}`}>{value}</span>
    </div>
  );
}

export default Dashboard;