import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Code, Zap } from 'lucide-react';

function Problems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch from API: GET /api/problems
    // For now, we use local storage or mock data since the API is POST-only for creation
    // We will simulate a list for now.
    const mockProblems = JSON.parse(localStorage.getItem('instructor_problems') || '[]');
    setProblems(mockProblems);
    setLoading(false);
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quest Log</h1>
          <p className="text-slate-400">Manage and monitor your active coding challenges.</p>
        </div>
        <button 
          onClick={() => navigate('/instructor/create')}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20"
        >
          <PlusCircle size={20} />
          Forge New Quest
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading quests...</div>
      ) : problems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
          <Code size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Quests Found</h3>
          <p className="text-slate-400 mb-6">You haven't created any problems yet.</p>
          <button 
            onClick={() => navigate('/instructor/create')}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Create Your First Quest
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {problems.map((p) => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between hover:border-slate-700 transition">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                  <Code size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{p.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Zap size={14} className="text-yellow-400" /> {p.xp_reward} XP
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                      p.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {p.difficulty}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                  <Edit size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Problems;