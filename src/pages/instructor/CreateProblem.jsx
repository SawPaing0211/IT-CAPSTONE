import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle, Code, HelpCircle } from 'lucide-react';

function CreateProblem() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'Easy',
    topic: '',
    starter_code: '# Write your solution here\n\ndef solve():\n    pass',
    test_cases: JSON.stringify([
      { input: "5", expected: "25", case: "Basic Input" }
    ], null, 2),
    xp_reward: 100
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validate JSON
      JSON.parse(formData.test_cases);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Quest forged successfully! It is now live.' });
        
        // Save to local storage for the list view (temporary)
        const existing = JSON.parse(localStorage.getItem('instructor_problems') || '[]');
        existing.push({ id: data.id, ...formData });
        localStorage.setItem('instructor_problems', JSON.stringify(existing));
        
        setTimeout(() => navigate('/instructor/problems'), 2000);
      } else {
        setMessage({ type: 'error', text: data.msg || 'Failed to create quest' });
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMessage({ type: 'error', text: 'Invalid JSON format in Test Cases field.' });
      } else {
        setMessage({ type: 'error', text: 'Network error. Is the backend running?' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-blue-500">Forge</span> New Quest
        </h1>
        <p className="text-slate-400">Define a new coding challenge for your students.</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Quest Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., The Two-Sum Enigma"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty Level</label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">XP Reward</label>
            <input
              name="xp_reward"
              type="number"
              value={formData.xp_reward}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Quest Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              placeholder="Describe the problem, input format, and output format..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none font-mono text-sm"
              required
            />
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Code & Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Code size={16} /> Starter Code (Python)
            </label>
            <textarea
              name="starter_code"
              value={formData.starter_code}
              onChange={handleChange}
              rows="12"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <HelpCircle size={16} /> Test Cases (JSON)
            </label>
            <textarea
              name="test_cases"
              value={formData.test_cases}
              onChange={handleChange}
              rows="12"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 outline-none"
              required
            />
            <p className="text-xs text-slate-500 mt-2">Format: Array of objects {`[{ input, expected, case }]`}</p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={() => navigate('/instructor/problems')}
            className="px-6 py-3 text-slate-400 hover:text-white mr-4 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Forging...' : (
              <>
                <Save size={20} />
                Publish Quest
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateProblem;