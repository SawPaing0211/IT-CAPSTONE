import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Plus, LogOut, MessageSquare, Filter } from 'lucide-react';
import { useState } from 'react';

function InstructorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Global State for Block Filter (Visual only for now, pages handle their own logic)
  const [selectedBlock, setSelectedBlock] = useState('all');

  const tabs = [
    { name: 'Overview', path: '/instructor/overview' },
    { name: 'Courses', path: '/instructor/courses' },
    { name: 'Problems', path: '/instructor/problems' },
    { name: 'Plagiarism', path: '/instructor/plagiarism' },
    { name: 'Analytics', path: '/instructor/analytics' },
    { name: 'Announcements', path: '/instructor/announcements' },
  ];

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      <div className="px-6 pt-6 pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, Prof. Sasan!</h1>
            <p className="text-gray-400 text-sm">Course management & student monitoring</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/instructor/announcements')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg text-sm font-medium transition"
            >
              <MessageSquare size={16} /> Announcements
            </button>
            
            <button 
              onClick={() => navigate('/instructor/create-problem')}
              className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition"
            >
              <Plus size={16} /> Create Problem
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Tabs & Global Filter Row */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 pb-2 border-b border-gray-800">
          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path || (tab.name === 'Overview' && location.pathname === '/instructor');
              
              return (
                <button 
                  key={tab.name}
                  onClick={() => navigate(tab.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-[#eab308] text-black' 
                      : 'bg-[#1e293b] text-gray-400 hover:text-white hover:bg-[#2a3850]'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Global Block Filter Indicator */}
          <div className="flex items-center gap-2 bg-[#1e293b] p-1.5 rounded-lg border border-gray-700">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
              title="Global Block Filter (Visual Demo)"
            >
              {blocks.map(block => (
                <option key={block} value={block} className="bg-[#0b1120]">
                  {block === 'all' ? 'All Blocks' : `Block ${block}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default InstructorLayout;