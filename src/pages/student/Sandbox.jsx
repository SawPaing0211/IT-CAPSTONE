import { useState } from 'react';
import { Play, Trash2, Terminal, Code, Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';

function Sandbox() {
  const [code, setCode] = useState('# Welcome to the Sandbox!\n# Experiment freely here. No XP, no penalties.\n\nprint("Hello, Forge.Dev!")');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState('python');

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/sandbox/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, language, input })
      });

      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setOutput({ success: false, error: 'Failed to connect to the sandbox server.' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setInput('');
    setOutput(null);
  };

  const loadSnippet = (type) => {
    if (type === 'hello') setCode('print("Hello, World!")');
    if (type === 'loop') setCode('for i in range(5):\n    print(f"Count: {i}")');
    if (type === 'func') setCode('def add(a, b):\n    return a + b\n\nprint(add(5, 10))');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Terminal size={24} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sandbox Mode</h1>
            <p className="text-xs text-slate-400">Safe playground • No XP • No Penalties</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ UPDATED Language Selector: Python, Java, C# ONLY */}
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
          >
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option> {/* ✅ Changed from C++ */}
          </select>

          {/* Snippets */}
          <div className="hidden md:flex gap-2">
            <button onClick={() => loadSnippet('hello')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition">Hello</button>
            <button onClick={() => loadSnippet('loop')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition">Loop</button>
            <button onClick={() => loadSnippet('func')} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition">Function</button>
          </div>

          <button onClick={handleClear} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Clear All">
            <Trash2 size={20} />
          </button>
          
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <RotateCcw size={18} className="animate-spin" /> : <Play size={18} />}
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Main Area: Editor + Console */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        
        {/* Editor */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Code size={14} /> editor.{language === 'csharp' ? 'cs' : language === 'java' ? 'java' : 'py'}
            </span>
            <span className="text-xs text-slate-500">{code.length} chars</span>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              // ✅ UPDATED Language Mapping for Monaco Editor
              language={
                language === 'csharp' ? 'csharp' : 
                language === 'java' ? 'java' : 
                'python'
              }
              value={code}
              onChange={(val) => setCode(val || '')}
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
          
          {/* Optional Input for Code */}
          <div className="p-3 border-t border-white/10 bg-slate-900/30">
            <label className="text-xs text-slate-400 block mb-1">Standard Input (Optional):</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input here if your code requires it..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 font-mono focus:border-green-500 outline-none resize-none h-20"
            />
          </div>
        </div>

        {/* Console Output */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-slate-900/80 border-b border-white/5 flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Terminal size={14} /> Console Output
            </span>
            {output && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                output.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {output.success ? 'Success' : 'Error'}
              </span>
            )}
          </div>
          
          <div className="flex-1 p-4 overflow-auto font-mono text-sm custom-scrollbar">
            {!output ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                <Terminal size={48} className="mb-4" />
                <p>Click "Run Code" to see output here</p>
              </div>
            ) : (
              <>
                {output.error ? (
                  <div className="text-red-400 whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-2 font-bold">
                      <AlertCircle size={16} /> Runtime Error:
                    </div>
                    {output.error}
                  </div>
                ) : (
                  <div className="text-green-400 whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-2 font-bold text-emerald-500">
                      <CheckCircle size={16} /> Output:
                    </div>
                    {output.output || "(No output produced)"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

export default Sandbox;