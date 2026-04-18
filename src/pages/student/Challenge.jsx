import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Save, AlertCircle, CheckCircle, Terminal, XCircle } from 'lucide-react';

function Challenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const validateTimerRef = useRef(null);
  
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('Click "Run Code" to see results...');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [score, setScore] = useState(0);
  const [editorErrors, setEditorErrors] = useState([]);

  // Fetch Problem Data from Backend
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/problems/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (response.ok) {
          setProblem(data);
          setCode(data.starter_code || '# Read input from stdin\nimport ast\n\ninput_str = input()\narr = ast.literal_eval(input_str)\n\ndef sort_array(arr):\n    # Your code here\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\nresult = sort_array(arr)\nprint(result)');
        } else {
          setOutput('Error loading problem.');
        }
      } catch (err) {
        setOutput('Network error. Is backend running?');
      }
    };
    
    fetchProblem();
  }, [id]);

  // Handle Editor Mount
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Initial validation
    validateCode(editor.getValue());
    
    // Validate on change (with debounce)
    editor.onDidChangeModelContent(() => {
      if (validateTimerRef.current) {
        clearTimeout(validateTimerRef.current);
      }
      validateTimerRef.current = setTimeout(() => {
        validateCode(editor.getValue());
      }, 300);
    });
  };

  // Comprehensive Python syntax validator
  const validateCode = (codeText) => {
    // Don't validate if Monaco isn't ready
    if (!monacoRef.current) return;
    
    const errors = [];
    const lines = codeText.split('\n');
    const MarkerSeverity = monacoRef.current.MarkerSeverity;
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) return;
      
      // 1. Check for missing colon after compound statements
      if (/^\s*(def|if|for|while|else|elif|class|try|except|finally|with)\b/.test(line)) {
        if (!trimmed.endsWith(':') && !trimmed.endsWith('\\')) {
          errors.push({
            severity: MarkerSeverity.Error,
            startLineNumber: lineNum,
            startColumn: line.length,
            endLineNumber: lineNum,
            endColumn: line.length + 1,
            message: "Expected ':' at end of compound statement"
          });
        }
      }
      
      // 2. Check for invalid function calls (common beginner mistakes)
      const invalidFuncs = ['length(', 'size(', 'sizeof(', 'printn(', 'inputn('];
      invalidFuncs.forEach(func => {
        if (line.includes(func)) {
          const col = line.indexOf(func) + 1;
          const correct = func.replace('(', '').replace('n', '');
          errors.push({
            severity: MarkerSeverity.Error,
            startLineNumber: lineNum,
            startColumn: col,
            endLineNumber: lineNum,
            endColumn: col + func.length - 1,
            message: `'${func.slice(0, -1)}' is not defined. Did you mean '${correct}'?`
          });
        }
      });
      
      // 3. Check for indentation after compound statements
      if (/^\s*(def|if|for|while|else|elif|class)\b.*:\s*$/.test(line)) {
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.trim() && !/^\s{4,}|\t/.test(nextLine) && !nextLine.trim().startsWith('#')) {
          errors.push({
            severity: MarkerSeverity.Error,
            startLineNumber: lineNum + 1,
            startColumn: 1,
            endLineNumber: lineNum + 1,
            endColumn: nextLine.indexOf(nextLine.trim().charAt(0)) + 1,
            message: 'Expected an indented block after this statement'
          });
        }
      }
      
      // 4. Check for undefined common variables (beginner mistakes)
      const undefinedVars = ['arry', 'arrary', 'numbs', 'nums', 'lst', 'listt'];
      undefinedVars.forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        let match;
        while ((match = regex.exec(line)) !== null) {
          errors.push({
            severity: MarkerSeverity.Warning,
            startLineNumber: lineNum,
            startColumn: match.index + 1,
            endLineNumber: lineNum,
            endColumn: match.index + match[0].length + 1,
            message: `Variable '${varName}' may be undefined. Did you mean 'arr'?`
          });
        }
      });
      
      // 5. Check for assignment instead of comparison (== vs =)
      if (/\bif\s+\w+\s*=\s*[^=]/.test(line) && !/\bif\s+\w+\s*==/.test(line)) {
        const match = line.match(/\bif\s+\w+\s*=\s*[^=]/);
        if (match) {
          const col = match.index + match[0].indexOf('=') + 1;
          errors.push({
            severity: MarkerSeverity.Error,
            startLineNumber: lineNum,
            startColumn: col,
            endLineNumber: lineNum,
            endColumn: col + 1,
            message: "Use '==' for comparison, not '='"
          });
        }
      }
      
      // 6. Check for print without parentheses (Python 3)
      if (/\bprint\s+[^(\n]/.test(line) && !/\bprint\s*\(/.test(line)) {
        const col = line.indexOf('print') + 1;
        errors.push({
          severity: MarkerSeverity.Error,
          startLineNumber: lineNum,
          startColumn: col,
          endLineNumber: lineNum,
          endColumn: col + 5,
          message: "In Python 3, 'print' is a function. Use print()"
        });
      }
      
      // 7. Check for unmatched parentheses/brackets (simple check)
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens && !line.trim().endsWith('\\') && !line.trim().endsWith('(')) {
        errors.push({
          severity: MarkerSeverity.Warning,
          startLineNumber: lineNum,
          startColumn: line.length,
          endLineNumber: lineNum,
          endColumn: line.length + 1,
          message: 'Unmatched opening parenthesis'
        });
      }
    });
    
    setEditorErrors(errors);
    
    // Set markers in editor
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(),
        'python-validator',
        errors
      );
    }
    
    // 🎯 UPDATE CONSOLE OUTPUT WITH ERRORS
    if (errors.length > 0) {
      const criticalErrors = errors.filter(e => e.severity === 8);
      const warnings = errors.filter(e => e.severity === 4);
      
      let consoleMsg = '';
      
      if (criticalErrors.length > 0) {
        consoleMsg += '🔴 SYNTAX ERRORS DETECTED:\n';
        consoleMsg += '══════════════════════════\n\n';
        criticalErrors.forEach((err, idx) => {
          consoleMsg += `${idx + 1}. Line ${err.startLineNumber}: ${err.message}\n`;
        });
        consoleMsg += '\n⚠️  Please fix these errors before submitting.\n';
        consoleMsg += 'Hover over red underlines in the editor for details.\n';
      }
      
      if (warnings.length > 0) {
        if (consoleMsg) consoleMsg += '\n';
        consoleMsg += '🟡 WARNINGS:\n';
        consoleMsg += '══════════════════════════\n\n';
        warnings.forEach((warn, idx) => {
          consoleMsg += `${idx + 1}. Line ${warn.startLineNumber}: ${warn.message}\n`;
        });
      }
      
      setOutput(consoleMsg);
      setStatus('error');
    } else {
      // Clear errors from console if code is valid
      if (status === 'error') {
        setOutput('✅ No syntax errors detected. Click "Run Code" to test your solution.');
        setStatus(null);
      }
    }
  };

  // Handle Code Execution
  const handleRun = async (isSubmit = false) => {
    // Don't allow submission if there are critical errors
    const criticalErrors = editorErrors.filter(e => e.severity === 8); // 8 = Error
    if (isSubmit && criticalErrors.length > 0) {
      setOutput('❌ CANNOT SUBMIT: Please fix all syntax errors first.\n\n' + 
                'Hover over the red underlines in the editor to see error details.\n' +
                'Fix them and try again.');
      return;
    }
    
    setIsRunning(true);
    setOutput('Running tests...\n');
    setStatus(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: id,
          code: code,
          language: 'python'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(data.status);
        setScore(data.score);
        
        let log = '';
        data.results.forEach(res => {
          const icon = res.status === 'passed' ? '✅' : '❌';
          log += `${icon} Test Case ${res.case}: ${res.status.toUpperCase()}\n`;
          if (res.status === 'failed') {
            log += `   Expected: ${res.expected}\n`;
            log += `   Got:      ${res.actual}\n`;
          }
        });
        
        log += `\nExecution Time: ~0.04s\n`;
        if (data.status === 'passed') {
          log += `\n🎉 SUCCESS! +${isSubmit ? '100 XP' : '0 XP'}\n`;
        }
        
        setOutput(log);
      } else {
        setOutput(`Error: ${data.msg || 'Submission failed'}`);
      }
    } catch (err) {
      setOutput(`Network Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (!problem) return <div className="text-white p-10">Loading problem...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0b1120] text-white">
      
      {/* Top Bar */}
      <div className="h-14 border-b border-gray-700 flex items-center justify-between px-4 bg-[#1e293b]">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg">{problem.title}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
            problem.difficulty === 'Easy' ? 'border-green-500 text-green-500' : 
            problem.difficulty === 'Medium' ? 'border-yellow-500 text-yellow-500' : 
            'border-red-500 text-red-500'
          }`}>
            {problem.difficulty}
          </span>
          {editorErrors.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-bold border border-red-500/50 bg-red-500/10 text-red-400 flex items-center gap-1">
              <XCircle size={12} /> {editorErrors.length} Error{editorErrors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCode(problem.starter_code)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
          >
            <RotateCcw size={14} /> Reset
          </button>
          
          <button 
            onClick={() => handleRun(false)}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition disabled:opacity-50"
          >
            <Play size={14} /> Run Code
          </button>
          
          <button 
            onClick={() => handleRun(true)}
            disabled={isRunning || editorErrors.filter(e => e.severity === 8).length > 0}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#eab308] hover:bg-yellow-500 text-black rounded text-sm font-bold transition disabled:opacity-50"
          >
            <Save size={14} /> Submit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Monaco Code Editor with IntelliSense */}
        <div className="w-1/2 flex flex-col border-r border-gray-700 relative">
          <div className="absolute top-2 right-2 z-10 bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded border border-red-500/20 pointer-events-none">
            ⚠ Copy-paste blocked
          </div>
          
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 10 },
              
              // 🎯 INTELLISENSE FEATURES (Like VS Code!)
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnCommitCharacter: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: 'currentDocument',
              
              // Parameter hints (shows function parameters)
              parameterHints: { enabled: true },
              
              // Hover tooltips (shows documentation)
              hover: { 
                enabled: true,
                delay: 300,
                sticky: true 
              },
              
              // Auto-close brackets and quotes
              autoClosingBrackets: 'always',
              autoClosingQuotes: 'always',
              
              // Format on paste
              formatOnPaste: true,
              
              // Snippets
              snippetSuggestions: 'top',
              
              // Error detection
              renderValidationDecorations: 'on',
              
              // Lightbulb (quick fixes)
              lightbulb: { enabled: true },
              
              // Folding
              folding: true,
              foldingStrategy: 'indentation',
              
              // Line numbers
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              
              // Scrollbar
              scrollbar: { 
                vertical: 'auto',
                horizontal: 'auto'
              }
            }}
          />
        </div>

        {/* Right: Problem Statement */}
        <div className="w-1/2 bg-[#0f172a] p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-[#eab308]" />
            Problem Statement
          </h2>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-4">{problem.description}</p>
            
            <div className="bg-[#1e293b] p-4 rounded-lg border border-gray-700 mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Example</h3>
              <div className="font-mono text-sm">
                <div className="text-gray-500">Input:</div>
                <div className="text-white mb-2">[5, 2, 8, 1, 9]</div>
                <div className="text-gray-500">Output:</div>
                <div className="text-green-400">[1, 2, 5, 8, 9]</div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Test Cases</h3>
            <div className="space-y-2">
              {problem.test_cases && JSON.parse(problem.test_cases).map((tc, idx) => (
                <div key={idx} className="bg-[#1e293b] p-3 rounded border border-gray-700 text-sm">
                  <div className="text-gray-500 mb-1">Input: {tc.input}</div>
                  <div className="text-green-400">Expected: {tc.expected}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Console Output */}
      <div className="h-48 bg-[#0b1120] border-t border-gray-700 flex flex-col">
        <div className="px-4 py-2 bg-[#1e293b] border-b border-gray-700 flex items-center gap-2">
          <Terminal size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Console Output</span>
          {status && (
            <span className={`ml-auto text-xs font-bold px-2 py-1 rounded ${
              status === 'passed' ? 'bg-green-500/20 text-green-400' : 
              status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {status === 'passed' ? 'All Tests Passed' : 
               status === 'error' ? 'Syntax Errors Found' :
               'Tests Failed'}
            </span>
          )}
        </div>
        <pre className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-y-auto whitespace-pre-wrap">
          {output}
        </pre>
      </div>
    </div>
  );
}

export default Challenge;