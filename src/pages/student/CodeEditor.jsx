import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Play, CheckCircle, AlertCircle, 
  Terminal, Code, Zap, Trophy, Clock,
  ChevronRight, Sparkles, Loader2
} from 'lucide-react';
import Editor from '@monaco-editor/react';

function CodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // description, testcases

  useEffect(() => {
    fetchProblem();
  }, [id]);

  const fetchProblem = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/problems/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProblem(data);
        setCode(data.starter_code || '');
      }
    } catch (err) {
      console.error('Error fetching problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setOutput(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: parseInt(id),
          code: code
        })
      });
      
      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setOutput({ error: 'Failed to submit code' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading quest...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
            <AlertCircle size={48} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Quest Not Found</h2>
          <p className="text-slate-400 mb-6">This problem doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold rounded-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{problem.title}</h1>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs border ${
                  problem.difficulty === 'Easy' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                  problem.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'
                }`}>{problem.difficulty}</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap size={14} className="text-yellow-400" /> {problem.xp_reward} XP
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {submitting ? 'Testing...' : 'Submit Code'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          
          {/* Left Panel - Problem Description */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button 
                onClick={() => setActiveTab('description')}
                className={`px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'description' 
                    ? 'bg-yellow-500/10 text-yellow-400 border-b-2 border-yellow-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal size={16} className="inline mr-2" />
                Description
              </button>
              <button 
                onClick={() => setActiveTab('testcases')}
                className={`px-6 py-3 text-sm font-medium transition ${
                  activeTab === 'testcases' 
                    ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code size={16} className="inline mr-2" />
                Test Cases
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'description' ? (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4">Problem Description</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 whitespace-pre-wrap">{problem.description}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4">Test Cases</h2>
                  <div className="space-y-4">
                    {problem.test_cases && JSON.parse(problem.test_cases).map((test, idx) => (
                      <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={16} className="text-purple-400" />
                          <span className="text-sm font-semibold text-white">Test Case {idx + 1}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-slate-500">Input:</span>
                            <code className="ml-2 text-green-400">{test.input}</code>
                          </div>
                          <div>
                            <span className="text-slate-500">Expected Output:</span>
                            <code className="ml-2 text-yellow-400">{test.expected}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Code Editor */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-blue-400" />
                <span className="text-sm font-medium text-white">Solution.py</span>
              </div>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value)}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>

        {/* Output Panel */}
        {output && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Terminal size={18} className="text-green-400" />
                Submission Results
              </h3>
              {output.status === 'passed' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle size={18} className="text-green-400" />
                  <span className="text-green-400 font-semibold">All Tests Passed!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400" />
                  <span className="text-red-400 font-semibold">Some Tests Failed</span>
                </div>
              )}
            </div>
            <div className="p-6">
              {output.results && (
                <div className="space-y-3">
                  {output.results.map((result, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      result.status === 'passed' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : result.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">Test Case {idx + 1}</span>
                        {result.status === 'passed' ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : result.status === 'error' ? (
                          <AlertCircle size={16} className="text-red-400" />
                        ) : (
                          <AlertCircle size={16} className="text-red-400" />
                        )}
                      </div>
                      {result.error ? (
                        <p className="text-red-400 text-sm">{result.error}</p>
                      ) : (
                        <div className="text-sm text-slate-300">
                          <p>Expected: <code className="text-yellow-400">{result.expected}</code></p>
                          <p>Got: <code className={result.actual === result.expected ? 'text-green-400' : 'text-red-400'}>{result.actual}</code></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {output.xp_earned > 0 && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy size={24} className="text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-bold">Quest Completed!</p>
                      <p className="text-yellow-300 text-sm">You earned {output.xp_earned} XP</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/student/dashboard')}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CodeEditor;