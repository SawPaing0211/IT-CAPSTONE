import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Download, UserPlus, LogOut } from 'lucide-react'; // Added LogOut icon

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Define tabs
  const tabs = [
    { name: 'Overview', path: '/admin/overview' },
    { name: 'Users', path: '/admin/users' },
    { name: 'System Logs', path: '/admin/logs' },
    { name: 'Settings', path: '/admin/settings' },
  ];

  const handleLogout = () => {
    // Clear any stored auth data (mock)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to Landing Page or Login
    navigate('/'); 
    // Optional: alert('Logged out successfully!');
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-white">
      
      {/* Shared Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, Admin Rejano!</h1>
            <p className="text-gray-400 text-sm">System administration & management</p>
          </div>
          
          <div className="flex gap-3">
            {/* Export Report Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg text-sm font-medium transition">
              <Download size={16} /> Export Report
            </button>
            
            {/* Add User Button */}
            <button className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition">
              <UserPlus size={16} /> Add User
            </button>

            {/* NEW: Logout Button */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition"
              title="Log Out"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Shared Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 border-b border-gray-800">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path || (tab.name === 'Overview' && location.pathname === '/admin');
            
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
      </div>

      {/* Page Content */}
      <div className="px-6 pb-6 max-w-7xl mx-auto">
        <Outlet />
      </div>

    </div>
  );
}

export default AdminLayout;