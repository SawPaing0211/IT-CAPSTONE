import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Play, CheckCircle, AlertCircle, 
  Terminal, Code, Zap, Trophy, Clock,
  ChevronRight, Sparkles, Loader2, Languages, RefreshCw
} from 'lucide-react';
import Editor from '@monaco-editor/react';

function CodeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [error, setError] = useState(null);

  // ✅ UPDATED: Language configuration (Python, Java, C# ONLY)
  const languages = [
    { value: 'python', label: 'Python', ext: '.py' },
    { value: 'java', label: 'Java', ext: '.java' },
    { value: 'csharp', label: 'C#', ext: '.cs' },
  ];

  useEffect(() => {
    if (id) {
      fetchProblem();
    } else {
      setLoading(false);
      setError('No problem selected');
    }
  }, [id]);

  const fetchProblem = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/problems/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProblem(data);
        // Set default language from problem or fallback to python
        const defaultLang = data.language || 'python';
        setLanguage(defaultLang);
        setCode(data.starter_code || getDefaultStarterCode(defaultLang));
      } else {
        setError('Problem not found or you don\'t have access');
        setProblem(null);
      }
    } catch (err) {
      console.error('Error fetching problem:', err);
      setError('Failed to load problem. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStarterCode = (lang) => {
    switch(lang) {
      case 'java': 
        return `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`;
      case 'csharp': 
        return `using System;\n\nclass Program {\n    static void Main(string[] args) {\n        // Write your code here\n    }\n}`;
      default: 
        return `# Write your code here\ndef solve():\n    pass\n\nsolve()`;
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setOutput({ 
        error: 'Please write some code before submitting', 
        status: 'error', 
        results: [] 
      });
      return;
    }

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
          language: language // ✅ Ensure language is sent
        })
      });
      
      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setOutput({ 
        error: 'Failed to submit code. Please try again.', 
        status: 'error', 
        results: [] 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    // Optional: Ask user before resetting code
    if (window.confirm(`Switching to ${newLang} will reset your code. Continue?`)) {
      setCode(getDefaultStarterCode(newLang));
    } else {
      // Revert to previous language if user cancels
      setLanguage(language);
    }
  };

  const getCurrentLangLabel = () => {
    return languages.find(l => l.value === language)?.label || 'Python';
  };

  const handleRetry = () => {
    setOutput(null);
    setCode(problem?.starter_code || getDefaultStarterCode(language));
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

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex p-4 bg-slate-800/50 rounded-2xl mb-4">
            <AlertCircle size={48} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {error === 'No problem selected' ? 'No Quest Selected' : 'Quest Not Found'}
          </h2>
          <p className="text-slate-400 mb-6">
            {error === 'No problem selected' 
              ? 'Please select a problem from your dashboard to start coding.' 
              : error || 'This problem doesn\'t exist or has been removed.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold rounded-lg transition-all hover:shadow-lg"
            >
              Return to Dashboard
            </button>
            {id && (
              <button 
                onClick={fetchProblem}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
              title="Back to Dashboard"
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
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1 text-blue-400">
                  <Languages size={14} /> {getCurrentLangLabel()}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
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
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{problem.description}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4">Test Cases</h2>
                  <div className="space-y-4">
                    {problem.test_cases && JSON.parse(problem.test_cases).map((test, idx) => (
                      <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-white/5 hover:border-white/10 transition">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={16} className="text-purple-400" />
                          <span className="text-sm font-semibold text-white">Test Case {idx + 1}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-slate-500 font-medium">Input:</span>
                            <code className="ml-2 text-green-400 bg-green-900/20 px-2 py-1 rounded">{test.input}</code>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Expected Output:</span>
                            <code className="ml-2 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">{test.expected}</code>
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
            {/* Toolbar with Language Selector */}
            <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-blue-400" />
                <span className="text-sm font-medium text-white">Solution</span>
              </div>
              
              {/* Language Selector */}
              <div className="relative group">
                <select 
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="appearance-none bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 pr-8 focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-700 transition"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 relative">
              <Editor
                height="100%"
                // ✅ UPDATED: Language Mapping for Monaco (Python, Java, C#)
                language={
                  language === 'csharp' ? 'csharp' : 
                  language === 'java' ? 'java' : 
                  'python'
                }
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: language === 'python' ? 4 : 2,
                  quickSuggestions: true,
                  suggestOnTriggerCharacters: true,
                }}
              />
            </div>
          </div>
        </div>

        {/* Output Panel */}
        {output && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Terminal size={18} className="text-green-400" />
                Submission Results
              </h3>
              <div className="flex items-center gap-3">
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
                <button 
                  onClick={handleRetry}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Reset Code
                </button>
              </div>
            </div>
            <div className="p-6">
              {output.results && output.results.length > 0 ? (
                <div className="space-y-3">
                  {output.results.map((result, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      result.status === 'passed' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">Test Case {idx + 1}</span>
                        {result.status === 'passed' ? (
                          <CheckCircle size={16} className="text-green-400" />
                        ) : (
                          <AlertCircle size={16} className="text-red-400" />
                        )}
                      </div>
                      {result.error ? (
                        <div className="text-red-400 text-sm font-mono bg-red-900/20 p-3 rounded">
                          <strong className="text-red-300">Error:</strong> {result.error}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300 font-mono space-y-1">
                          <p>Expected: <code className="text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">{result.expected}</code></p>
                          <p>Got: <code className={`${result.actual === result.expected ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'} px-2 py-1 rounded`}>{result.actual}</code></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No test results available.</p>
                </div>
              )}
              
              {output.xp_earned > 0 && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between animate-pulse-once">
                  <div className="flex items-center gap-3">
                    <Trophy size={24} className="text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-bold">Quest Completed!</p>
                      <p className="text-yellow-300 text-sm">You earned {output.xp_earned} XP</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/student/dashboard')}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition shadow-lg shadow-yellow-500/20"
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