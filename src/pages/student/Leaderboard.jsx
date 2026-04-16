import { useState } from 'react';
import { Trophy, Medal, Star, Zap, TrendingUp, Users, Filter, Crown, Flame } from 'lucide-react';

function StudentLeaderboard() {
  const [timeFilter, setTimeFilter] = useState('weekly'); // weekly, monthly, alltime
  const [blockFilter, setBlockFilter] = useState('all');

  // Mock Leaderboard Data
  const leaderboardData = [
    { rank: 1, name: 'Niño, Sasan', block: '301', level: 15, xp: 3250, streak: 28, badges: 12, trend: 'up', isCurrentUser: true },
    { rank: 2, name: 'Guzman, Iverson', block: '303', level: 14, xp: 3100, streak: 21, badges: 10, trend: 'up' },
    { rank: 3, name: 'Kakazu, King', block: '302', level: 13, xp: 2890, streak: 19, badges: 9, trend: 'stable' },
    { rank: 4, name: 'Rejano, Caleb', block: '304', level: 12, xp: 2650, streak: 15, badges: 8, trend: 'down' },
    { rank: 5, name: 'Flores, Maria', block: '301', level: 11, xp: 2420, streak: 12, badges: 7, trend: 'up' },
    { rank: 6, name: 'Santos, John', block: '305', level: 10, xp: 2180, streak: 10, badges: 6, trend: 'stable' },
    { rank: 7, name: 'Dela Cruz, Juan', block: '302', level: 9, xp: 1950, streak: 8, badges: 5, trend: 'up' },
    { rank: 8, name: 'Reyes, Ana', block: '303', level: 8, xp: 1720, streak: 6, badges: 4, trend: 'down' },
    { rank: 9, name: 'Cruz, Miguel', block: '306', level: 7, xp: 1490, streak: 5, badges: 3, trend: 'stable' },
    { rank: 10, name: 'Torres, Sofia', block: '307', level: 6, xp: 1260, streak: 4, badges: 2, trend: 'up' },
  ];

  const filteredData = leaderboardData.filter(student => {
    if (blockFilter === 'all') return true;
    return student.block === blockFilter;
  });

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const timeFilters = [
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'alltime', label: 'All Time' }
  ];

  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/30';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30';
    return 'bg-[#1e293b] text-gray-300';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp size={14} className="text-green-400" />;
    if (trend === 'down') return <TrendingUp size={14} className="text-red-400 rotate-180" />;
    return <span className="text-gray-500 text-xs">―</span>;
  };

  // Find current user's rank for highlight
  const currentUser = leaderboardData.find(s => s.isCurrentUser);
  const currentUserRank = currentUser?.rank || null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eab308]/10 rounded-xl">
            <Trophy size={24} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-gray-400 text-sm">Compete with your classmates and climb the ranks!</p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 2nd Place */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-6 text-center order-2 md:order-1">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-black">2</span>
          </div>
          <h3 className="font-bold text-white mb-1">{filteredData[1]?.name || '---'}</h3>
          <p className="text-sm text-gray-400">Block {filteredData[1]?.block}</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-[#eab308]">
            <Zap size={14} />
            <span className="font-bold">{filteredData[1]?.xp} XP</span>
          </div>
        </div>

        {/* 1st Place */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl border border-yellow-500/30 p-6 text-center order-1 md:order-2 relative">
          <Crown size={20} className="absolute top-4 right-4 text-yellow-400" />
          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <span className="text-3xl font-bold text-black">1</span>
          </div>
          <h3 className="font-bold text-white mb-1 text-lg">{filteredData[0]?.name || '---'}</h3>
          <p className="text-sm text-gray-400">Block {filteredData[0]?.block}</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-[#eab308]">
            <Zap size={16} />
            <span className="font-bold text-lg">{filteredData[0]?.xp} XP</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 text-orange-400">
            <Flame size={14} />
            <span className="text-sm">{filteredData[0]?.streak} day streak</span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-6 text-center order-3">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">3</span>
          </div>
          <h3 className="font-bold text-white mb-1">{filteredData[2]?.name || '---'}</h3>
          <p className="text-sm text-gray-400">Block {filteredData[2]?.block}</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-[#eab308]">
            <Zap size={14} />
            <span className="font-bold">{filteredData[2]?.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        {/* Time Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Period:</span>
          <div className="flex bg-[#0f172a] p-1 rounded-lg">
            {timeFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setTimeFilter(filter.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  timeFilter === filter.value 
                    ? 'bg-[#eab308] text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Block Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Block:</span>
          <select 
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
          </select>
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {filteredData.length} students
          </span>
          <span className="flex items-center gap-1 text-[#eab308]">
            <Zap size={14} />
            Avg: {Math.round(filteredData.reduce((sum, s) => sum + s.xp, 0) / filteredData.length)} XP
          </span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0f172a]/50 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Rank</th>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold hidden md:table-cell">Block</th>
                <th className="p-4 font-semibold">Level</th>
                <th className="p-4 font-semibold">XP</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Streak</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Badges</th>
                <th className="p-4 font-semibold text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredData.map((student, idx) => (
                <tr 
                  key={student.rank} 
                  className={`hover:bg-[#2a3850]/50 transition ${
                    student.isCurrentUser ? 'bg-[#eab308]/5 border-l-4 border-[#eab308]' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(student.rank)}`}>
                      {student.rank}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        student.rank <= 3 ? 'bg-gradient-to-br from-purple-500 to-blue-600' : 'bg-[#1e293b]'
                      }`}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className={`font-medium ${student.isCurrentUser ? 'text-[#eab308]' : 'text-white'}`}>
                          {student.name}
                          {student.isCurrentUser && <span className="ml-2 text-xs text-[#eab308]">(You)</span>}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {Array.from({ length: Math.min(student.badges, 3) }, (_, i) => (
                            <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />
                          ))}
                          {student.badges > 3 && <span className="text-gray-500">+{student.badges - 3}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300 hidden md:table-cell">
                    <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs">
                      Block {student.block}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{student.level}</span>
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-[#eab308] flex items-center gap-1">
                      <Zap size={14} />
                      {student.xp.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame size={14} />
                      {student.streak} days
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 hidden lg:table-cell">
                    <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs">
                      {student.badges} badges
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {getTrendIcon(student.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Rank Card */}
      {currentUser && (
        <div className="bg-gradient-to-r from-[#eab308]/10 to-purple-500/10 p-6 rounded-xl border border-[#eab308]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white">Your Ranking</h3>
                <p className="text-gray-400 text-sm">Keep pushing to climb higher!</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#eab308]">#{currentUserRank}</div>
              <div className="text-sm text-gray-400">out of {filteredData.length} students</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default StudentLeaderboard;