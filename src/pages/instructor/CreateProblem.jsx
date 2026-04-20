import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, X } from 'lucide-react';

function InstructorCreateProblem() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy',
    topic: '',
    starter_code: '',
    test_cases: [{ input: '', expected: '' }],
    xp_reward: 100,
    assigned_block: ''
  });

  const addTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input: '', expected: '' }]
    });
  };

  const removeTestCase = (index) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index)
    });
  };

  const updateTestCase = (index, field, value) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index][field] = value;
    setFormData({ ...formData, test_cases: newTestCases });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();

      if (response.ok) {
        showNotification('success', 'Problem created successfully!');
        navigate('/instructor/problems');
      } else {
        showNotification('error', `Error: ${data.msg}`);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        ${type === 'success' ? '✓' : '✗'}
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Problem</h1>
        <p className="text-slate-400">Design a coding challenge for your students</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Problem Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g., Hello World Challenge"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                rows="4"
                placeholder="Describe the problem requirements..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty <span className="text-red-500">*</span></label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Topic</label>
                <input
                  type="text"
                  placeholder="e.g., Arrays, Loops, Functions"
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">XP Reward</label>
              <input
                type="number"
                placeholder="100"
                value={formData.xp_reward}
                onChange={(e) => setFormData({...formData, xp_reward: parseInt(e.target.value) || 100})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Starter Code */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Starter Code</h3>
          <textarea
            rows="6"
            placeholder="# Provide starter code for students...
def solve_problem():
    # Your code here
    pass"
            value={formData.starter_code}
            onChange={(e) => setFormData({...formData, starter_code: e.target.value})}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Test Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Test Cases</h3>
            <button
              type="button"
              onClick={addTestCase}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-lg text-blue-400 transition"
            >
              <Plus size={16} />
              Add Test Case
            </button>
          </div>

          <div className="space-y-4">
            {formData.test_cases.map((testCase, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Test Case {index + 1}</span>
                  {formData.test_cases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="p-1 text-red-400 hover:bg-red-500/10 rounded transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Input</label>
                    <textarea
                      rows="2"
                      placeholder="Input for this test case..."
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Expected Output</label>
                    <textarea
                      rows="2"
                      placeholder="Expected output..."
                      value={testCase.expected}
                      onChange={(e) => updateTestCase(index, 'expected', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/instructor/problems')}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition font-bold flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Problem
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InstructorCreateProblem;