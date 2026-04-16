import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Terminal,
  Zap,
  Clock,
  HelpCircle,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight
} from 'lucide-react';

function StudentChallenge() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Mock Problem Data
  const [problem] = useState({
    id: parseInt(id) || 1,
    title: 'Array Sorting Master',
    description: `Write a function to sort an array of integers in ascending order.

**Requirements:**
- Input: An array of integers
- Output: The same array sorted in ascending order
- You cannot use built-in sort functions
- Time complexity should be O(n log n) or better

**Example:**
Input: [5, 2, 8, 1, 9]
Output: [1, 2, 5, 8, 9]

**Constraints:**
- Array length: 1 ≤ n ≤ 10^5
- Element values: -10^9 ≤ value ≤ 10^9`,
    difficulty: 'Medium',
    xpReward: 150,
    timeLimit: 300,
    starterCode: {
      python: `def sort_array(arr):
    # Your code here
    pass

# Test your function
if __name__ == "__main__":
    test_input = [5, 2, 8, 1, 9]
    result = sort_array(test_input)
    print(f"Input: {test_input}")
    print(f"Output: {result}")`,
      java: `public class Solution {
    public static int[] sortArray(int[] arr) {
        // Your code here
        return arr;
    }
    
    public static void main(String[] args) {
        int[] testInput = {5, 2, 8, 1, 9};
        int[] result = sortArray(testInput);
        System.out.println("Input: " + java.util.Arrays.toString(testInput));
        System.out.println("Output: " + java.util.Arrays.toString(result));
    }
}`,
      csharp: `using System;

class Solution {
    static int[] SortArray(int[] arr) {
        // Your code here
        return arr;
    }
    
    static void Main() {
        int[] testInput = {5, 2, 8, 1, 9};
        int[] result = SortArray(testInput);
        Console.WriteLine($"Input: [{string.Join(", ", testInput)}]");
        Console.WriteLine($"Output: [{string.Join(", ", result)}]");
    }
}`
    },
    testCases: [
      { input: '[5, 2, 8, 1, 9]', expected: '[1, 2, 5, 8, 9]' },
      { input: '[1]', expected: '[1]' },
      { input: '[3, 1, 2]', expected: '[1, 2, 3]' }
    ]
  });

  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState(problem.starterCode.python);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(problem.timeLimit);
  const [showProblem, setShowProblem] = useState(true);

  useEffect(() => {
    if (timeLeft > 0 && !submissionResult) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, submissionResult]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput('Compiling and running...\n');
    
    setTimeout(() => {
      const mockOutput = `Input: [5, 2, 8, 1, 9]
Output: [1, 2, 5, 8, 9]
✅ Test Case 1: PASSED
✅ Test Case 2: PASSED  
✅ Test Case 3: PASSED

Execution Time: 0.045s
Memory Used: 12.5 MB`;
      
      setOutput(mockOutput);
      setIsRunning(false);
    }, 1500);
  };

  const handleSubmit = () => {
    setIsRunning(true);
    setOutput('Submitting solution...\n');
    
    setTimeout(() => {
      // Simple validation - check if code has actual logic
      const hasDefOrFunction = code.includes('def ') || code.includes('function') || code.includes('class ');
      const hasReturnOrPrint = code.includes('return') || code.includes('print') || code.includes('console') || code.includes('System.out');
      const hasGarbage = code.includes(';;;;;;;') || code.includes('asdasd') || code.match(/;{4,}/);
      const isTooShort = code.split('\n').filter(line => line.trim()).length < 3;
      
      // Check if it's just the starter code with "pass" or empty
      const isJustPass = code.includes('pass') && !code.includes('for') && !code.includes('while') && !code.includes('sort') && !code.includes('if');
      const isEmpty = code.trim().length < 20;

      if (hasGarbage || isTooShort || isJustPass || isEmpty) {
        // FAILED - Invalid code
        setSubmissionResult({
          status: 'failed',
          message: '❌ Invalid code. Please implement a proper solution.',
          testResults: [
            { case: 1, status: 'failed', expected: '[1, 2, 5, 8, 9]', actual: 'Error: Invalid implementation' },
            { case: 2, status: 'failed', expected: '[1]', actual: 'Error: Invalid implementation' },
            { case: 3, status: 'failed', expected: '[1, 2, 3]', actual: 'Error: Invalid implementation' }
          ]
        });
        setOutput(`❌ Compilation Error or Invalid Logic

Test Case 1: FAILED
  Expected: [1, 2, 5, 8, 9]
  Got: Error - Invalid implementation

Test Case 2: FAILED
  Expected: [1]
  Got: Error - Invalid implementation

Hint: Remove garbage characters and implement proper sorting logic.`);
      } else if (hasDefOrFunction && hasReturnOrPrint) {
        // SUCCESS - Has valid structure
        setSubmissionResult({
          status: 'success',
          message: '🎉 Congratulations! Your solution is correct!',
          xpEarned: problem.xpReward,
          testResults: [
            { case: 1, status: 'passed' },
            { case: 2, status: 'passed' },
            { case: 3, status: 'passed' }
          ]
        });
        setOutput(`✅ All test cases passed!
+${problem.xpReward} XP earned!
Execution Time: 0.045s
Memory Used: 12.5 MB`);
      } else {
        // PARTIAL - Missing logic
        setSubmissionResult({
          status: 'failed',
          message: '❌ Incomplete solution',
          testResults: [
            { case: 1, status: 'failed', expected: '[1, 2, 5, 8, 9]', actual: 'None' },
            { case: 2, status: 'passed', expected: '[1]', actual: '[1]' },
            { case: 3, status: 'failed', expected: '[1, 2, 3]', actual: 'None' }
          ]
        });
        setOutput(`❌ Some test cases failed.

Test Case 1: FAILED
  Expected: [1, 2, 5, 8, 9]
  Got: None

Test Case 2: PASSED
  
Test Case 3: FAILED
  Expected: [1, 2, 3]
  Got: None

Hint: Make sure your function returns the sorted array.`);
      }
      
      setIsRunning(false);
    }, 2000);
  };

  const handleReset = () => {
    setCode(problem.starterCode[selectedLanguage]);
    setOutput('');
    setSubmissionResult(null);
    setTimeLeft(problem.timeLimit);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Hard': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const lineCount = Math.max(code.split('\n').length, 20); // Ensure minimum height

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col bg-[#0b1120]">
      
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/student/dashboard')}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">{problem.title}</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className={`px-2 py-0.5 rounded font-bold border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <span className="flex items-center gap-1 text-[#eab308]">
                <Zap size={12} />
                {problem.xpReward} XP
              </span>
              <span className={`flex items-center gap-1 ${timeLeft < 60 ? 'text-red-400' : 'text-gray-400'}`}>
                <Clock size={12} />
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowProblem(!showProblem)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title={showProblem ? "Hide Problem" : "Show Problem"}
          >
            {showProblem ? <PanelRight size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Main Editor Area - VS Code Style */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Code Editor Section */}
        <div className={`flex-1 flex flex-col ${showProblem ? 'w-2/3' : 'w-full'}`}>
          
          {/* Toolbar */}
          <div className="bg-[#1e293b] border-b border-gray-700 px-4 py-2 flex items-center justify-between shrink-0">
            <select 
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setCode(problem.starterCode[e.target.value]);
              }}
              className="bg-[#0f172a] border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-[#eab308] focus:outline-none"
            >
              <option value="python">Python 3.9</option>
              <option value="java">Java 17</option>
              <option value="csharp">C# .NET 6</option>
            </select>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition"
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <button 
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold transition disabled:opacity-50"
              >
                <Play size={14} />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#eab308] hover:bg-yellow-500 text-black rounded text-sm font-bold transition disabled:opacity-50"
              >
                <Save size={14} />
                Submit
              </button>
            </div>
          </div>

          {/* Editor with Line Numbers - VS Code Style */}
          <div className="flex-1 relative bg-[#0f172a] overflow-hidden flex flex-col">
            {/* Line Numbers + Code Container */}
            <div className="flex-1 flex overflow-hidden">
              {/* Line Numbers Gutter - Fixed Width */}
              <div className="w-12 bg-[#1e293b] border-r border-gray-700 flex flex-col items-end py-4 px-2 text-gray-500 text-sm font-mono select-none shrink-0">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="h-6 leading-6 text-right w-full">
                    {i + 1}
                  </div>
                ))}
              </div>
              
              {/* Code Textarea - Takes Remaining Space */}
              <div className="flex-1 relative overflow-auto">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onPaste={(e) => {
                    e.preventDefault();
                    alert('🚫 Copy-paste is disabled to maintain academic integrity!');
                  }}
                  className="absolute top-0 left-0 bg-transparent text-white font-mono text-sm p-4 resize-none focus:outline-none leading-6"
                  spellCheck="false"
                  placeholder="// Write your code here..."
                  style={{ 
                    tabSize: 4,
                    width: '100%',
                    height: '100%',
                    whiteSpace: 'pre',      // Prevent wrapping - VS Code style
                    overflowWrap: 'normal', // Don't break long lines
                    overflowX: 'auto'       // Enable horizontal scroll
                  }}
                />
              </div>
            </div>
            
            {/* Copy-Paste Warning */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 flex items-center gap-1 z-10 pointer-events-none">
              <AlertCircle size={12} />
              Copy-paste blocked
            </div>
          </div>

          {/* Console Output */}
          <div className="h-48 border-t border-gray-700 bg-[#0f172a] flex flex-col shrink-0">
            <div className="bg-[#1e293b] px-4 py-2 border-b border-gray-700 flex items-center gap-2">
              <Terminal size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Console Output</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {isRunning ? (
                <div className="text-gray-400 animate-pulse">Executing code...</div>
              ) : output ? (
                <pre className="text-gray-300 whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-gray-500">Run your code to see output here...</div>
              )}
              
              {submissionResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  submissionResult.status === 'success' 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {submissionResult.status === 'success' ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : (
                      <XCircle size={18} className="text-red-500" />
                    )}
                    <span className={`font-bold ${
                      submissionResult.status === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {submissionResult.message}
                    </span>
                  </div>
                  
                  {submissionResult.xpEarned && (
                    <div className="text-[#eab308] font-bold mb-2 flex items-center gap-1">
                      <Zap size={14} />
                      +{submissionResult.xpEarned} XP Earned!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Problem Statement Sidebar */}
        {showProblem && (
          <div className="w-1/3 border-l border-gray-700 bg-[#1e293b] overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <HelpCircle size={16} className="text-[#eab308]" />
                Problem Statement
              </h3>
              
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="text-gray-300 whitespace-pre-line leading-relaxed text-xs">
                  {problem.description}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-xs font-bold text-white mb-2">Test Cases:</h4>
                <div className="space-y-2">
                  {problem.testCases.map((tc, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-2 rounded border border-gray-700 text-xs">
                      <div className="text-gray-400 mb-1">Input: {tc.input}</div>
                      <div className="text-green-400">Expected: {tc.expected}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentChallenge;