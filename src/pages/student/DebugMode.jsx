import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Play, CheckCircle, AlertCircle, 
  Terminal, Bug, Zap, Trophy, Clock,
  ChevronRight, Sparkles, Loader2, Wrench, Languages
} from 'lucide-react';
import Editor from '@monaco-editor/react';

function DebugMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python'); // ✅ Added language state
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

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
        // For debug mode, we might want to provide buggy code
        const defaultLang = data.language || 'python';
        setLanguage(defaultLang);
        setCode(data.starter_code || getDefaultStarterCode(defaultLang));
      }
    } catch (err) {
      console.error('Error fetching problem:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStarterCode = (lang) => {
    switch(lang) {
      case 'java': 
        return `public class Main {\n    public static void main(String[] args) {\n        // BUG: Fix this code\n    }\n}`;
      case 'csharp': 
        return `using System;\n\nclass Program {\n    static void Main(string[] args) {\n        // BUG: Fix this code\n    }\n}`;
      default: 
        return `# BUG: Fix this code\ndef solve():\n    pass\n\nsolve()`;
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
          code: code,
          language: language // ✅ Added language to submission
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-pink-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading debug challenge...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
            <Bug size={48} className="text-pink-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Debug Challenge Not Found</h2>
          <p className="text-slate-400 mb-6">This debugging quest doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-lg transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900">
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
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Bug size={24} className="text-pink-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{problem.title}</h1>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-pink-400 font-medium">Debugging Challenge</span>
                  <span className="text-slate-500">•</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                    problem.difficulty === 'Easy' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                    problem.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 'border-red-500/50 text-red-400 bg-red-500/10'
                  }`}>{problem.difficulty}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Zap size={14} className="text-yellow-400" /> {problem.xp_reward} XP
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 text-blue-400">
                    <Languages size={14} /> {language === 'csharp' ? 'C#' : language === 'java' ? 'Java' : 'Python'}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />}
            {submitting ? 'Testing Fix...' : 'Test Fix'}
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
                    ? 'bg-pink-500/10 text-pink-400 border-b-2 border-pink-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal size={16} className="inline mr-2" />
                Bug Description
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
                  <div className="flex items-center gap-3 mb-4">
                    <Bug size={24} className="text-pink-400" />
                    <h2 className="text-lg font-bold text-white">Find and Fix the Bug</h2>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 whitespace-pre-wrap">{problem.description}</p>
                  </div>
                  
                  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Wrench size={20} className="text-yellow-400 mt-0.5" />
                      <div>
                        <h3 className="text-yellow-400 font-semibold mb-1">Debugging Tips:</h3>
                        <ul className="text-sm text-yellow-300 space-y-1 list-disc list-inside">
                          <li>Read the error messages carefully</li>
                          <li>Check for syntax errors and typos</li>
                          <li>Verify variable names and data types</li>
                          <li>Test with different inputs</li>
                        </ul>
                      </div>
                    </div>
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
                <Bug size={18} className="text-pink-400" />
                <span className="text-sm font-medium text-white">BuggyCode.{language === 'csharp' ? 'cs' : language === 'java' ? 'java' : 'py'}</span>
              </div>
              <span className="text-xs text-pink-400 bg-pink-500/10 px-2 py-1 rounded">Contains Bugs</span>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                // ✅ UPDATED: Language Mapping for Monaco
                language={
                  language === 'csharp' ? 'csharp' : 
                  language === 'java' ? 'java' : 
                  'python'
                }
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
                <Terminal size={18} className="text-pink-400" />
                Debug Results
              </h3>
              {output.status === 'passed' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle size={18} className="text-green-400" />
                  <span className="text-green-400 font-semibold">Bug Fixed!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={18} className="text-red-400" />
                  <span className="text-red-400 font-semibold">Still Has Bugs</span>
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
                      <p className="text-yellow-400 font-bold">Bug Squashed!</p>
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

export default DebugMode;