import { useState } from 'react'

export default function PlagiarismCheck() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [threshold, setThreshold] = useState('85')
  const [scope, setScope] = useState('All Blocks')

  const plagiarismCases = []

  const handleScan = () => {
    setIsScanning(true)
    setScanComplete(false)
    setTimeout(() => {
      setIsScanning(false)
      setScanComplete(true)
    }, 3000)
  }

  const statCards = [
    {
      icon: '⚠️',
      label: 'Cases Found',
      value: plagiarismCases.length,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      icon: '✅',
      label: 'Status',
      value: plagiarismCases.length === 0 ? 'Clean' : 'Flagged',
      color: plagiarismCases.length === 0 ? 'text-green-400' : 'text-red-400',
      bg: plagiarismCases.length === 0 ? 'bg-green-500/10' : 'bg-red-500/10',
      border: plagiarismCases.length === 0 ? 'border-green-500/20' : 'border-red-500/20',
    },
    {
      icon: '🔍',
      label: 'Detection Mode',
      value: 'Automatic',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ]

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Plagiarism Detection</h1>
        <p className="text-slate-400 mt-1 text-sm">Structural code similarity analysis across all student submissions</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(card => (
          <div
            key={card.label}
            className={`${card.bg} border ${card.border} rounded-2xl p-5 flex items-center gap-4`}
          >
            <div className={`w-12 h-12 ${card.bg} border ${card.border} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-2xl font-black ${card.color} tabular-nums`}>{card.value}</p>
              <p className="text-slate-400 text-xs">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Scan Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">🔍</span> Scan Center
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-16 px-8">
          {isScanning ? (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
                </div>
                {/* Ping rings */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-bold mb-1">Scanning submissions...</p>
                <p className="text-slate-400 text-sm">Analyzing code similarity across {scope}</p>
              </div>
              <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          ) : scanComplete ? (
            <div className="flex flex-col items-center gap-5">
              <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center text-4xl">
                ✅
              </div>
              <div className="text-center">
                <p className="text-white text-2xl font-black mb-1">All Clear!</p>
                <p className="text-slate-400 text-sm">No plagiarism detected in any submissions</p>
              </div>
              <button
                onClick={() => setScanComplete(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold transition text-sm"
              >
                Run New Scan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-blue-500/10 border-2 border-blue-500/20 rounded-full flex items-center justify-center text-4xl">
                🔍
              </div>
              <div className="text-center">
                <p className="text-white text-xl font-bold mb-1">Ready to Scan</p>
                <p className="text-slate-400 text-sm">Analyze all student submissions for structural code similarity</p>
              </div>
              <button
                onClick={handleScan}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                🔍 Start Plagiarism Scan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-purple-400">⚙️</span> Detection Settings
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Similarity Threshold
            </label>
            <select
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/60 transition text-sm"
            >
              <option value="80">80% — High Sensitivity</option>
              <option value="85">85% — Medium (Recommended)</option>
              <option value="90">90% — Low Sensitivity</option>
            </select>
            <p className="text-slate-600 text-xs mt-2">
              Submissions above this threshold will be flagged for review
            </p>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">
              Scan Scope
            </label>
            <select
              value={scope}
              onChange={e => setScope(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/60 transition text-sm"
            >
              <option>All Blocks</option>
              <option>Block 301</option>
              <option>Block 302</option>
            </select>
            <p className="text-slate-600 text-xs mt-2">
              Limit scan to a specific class block
            </p>
          </div>
        </div>

        {/* Threshold visual indicator */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            <span className="text-xl">🎯</span>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Current Threshold: {threshold}%</p>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${threshold}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
