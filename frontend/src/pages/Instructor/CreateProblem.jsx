import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'  // changed useparams to usesearchparams

export default function CreateProblem() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()  // Read query params
  const problemId = searchParams.get('edit')  // Get problem ID from ?edit=123
  const [blocks, setBlocks] = useState([])
  const [isEditing, setIsEditing] = useState(!!problemId)  // Editing mode if problemId exists
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [blocksBySubject, setBlocksBySubject] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [activeSection, setActiveSection] = useState(1)
  
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    difficulty: 'Easy',
    xp_reward: 100,
    category: 'General',
    
    // NEW PRO FIELDS
    problem_type: 'coding',
    languages: ['python'],
    is_event_quest: false,
    visible_to_blocks: [],
    hints: [],
    tags: [],
    prerequisites: [],
    estimated_time: '15min',
    partial_credit: 100,
    auto_grade: true,
    plagiarism_threshold: 0.85,
    
    // Code & Tests
    starter_code: {
      python: '',
      java: '',
      csharp: ''
    },
    test_cases: [{ input: '', expected: '' }]
  })

  // Fetch subjects AND blocks (and problem data if editing)
useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Check if we're editing an existing problem
      if (problemId) {
        setIsEditing(true)
        // Fetch existing problem data
        const problemRes = await fetch(`http://localhost:5000/api/instructor/problems/${problemId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (problemRes.ok) {
          const problemData = await problemRes.json()
          
          // Populate form with existing data
          setFormData({
            ...formData,
            title: problemData.title,
            description: problemData.description,
            difficulty: problemData.difficulty,
            xp_reward: problemData.xp_reward,
            category: problemData.category || 'General',
            problem_type: problemData.problem_type || 'coding',
            languages: problemData.languages || ['python'],
            is_event_quest: problemData.is_event_quest || false,
            visible_to_blocks: problemData.visible_to_blocks || [],
            hints: problemData.hints || [],
            tags: problemData.tags || [],
            prerequisites: problemData.prerequisites || [],
            estimated_time: problemData.estimated_time || '15min',
            partial_credit: problemData.partial_credit || 100,
            auto_grade: problemData.auto_grade !== undefined ? problemData.auto_grade : true,
            plagiarism_threshold: problemData.plagiarism_threshold || 0.85,
            starter_code: problemData.starter_code || { python: '', java: '', csharp: '' },
            test_cases: problemData.test_cases || [{ input: '', expected: '' }]
          })
          
          // Set selected subject (with delay to ensure subjects are loaded)
          if (problemData.subject_id) {
            // Wait a tick for assignedSubjects to populate
            setTimeout(() => {
              setSelectedSubjectId(problemData.subject_id)
            }, 100)
          }
        }
      }
      
      // Fetch assigned subjects
      const subjectsRes = await fetch('http://localhost:5000/api/instructor/assigned-subjects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json()
        setAssignedSubjects(subjectsData)
      }
      
      // Fetch blocks
      const res = await fetch('http://localhost:5000/api/instructor/classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setBlocks(data)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }
  fetchData()
}, [problemId])  

  useEffect(() => {
    if (!selectedSubjectId) {
      setBlocksBySubject([])
      return
    }
    const fetchBlocksForSubject = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `http://localhost:5000/api/instructor/blocks-by-subject?subject_id=${selectedSubjectId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          setBlocksBySubject(data)
          // Clear selected blocks that are no longer valid for this subject
          setFormData(prev => ({
            ...prev,
            visible_to_blocks: prev.visible_to_blocks.filter(bid =>
              data.some(b => b.id === bid)
            )
          }))
        }
      } catch (err) {
        console.error('Failed to fetch blocks for subject:', err)
      }
    }
    fetchBlocksForSubject()
  }, [selectedSubjectId])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLanguageToggle = (language) => {
    setFormData(prev => {
      const languages = prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
      return { ...prev, languages }
    })
  }

  const handleHintAdd = () => {
    setFormData(prev => ({
      ...prev,
      hints: [...prev.hints, { text: '', xp_penalty: 10 }]
    }))
  }

  const handleHintUpdate = (index, field, value) => {
    const newHints = [...formData.hints]
    newHints[index][field] = value
    setFormData(prev => ({ ...prev, hints: newHints }))
  }

  const handleHintRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index)
    }))
  }

  const handleTestCaseAdd = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', expected: '' }]
    }))
  }

  const handleTestCaseUpdate = (index, field, value) => {
    const newTestCases = [...formData.test_cases]
    newTestCases[index][field] = value
    setFormData(prev => ({ ...prev, test_cases: newTestCases }))
  }

  const handleTestCaseRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // XP Validation based on difficulty
    const maxXP = {
      'Easy': 100,
      'Medium': 250,
      'Hard': 500
    }
    
    if (formData.xp_reward > maxXP[formData.difficulty]) {
      alert(`❌ XP reward exceeds maximum for ${formData.difficulty} difficulty.\n\nMaximum XP for ${formData.difficulty}: ${maxXP[formData.difficulty]}\nYour XP: ${formData.xp_reward}`)
      return
    }
    
    // Subject validation
    if (!selectedSubjectId) {
      alert('❌ Please select a course subject for this problem.')
      return
    }
    
    // Existing validation
    if (!formData.title || !formData.description || formData.test_cases.length === 0) {
      alert('Please fill in all required fields and add at least one test case.')
      return
    }
    if (formData.languages.length === 0) {
      alert('Please select at least one programming language.')
      return
    }

    try {
  const token = localStorage.getItem('token')
  
  // Prepare payload with subject_id
  const payload = {
    ...formData,
    subject_id: selectedSubjectId,
    starter_code: formData.starter_code, 
    is_published: true
  }
  
  // EDIT vs CREATE logic
  const url = isEditing 
    ? `http://localhost:5000/api/problems/${problemId}`
    : 'http://localhost:5000/api/problems'
  
  const method = isEditing ? 'PUT' : 'POST'
  
  const res = await fetch(url, {
    method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        alert(isEditing ? '✅ Activity updated successfully!' : '✅ Activity created successfully!')
        navigate('/instructor/problems')
      } else {
        const error = await res.json()
        alert(`❌ Failed to create activity: ${error.error}`) 
      }
    } catch (err) {
      console.error('Failed to create problem:', err)
      alert('❌ Failed to create problem. Check console for details.')
    }
  }

  const sections = [ 
    { id: 1, title: 'Basic Information', icon: '📋' },
    { id: 2, title: 'Problem Type & Languages', icon: '💻' },
    { id: 3, title: 'Visibility & Settings', icon: '🔧' },
    { id: 4, title: 'Starter Code', icon: '📝' },
    { id: 5, title: 'Test Cases', icon: '🧪' },
    { id: 6, title: 'Hints', icon: '💡' },
{ id: 7, title: 'Review', icon: '📋' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/instructor/problems')} className="text-slate-400 hover:text-white transition">
          ← Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isEditing ? '✏️ Edit Activity' : '➕ Create New Activity'}
          </h1> 
          <p className="text-slate-400">Design a coding activity for your students</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          {sections.map((section, idx) => (
            <div key={section.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : activeSection > section.id
                    ? 'text-green-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="hidden lg:inline font-medium text-sm">{section.title}</span>
              </button>
              {idx < sections.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${
                  activeSection > section.id ? 'bg-green-600' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        {activeSection === 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            {/* Course Subject Selector */}
            <div>
              <label className="block text-slate-400 text-sm mb-2">Course Subject *</label>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                required
              >
                <option value="">Select a subject you teach</option>
                {assignedSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              {assignedSubjects.length === 0 && (
                <p className="text-amber-400 text-xs mt-1">⚠️ No subjects assigned. Contact admin.</p>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📋</span> Activity Details
            </h2>
            
            <div>
              <label className="block text-slate-400 text-sm mb-2">Problem Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Sum of Two Numbers"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Difficulty *</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">XP Reward *</label>
                <input
                  type="number"
                  value={formData.xp_reward}
                  onChange={(e) => handleInputChange('xp_reward', parseInt(e.target.value))}
                  placeholder="100"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the activity details here..."
                rows="6"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                required
              />
            </div>
          </div>
        )}

        {/* Section 2: Problem Type & Languages */}
        {activeSection === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>💻</span> Problem Type & Languages
            </h2>

            {/* Problem Type */}
            <div>
              <label className="block text-slate-400 text-sm mb-3">Problem Type *</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('problem_type', 'coding')}
                  className={`p-4 rounded-xl border-2 transition ${
                    formData.problem_type === 'coding'
                      ? 'border-blue-600 bg-blue-600/10 text-blue-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-bold">Coding</div>
                  <div className="text-xs mt-1">Student writes complete solution</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('problem_type', 'debugging')}
                  className={`p-4 rounded-xl border-2 transition ${
                    formData.problem_type === 'debugging'
                      ? 'border-blue-600 bg-blue-600/10 text-blue-400'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-2">🐛</div>
                  <div className="font-bold">Debugging</div>
                  <div className="text-xs mt-1">Student fixes bugs in code</div>
                </button>
              </div>
            </div>

            {/* Programming Languages */}
            <div>
              <label className="block text-slate-400 text-sm mb-3">Programming Languages *</label>
              <div className="space-y-3">
                {['python', 'java', 'csharp'].map(lang => (
                  <label key={lang} className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-700 transition">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang)}
                      onChange={() => handleLanguageToggle(lang)}
                      className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-lg">
                      {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}
                    </span>
                    <span className="text-white font-medium capitalize">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Visibility & Settings */}
        {activeSection === 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🔧</span> Visibility & Settings
            </h2>

            {/* Event Quest Toggle */}
            <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-600/30 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎉</span>
                    <span className="text-white font-bold text-lg">Event Quest</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    Extra credit problem for at-risk students. Displays with special badge.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_event_quest}
                  onChange={(e) => handleInputChange('is_event_quest', e.target.checked)}
                  className="w-6 h-6 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                />
              </label>
            </div>

            {/* Block Visibility - Filtered by Selected Subject */}
            <div>
              <label className="block text-slate-400 text-sm mb-3">Visible To Blocks</label>
              <div className="bg-slate-800 rounded-xl p-4 space-y-2 max-h-60 overflow-y-auto border border-slate-700">
                {blocksBySubject.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">
                    {selectedSubjectId ? 'No blocks found for this subject' : 'Select a subject first to see available blocks'}
                  </p>
                ) : (
                  blocksBySubject.map(block => (
                    <label key={block.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.visible_to_blocks.includes(block.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleInputChange('visible_to_blocks', [...formData.visible_to_blocks, block.id])
                          } else {
                            handleInputChange('visible_to_blocks', formData.visible_to_blocks.filter(id => id !== block.id))
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {block.section_code}{block.semester ? ` — ${block.semester}` : ''}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Select which blocks can see this problem. Leave empty for all blocks.
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Estimated Time</label>
                <select
                  value={formData.estimated_time}
                  onChange={(e) => handleInputChange('estimated_time', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                >
                  <option value="5min">5 minutes</option>
                  <option value="10min">10 minutes</option>
                  <option value="15min">15 minutes</option>
                  <option value="30min">30 minutes</option>
                  <option value="1hr">1 hour</option>
                  <option value="1hr+">1 hour+</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Partial Credit (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.partial_credit}
                  onChange={(e) => handleInputChange('partial_credit', parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Starter Code */}
        {activeSection === 4 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📝</span> Starter Code
            </h2>
            
            {formData.languages.map(lang => (
              <div key={lang}>
                <label className="block text-slate-400 text-sm mb-2 capitalize flex items-center gap-2">
                  <span>{lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}</span>
                  {lang} Starter Code
                </label>
                <textarea
                  value={formData.starter_code[lang] || ''}
                  onChange={(e) => {
                    const newStarterCode = { ...formData.starter_code, [lang]: e.target.value }
                    handleInputChange('starter_code', newStarterCode)
                  }}
                  placeholder={lang === 'python' ? 'def solve():\n    # Your code here\n    pass' : 
                               lang === 'java' ? 'public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}' :
                               'using System;\n\nclass Solution {\n    static void Main() {\n        // Your code here\n    }\n}'}
                  rows="8"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-green-400 font-mono text-sm focus:border-blue-500 outline-none resize-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Section 5: Test Cases */}
        {activeSection === 5 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🧪</span> Test Cases
              </h2>
              <button
                type="button"
                onClick={handleTestCaseAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition"
              >
                + Add Test Case
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.test_cases.map((tc, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Test Case {idx + 1}</span>
                    {formData.test_cases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleTestCaseRemove(idx)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 text-xs mb-1">Input</label>
                      <input
                        type="text"
                        value={tc.input}
                        onChange={(e) => handleTestCaseUpdate(idx, 'input', e.target.value)}
                        placeholder="Input..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 text-xs mb-1">Expected Output</label>
                      <input
                        type="text"
                        value={tc.expected}
                        onChange={(e) => handleTestCaseUpdate(idx, 'expected', e.target.value)}
                        placeholder="Output..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Hints */}
        {activeSection === 6 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>💡</span> Hints (Optional)
              </h2>
              <button
                type="button"
                onClick={handleHintAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition"
              >
                + Add Hint
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.hints.map((hint, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Hint {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleHintRemove(idx)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs mb-1">Hint Text</label>
                    <textarea
                      value={hint.text}
                      onChange={(e) => handleHintUpdate(idx, 'text', e.target.value)}
                      placeholder="Provide a helpful hint..."
                      rows="2"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-xs mb-1">XP Penalty</label>
                    <input
                      type="number"
                      value={hint.xp_penalty}
                      onChange={(e) => handleHintUpdate(idx, 'xp_penalty', parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Students lose this much XP if they view the hint</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 7: Review */}
        {activeSection === 7 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>📋</span> Review Activity
            </h2>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Title</p>
                <p className="text-white font-semibold">{formData.title || <span className="text-slate-500 italic">Not set</span>}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Difficulty / XP</p>
                <p className="text-white font-semibold">{formData.difficulty} — {formData.xp_reward} XP</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Type / Languages</p>
                <p className="text-white font-semibold capitalize">{formData.problem_type} · {formData.languages.join(', ')}</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Test Cases</p>
                <p className="text-white font-semibold">{formData.test_cases.length} test case(s) defined</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Hints</p>
                <p className="text-white font-semibold">{formData.hints.length} hint(s) added</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Visible To Blocks</p>
                <p className="text-white font-semibold">
                  {formData.visible_to_blocks.length === 0 ? 'All blocks' : `${formData.visible_to_blocks.length} block(s) selected`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection(Math.max(1, activeSection - 1))}
            disabled={activeSection === 1}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-slate-300 font-bold transition"
          >
            ← Previous
          </button>
          
          {activeSection < sections.length ? (
            <button
              type="button"
              onClick={() => setActiveSection(Math.min(sections.length, activeSection + 1))}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition shadow-lg shadow-blue-600/20"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-bold transition shadow-lg shadow-blue-600/20"
            >
              {isEditing ? '✨ Update Activity' : '✨ Create Activity'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}