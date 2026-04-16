import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Code, 
  Terminal, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

function CreateProblem() {
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Code',
    difficulty: 'Easy',
    language: 'Python',
    course: '',
    timeLimit: 10,
    memoryLimit: 256,
    template: '',
    testCases: [{ input: '', expected: '' }],
    hints: '',
    tags: []
  });

  const [saveStatus, setSaveStatus] = useState('idle');
  const [currentTag, setCurrentTag] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...formData.testCases];
    newTestCases[index][field] = value;
    setFormData(prev => ({ ...prev, testCases: newTestCases }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expected: '' }]
    }));
  };

  const removeTestCase = (index) => {
    if (formData.testCases.length > 1) {
      const newTestCases = formData.testCases.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, testCases: newTestCases }));
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => {
        navigate('/instructor/problems');
      }, 1500);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto"> {/* ← Added mx-auto for centering */}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Create New Problem</h2>
          <p className="text-gray-400 text-sm">Define a new coding challenge for students</p>
        </div>
        <button 
          onClick={() => navigate('/instructor/problems')}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Information */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Code size={20} className="text-[#eab308]" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Problem Title *</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Array Sorting Algorithm"
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Course *</label>
              <select 
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              >
                <option value="">Select Course</option>
                <option value="CS101">CS101 - Intro to Programming</option>
                <option value="CS102">CS102 - Data Structures</option>
                <option value="CS201">CS201 - Algorithms</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Type *</label>
              <select 
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              >
                <option value="Code">Code Challenge</option>
                <option value="Debug">Debug Challenge</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Difficulty *</label>
              <select 
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Language *</label>
              <select 
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              >
                <option value="Python">Python</option>
                <option value="Java">Java</option>
                <option value="C#">C#</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Tags (comma separated)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..."
                  className="flex-1 bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
                />
                <button 
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308] rounded-lg transition"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                    {tag}
                    <button 
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Description & Template */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Terminal size={20} className="text-[#eab308]" />
            Problem Details
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description *</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Describe the problem, requirements, and expected output..."
                required
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#eab308] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Code Template (Optional)</label>
              <textarea 
                name="template"
                value={formData.template}
                onChange={handleInputChange}
                rows={4}
                placeholder="// Provide starter code for students..."
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#eab308] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Hints (Optional)</label>
              <textarea 
                name="hints"
                value={formData.hints}
                onChange={handleInputChange}
                rows={3}
                placeholder="Provide helpful hints for students who get stuck..."
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-[#eab308] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-[#eab308]" />
              Test Cases
            </h3>
            <button 
              type="button"
              onClick={addTestCase}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308] rounded-lg text-sm font-medium transition"
            >
              <Plus size={16} /> Add Test Case
            </button>
          </div>

          <div className="space-y-4">
            {formData.testCases.map((testCase, index) => (
              <div key={index} className="bg-[#0f172a] p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-300">Test Case #{index + 1}</span>
                  {formData.testCases.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeTestCase(index)}
                      className="text-gray-400 hover:text-red-400 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Input</label>
                    <textarea 
                      value={testCase.input}
                      onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                      rows={3}
                      placeholder="Sample input..."
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-[#eab308] focus:outline-none resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                    <textarea 
                      value={testCase.expected}
                      onChange={(e) => handleTestCaseChange(index, 'expected', e.target.value)}
                      rows={3}
                      placeholder="Expected output..."
                      className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-[#eab308] focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Limits */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#eab308]" />
            Execution Limits
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Limit (seconds)</label>
              <input 
                type="number" 
                name="timeLimit"
                value={formData.timeLimit}
                onChange={handleInputChange}
                min="1"
                max="30"
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Memory Limit (MB)</label>
              <input 
                type="number" 
                name="memoryLimit"
                value={formData.memoryLimit}
                onChange={handleInputChange}
                min="64"
                max="1024"
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button 
            type="submit"
            disabled={saveStatus === 'saving'}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition ${
              saveStatus === 'success' 
                ? 'bg-green-600 text-white' 
                : 'bg-[#eab308] hover:bg-yellow-500 text-black'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'success' ? (
              <><CheckCircle2 size={18} /> Saved!</>
            ) : (
              <><Save size={18} /> Create Problem</>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => navigate('/instructor/problems')}
            className="px-6 py-3 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

export default CreateProblem;