import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sword, Shield, Sparkles, Gamepad2, ChevronRight, UserCheck } from 'lucide-react';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'  // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("⚔️ Swords don't match! Passwords must be the same.");
      return;
    }

    if (formData.password.length < 6) {
      setError("🛡️ Your shield is too weak! Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Save token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Navigate based on role
        if (formData.role === 'student') {
          navigate('/student/dashboard');
        } else if (formData.role === 'instructor') {
          navigate('/instructor');
        } else if (formData.role === 'admin') {
          navigate('/admin');
        }
      } else {
        setError(data.msg || 'Failed to create adventurer');
      }
    } catch (err) {
      setError("🌐 Connection failed! Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <Gamepad2 size={64} className="relative text-yellow-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            ⚔️ Create Your Adventurer
          </h1>
          <p className="text-slate-400">
            Begin your coding journey, brave warrior!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
            <Shield size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Adventurer Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Sword size={16} className="inline mr-2 text-yellow-400" />
              Adventurer Name
            </label>
            <input
              type="text"
              placeholder="Enter your heroic name..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Sparkles size={16} className="inline mr-2 text-purple-400" />
              Magic Scroll (Email)
            </label>
            <input
              type="email"
              placeholder="hero@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
              required
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <UserCheck size={16} className="inline mr-2 text-blue-400" />
              Choose Your Path
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all appearance-none cursor-pointer"
              required
            >
              <option value="student">🎓 Student - Learn to Code</option>
              <option value="instructor">👨‍ Instructor - Teach & Create</option>
              <option value="admin">👑 Admin - Manage the Realm</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Shield size={16} className="inline mr-2 text-green-400" />
              Shield Password
            </label>
            <input
              type="password"
              placeholder="Create a strong shield..."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Shield size={16} className="inline mr-2 text-pink-400" />
              Confirm Shield
            </label>
            <input
              type="password"
              placeholder="Repeat your shield..."
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/20 transition-all"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Forging Character...
              </>
            ) : (
              <>
                Start Adventure
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Already have an adventurer?{' '}
            <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold hover:underline">
              Login Here
            </Link>
          </p>
        </div>
      </div>

      {/* CSS for blob animation */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

export default Register;