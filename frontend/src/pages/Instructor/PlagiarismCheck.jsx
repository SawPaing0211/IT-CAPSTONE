import { useState } from 'react'

export default function PlagiarismCheck() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)

  // Mock Data
  const plagiarismCases = []

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setScanComplete(true)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Plagiarism Detection</h1>
        <p className="text-slate-400">AI-powered code similarity analysis</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{plagiarismCases.length}</p>
              <p className="text-slate-400 text-sm">Plagiarism Cases Found</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-2xl">
              ✅
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Clean</p>
              <p className="text-slate-400 text-sm">Status</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-2xl">
              🔍
            </div>
            <div>
              <p className="text-3xl font-bold text-white">Auto</p>
              <p className="text-slate-400 text-sm">Detection Mode</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
        {isScanning ? (
          <div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white text-lg font-bold mb-2">Scanning submissions...</p>
            <p className="text-slate-400">Analyzing code similarity across all blocks</p>
          </div>
        ) : scanComplete ? (
          <div>
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center text-5xl mx-auto mb-4">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">All Clear!</h2>
            <p className="text-slate-400 mb-6">No plagiarism detected in any submissions</p>
            <button 
              onClick={() => setScanComplete(false)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition"
            >
              Run New Scan
            </button>
          </div>
        ) : (
          <div>
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center text-5xl mx-auto mb-4">
              🔍
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Scan</h2>
            <p className="text-slate-400 mb-6">Click below to analyze all student submissions for plagiarism</p>
            <button 
              onClick={handleScan}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20"
            >
              🔍 Start Plagiarism Scan
            </button>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Detection Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Similarity Threshold</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
              <option>80% - High Sensitivity</option>
              <option>85% - Medium (Recommended)</option>
              <option>90% - Low Sensitivity</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Scan Scope</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none">
              <option>All Blocks</option>
              <option>Block 301</option>
              <option>Block 302</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}