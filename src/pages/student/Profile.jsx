import { useState } from 'react';
import { 
  User, 
  Trophy, 
  Star, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Award, 
  Settings, 
  Edit2, 
  Save, 
  X,
  Flame,
  Target,
  TrendingUp,
  Code2
} from 'lucide-react';

function StudentProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, achievements, activity, settings

  // Mock Student Data
  const [profile, setProfile] = useState({
    name: 'Niño, Sasan',
    email: 'sasan.nino@adamson.edu.ph',
    block: '301',
    level: 12,
    xp: 2450,
    maxXp: 3000,
    streak: 15,
    joinDate: 'January 2026',
    bio: 'Computer Science student passionate about algorithms and problem-solving.',
    avatar: 'NS',
    stats: {
      problemsCompleted: 23,
      totalSubmissions: 45,
      averageScore: 78,
      completionRate: 85
    },
    skills: [
      { name: 'Arrays', level: 90, color: 'bg-green-500' },
      { name: 'Strings', level: 75, color: 'bg-blue-500' },
      { name: 'Loops', level: 95, color: 'bg-purple-500' },
      { name: 'Recursion', level: 45, color: 'bg-orange-500' },
      { name: 'Sorting', level: 60, color: 'bg-pink-500' },
    ]
  });

  // Mock Badges/Achievements
  const badges = [
    { id: 1, name: 'First Blood', description: 'Complete your first problem', icon: '🎯', earned: true, date: 'Jan 15, 2026' },
    { id: 2, name: 'Speed Demon', description: 'Solve 5 problems in under 10 minutes each', icon: '⚡', earned: true, date: 'Jan 20, 2026' },
    { id: 3, name: 'Bug Hunter', description: 'Fix 10 bugs in debug challenges', icon: '🐛', earned: true, date: 'Feb 1, 2026' },
    { id: 4, name: 'Streak Master', description: 'Maintain a 7-day streak', icon: '🔥', earned: true, date: 'Feb 10, 2026' },
    { id: 5, name: 'Perfect Score', description: 'Get 100% on a hard problem', icon: '💯', earned: false, date: null },
    { id: 6, name: 'Code Wizard', description: 'Reach level 20', icon: '🧙', earned: false, date: null },
    { id: 7, name: 'Team Player', description: 'Help 5 classmates', icon: '🤝', earned: false, date: null },
    { id: 8, name: 'Marathon Coder', description: 'Solve 50 problems', icon: '🏃', earned: false, date: null },
  ];

  // Mock Recent Activity
  const recentActivity = [
    { id: 1, type: 'completed', title: 'Array Sorting Master', xp: 150, time: '2 hours ago', icon: CheckCircle2, color: 'text-green-500' },
    { id: 2, type: 'badge', title: 'Earned: Speed Demon', xp: 100, time: '1 day ago', icon: Award, color: 'text-yellow-500' },
    { id: 3, type: 'levelup', title: 'Leveled up to Level 12!', xp: 0, time: '2 days ago', icon: TrendingUp, color: 'text-purple-500' },
    { id: 4, type: 'failed', title: 'Binary Search Challenge', xp: 0, time: '3 days ago', icon: X, color: 'text-red-500' },
    { id: 5, type: 'completed', title: 'String Reversal', xp: 75, time: '4 days ago', icon: CheckCircle2, color: 'text-green-500' },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  const xpPercentage = Math.round((profile.xp / profile.maxXp) * 100);

  const handleSaveProfile = () => {
    setIsEditing(false);
    // In real app, save to backend here
  };

  return (
    <div className="space-y-6">
      
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] rounded-2xl border border-gray-700 p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-purple-500/30">
              {profile.avatar}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 p-2 bg-[#eab308] rounded-full text-black shadow-lg hover:bg-yellow-500 transition">
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left">
            {isEditing ? (
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="text-2xl font-bold text-white bg-[#0f172a] border border-gray-700 rounded px-3 py-1 mb-2 focus:border-[#eab308] focus:outline-none"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white mb-1">{profile.name}</h2>
            )}
            
            <p className="text-gray-400 text-sm mb-3">{profile.email} • Block {profile.block}</p>
            
            {/* Level & XP Bar */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 font-bold text-white shadow-lg">
                  {profile.level}
                </span>
                <div>
                  <div className="text-sm text-gray-400">Level {profile.level}</div>
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#eab308] to-yellow-400 transition-all duration-500"
                      style={{ width: `${xpPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {profile.xp} / {profile.maxXp} XP
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
              <div className="flex items-center gap-1 text-orange-400">
                <Flame size={14} />
                <span>{profile.streak} day streak</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star size={14} />
                <span>{earnedBadges.length} badges</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <Clock size={14} />
                <span>Member since {profile.joinDate}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition"
                >
                  <Save size={16} /> Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <X size={16} /> Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 bg-[#1e293b] p-1 rounded-lg border border-gray-700 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'activity', label: 'Activity', icon: Clock },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[#eab308] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-800 text-center">
                <div className="text-3xl font-bold text-white mb-1">{profile.stats.problemsCompleted}</div>
                <div className="text-xs text-gray-400">Problems Solved</div>
              </div>
              <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-800 text-center">
                <div className="text-3xl font-bold text-[#eab308] mb-1">{profile.stats.totalSubmissions}</div>
                <div className="text-xs text-gray-400">Total Submissions</div>
              </div>
              <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-800 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{profile.stats.averageScore}%</div>
                <div className="text-xs text-gray-400">Average Score</div>
              </div>
              <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-800 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">{profile.stats.completionRate}%</div>
                <div className="text-xs text-gray-400">Completion Rate</div>
              </div>
            </div>

            {/* Skills Progress */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target size={18} className="text-[#eab308]" />
                Skill Progress
              </h3>
              <div className="space-y-4">
                {profile.skills.map((skill, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{skill.name}</span>
                      <span className="text-gray-400">{skill.level}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${skill.color} transition-all duration-500`}
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User size={18} className="text-[#eab308]" />
                About Me
              </h3>
              {isEditing ? (
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  rows={4}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#eab308] focus:outline-none resize-none"
                />
              ) : (
                <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        )}

        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy size={18} className="text-[#eab308]" />
              Your Badges ({earnedBadges.length}/{badges.length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div 
                  key={badge.id} 
                  className={`p-4 rounded-lg border text-center transition ${
                    badge.earned 
                      ? 'bg-[#0f172a] border-gray-700 hover:border-[#eab308]/50' 
                      : 'bg-[#0f172a]/50 border-gray-800 opacity-60'
                  }`}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <h4 className="font-bold text-white text-sm mb-1">{badge.name}</h4>
                  <p className="text-xs text-gray-400 mb-2">{badge.description}</p>
                  {badge.earned ? (
                    <span className="text-xs text-green-400">{badge.date}</span>
                  ) : (
                    <span className="text-xs text-gray-500">🔒 Locked</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-[#eab308]" />
              Recent Activity
            </h3>
            
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-[#0f172a] rounded-lg hover:bg-[#1e293b] transition">
                  <div className={`p-2 rounded-lg ${activity.color.replace('text-', 'bg-').replace('-500', '-500/10')}`}>
                    <activity.icon size={16} className={activity.color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{activity.title}</span>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                    {activity.xp > 0 && (
                      <div className="text-xs text-[#eab308] flex items-center gap-1">
                        <Zap size={12} />
                        +{activity.xp} XP
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-[#eab308]" />
              Account Settings
            </h3>
            
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Contact your instructor to change email</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notifications</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#eab308]" />
                    <span className="text-sm text-gray-300">Email me about new challenges</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#eab308]" />
                    <span className="text-sm text-gray-300">Notify me when I earn a badge</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-[#eab308]" />
                    <span className="text-sm text-gray-300">Weekly progress reports</span>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={handleSaveProfile}
                className="px-6 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg font-bold transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentProfile;