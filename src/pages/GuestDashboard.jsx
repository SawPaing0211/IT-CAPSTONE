import { useNavigate } from 'react-router-dom';

function GuestDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-forge-bg">
      {/* Navbar */}
      <nav className="bg-forge-card border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-forge-accent">FORGE.DEV</h1>
          <div className="space-x-4">
            <button onClick={() => navigate('/')} className="text-gray-300 hover:text-white text-sm">
              Home
            </button>
            <button className="text-gray-300 hover:text-white text-sm">Browse Problems</button>
            <button className="text-gray-300 hover:text-white text-sm">Leaderboard</button>
            <button 
              onClick={() => navigate('/')} 
              className="bg-forge-accent text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-500 transition"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Guest Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Explore Forge.dev as a Guest</h2>
          <p className="text-gray-400">You're browsing in read-only mode. Login to submit code and earn XP!</p>
        </div>

        {/* Sample Problems (View Only) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-forge-card p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-green-600 text-xs px-2 py-1 rounded">Easy</span>
              <span className="text-gray-400 text-sm">Code</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Array Sorting</h3>
            <p className="text-gray-400 text-sm mb-4">Implement a bubble sort algorithm to sort an array in ascending order.</p>
            <button className="w-full py-2 bg-gray-600 rounded-lg cursor-not-allowed opacity-50 text-sm" disabled>
              Login to View
            </button>
          </div>

          <div className="bg-forge-card p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-yellow-600 text-xs px-2 py-1 rounded">Medium</span>
              <span className="text-gray-400 text-sm">Debug</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Fix the Loop</h3>
            <p className="text-gray-400 text-sm mb-4">Find and fix the off-by-one error in this loop function.</p>
            <button className="w-full py-2 bg-gray-600 rounded-lg cursor-not-allowed opacity-50 text-sm" disabled>
              Login to View
            </button>
          </div>

          <div className="bg-forge-card p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="bg-green-600 text-xs px-2 py-1 rounded">Easy</span>
              <span className="text-gray-400 text-sm">Debug</span>
            </div>
            <h3 className="font-bold text-lg mb-2">String Reversal</h3>
            <p className="text-gray-400 text-sm mb-4">Debug the reverse string function to return correct output.</p>
            <button className="w-full py-2 bg-gray-600 rounded-lg cursor-not-allowed opacity-50 text-sm" disabled>
              Login to View
            </button>
          </div>
        </div>

        {/* CTA to Login */}
        <div className="text-center bg-forge-card p-8 rounded-xl border border-gray-700 max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">Ready to Start Coding?</h3>
          <p className="text-gray-400 mb-6">Create an account to submit code, earn XP, and track your progress!</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-forge-accent text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-500 transition"
          >
            Create Free Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuestDashboard;