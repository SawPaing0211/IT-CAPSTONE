import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Trophy, 
  Clock, 
  Zap, 
  TrendingUp, 
  Award,
  Play,
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react';

function StudentDashboard() {
  const navigate = useNavigate();
  
  // Mock Data
  const activeQuests = [
    { 
      id: 1, 
      title: 'Array Sorting Master', 
      difficulty: 'Medium', 
      xpReward: 150, 
      status: 'in-progress', 
      progress: 65,
      timeLeft: '2 days',
      description: 'Complete 5 sorting algorithm challenges'
    },
    { 
      id: 2, 
      title: 'Bug Hunter', 
      difficulty: 'Easy', 
      xpReward: 75, 
      status: 'available', 
      progress: 0,
      timeLeft: '5 days',
      description: 'Find and fix bugs in 3 code snippets'
    },
    { 
      id: 3, 
      title: 'Speed Coder', 
      difficulty: 'Hard', 
      xpReward: 200, 
      status: 'available', 
      progress: 0,
      timeLeft: '1 week',
      description: 'Solve 10 problems under time limit'
    },
  ];

  const recentActivity = [
    { id: 1, type: 'completed', title: 'String Reversal', xp: 50, time: '2 hours ago', icon: CheckCircle2, color: 'text-green-500' },
    { id: 2, type: 'achievement', title: 'First Blood Badge', xp: 100, time: '1 day ago', icon: Award, color: 'text-yellow-500' },
    { id: 3, type: 'failed', title: 'Binary Search', xp: 0, time: '2 days ago', icon: AlertCircle, color: 'text-red-500' },
    { id: 4, type: 'completed', title: 'Loop Basics', xp: 75, time: '3 days ago', icon: CheckCircle2, color: 'text-green-500' },
  ];

  const recommendedProblems = [
    { id: 1, title: 'Palindrome Checker', difficulty: 'Easy', xp: 50, completionRate: 85 },
    { id: 2, title: 'Two Sum Problem', difficulty: 'Medium', xp: 100, completionRate: 62 },
    { id: 3, title: 'Merge Sort', difficulty: 'Hard', xp: 150, completionRate: 34 },
  ];

  const quickStats = {
    problemsCompleted: 23,
    totalXp: 2450,
    averageScore: 78,
    currentStreak: 15
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Hard': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#eab308]/20 to-purple-500/20 p-8 rounded-2xl border border-[#eab308]/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Ready to Code, Niño?</h2>
            <p className="text-gray-300">You're on a {quickStats.currentStreak}-day streak! Keep it up! 🔥</p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <div className="text-4xl font-bold text-[#eab308]">{quickStats.problemsCompleted}</div>
              <div className="text-sm text-gray-400">Problems Solved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Active Quests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Quests */}
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Target size={20} className="text-[#eab308]" />
                Active Quests
              </h3>
              <button className="text-sm text-[#eab308] hover:text-yellow-400 font-medium">View All</button>
            </div>
            
            <div className="space-y-4">
              {activeQuests.map((quest) => (
                <div key={quest.id} className="bg-[#0f172a] rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-white group-hover:text-[#eab308] transition-colors">{quest.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(quest.difficulty)}`}>
                          {quest.difficulty}
                        </span>
                        {quest.status === 'in-progress' && (
                          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{quest.description}</p>
                      
                      {/* Progress Bar */}
                      {quest.progress > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{quest.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#eab308] to-yellow-400 transition-all duration-300"
                              style={{ width: `${quest.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-400">
                          <span className="flex items-center gap-1">
                            <Zap size={14} className="text-[#eab308]" />
                            {quest.xpReward} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {quest.timeLeft}
                          </span>
                        </div>
                        
                        <button 
                          onClick={() => navigate(`/student/challenge/${quest.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition"
                        >
                          <Play size={14} />
                          {quest.status === 'in-progress' ? 'Continue' : 'Start'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Problems */}
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Star size={20} className="text-[#eab308]" />
                Recommended for You
              </h3>
              <span className="text-xs text-gray-400">Based on your skill level</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedProblems.map((problem) => (
                <div key={problem.id} className="bg-[#0f172a] rounded-lg border border-gray-800 p-4 hover:border-[#eab308]/50 transition cursor-pointer group">
                  <h4 className="font-bold text-white mb-2 group-hover:text-[#eab308] transition-colors">{problem.title}</h4>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-[#eab308]">
                      <Zap size={14} />
                      {problem.xp} XP
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {problem.completionRate}% of students solved this
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Activity */}
        <div className="space-y-6">
          
          {/* Quick Stats */}
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#eab308]" />
              Your Stats
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
                <span className="text-gray-400 text-sm">Problems Completed</span>
                <span className="font-bold text-white">{quickStats.problemsCompleted}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
                <span className="text-gray-400 text-sm">Total XP Earned</span>
                <span className="font-bold text-[#eab308]">{quickStats.totalXp}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
                <span className="text-gray-400 text-sm">Average Score</span>
                <span className="font-bold text-green-400">{quickStats.averageScore}%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
                <span className="text-gray-400 text-sm">Current Streak</span>
                <span className="font-bold text-orange-500 flex items-center gap-1">
                  <Clock size={14} />
                  {quickStats.currentStreak} days
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
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

          {/* Daily Challenge */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Award size={20} className="text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-white">Daily Challenge</h4>
                <p className="text-xs text-gray-400">Complete by midnight for bonus XP!</p>
              </div>
            </div>
            
            <div className="bg-[#0f172a] p-4 rounded-lg mb-4">
              <div className="font-medium text-white mb-2">Recursion Basics</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-400">Hard</span>
                <span className="text-[#eab308] flex items-center gap-1">
                  <Zap size={14} />
                  200 XP
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/student/challenge/daily')}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition"
            >
              Start Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;