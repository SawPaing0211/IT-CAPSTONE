import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, LogIn, User, Lock, Sword, Sparkles, Loader2 } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Save Token and User Info securely
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect based on role
        if (data.user.role === 'student') {
          navigate('/student/dashboard');
        } else if (data.user.role === 'instructor') {
          navigate('/instructor/dashboard');
        } else if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        // Gamified error messages
        if (data.msg?.includes('Invalid')) {
          setError('⚔️ Wrong credentials! Check your magic scroll and shield.');
        } else if (data.msg?.includes('Missing')) {
          setError(' Empty fields! Fill all scrolls to enter.');
        } else if (data.msg?.includes('maintenance')) {
          setError(' The realm is under maintenance. Try again later.');
        } else {
          setError(data.msg || '🌐 Connection failed! Is the server running?');
        }
      }
    } catch (err) {
      console.error(err);
      setError('🌐 Connection failed! Is the server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-purple-600 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <Sword size={64} className="relative text-yellow-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            ⚔️ Welcome Back, Adventurer
          </h1>
          <p className="text-slate-400">
            Enter your credentials to continue your quest
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 animate-shake">
            <Sparkles size={20} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User size={16} className="inline mr-2 text-purple-400" />
              Magic Scroll (Email)
            </label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hero@example.com"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                required
              />
              <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Lock size={16} className="inline mr-2 text-green-400" />
              Shield Password
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
                required
              />
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 text-white font-bold rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Unlocking Portal...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Enter the Realm
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Not an Adventurer yet?{' '}
            <Link to="/register" className="text-yellow-400 hover:text-yellow-300 font-semibold hover:underline">
              Create Account
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default Login;