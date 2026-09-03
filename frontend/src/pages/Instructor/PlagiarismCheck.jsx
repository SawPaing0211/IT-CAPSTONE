// plagiarism check — AI-powered code similarity scanner using Gemini Flash (free).
//
// how it works:
//   1. instructor picks a problem from the class
//   2. clicks "Run AI Scan"
//   3. backend fetches all student submissions for that problem
//   4. compares every pair using jaccard token similarity
//      (strips comments, lowercases, removes keywords, checks token overlap)
//   5. pairs above the threshold get sent to Gemini Flash which writes a
//      plain-english verdict explaining what looks suspicious
//   6. results show similarity %, both code previews, and the AI verdict

import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function PlagiarismCheck({ classId }) {
  const [problems, setProblems]               = useState([])
  const [selectedProblem, setSelectedProblem] = useState('')
  const [threshold, setThreshold]             = useState('85')
  const [isScanning, setIsScanning]           = useState(false)
  const [results, setResults]                 = useState(null)
  const [error, setError]                     = useState(null)
  const [expandedPair, setExpandedPair]       = useState(null)
  const [loadingProblems, setLoadingProblems] = useState(true)

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const token = localStorage.getItem('token')
        const url = classId
          ? `${API}/api/instructor/classes/${classId}/problems`
          : `${API}/api/instructor/problems`
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) setProblems(await res.json())
      } catch (err) {
        console.error('Failed to fetch problems:', err)
      } finally {
        setLoadingProblems(false)
      }
    }
    fetchProblems()
  }, [classId])

  const handleScan = async () => {
    if (!selectedProblem) { setError('Please select a problem first.'); return }
    setIsScanning(true)
    setError(null)
    setResults(null)
    setExpandedPair(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/instructor/plagiarism/scan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: parseInt(selectedProblem),
          class_id:   classId ? parseInt(classId) : null,
          threshold:  parseInt(threshold),
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Scan failed')
      }
      setResults(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setIsScanning(false)
    }
  }

  const selectedProblemName = problems.find(p => p.id === parseInt(selectedProblem))?.title

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Plagiarism Detection</h2>
          <p className="text-slate-400 mt-0.5 text-sm">
            AI-powered code similarity scanner — reduces manual review workload
          </p>
        </div>
        {results && (
          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
            results.flagged > 0
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}>
            {results.flagged > 0 ? `⚠️ ${results.flagged} pairs flagged` : '✅ No plagiarism detected'}
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cases Found', value: results ? results.flagged : '—', icon: '⚠️', border: results?.flagged > 0 ? 'border-l-red-500' : 'border-l-slate-600', text: results?.flagged > 0 ? 'text-red-400' : 'text-slate-400' },
          { label: 'Compared',    value: results ? `${results.total_compared} students` : '—', icon: '👥', border: 'border-l-blue-500', text: 'text-blue-400' },
          { label: 'Threshold',   value: `${threshold}%`, icon: '🎯', border: 'border-l-purple-500', text: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${c.border} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${c.text} tabular-nums`}>{c.value}</p>
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><span>{c.icon}</span> {c.label}</p>
          </div>
        ))}
      </div>

      {/* Scan Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">🔍 Scan Setup</h3>
        </div>
        <div className="p-6 space-y-5">

          {/* Problem selector */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Select Problem *</label>
            {loadingProblems ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                Loading problems...
              </div>
            ) : problems.length === 0 ? (
              <p className="text-slate-500 text-sm py-2">No problems created for this class yet</p>
            ) : (
              <select
                value={selectedProblem}
                onChange={e => { setSelectedProblem(e.target.value); setResults(null); setError(null) }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/60 transition text-sm cursor-pointer"
              >
                <option value="">Choose a problem...</option>
                {problems.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.difficulty}) — {p.problem_type}</option>
                ))}
              </select>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Similarity Threshold</label>
            <select
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/60 transition text-sm cursor-pointer"
            >
              <option value="75">75% — High Sensitivity (more results, some false positives)</option>
              <option value="85">85% — Balanced (recommended)</option>
              <option value="90">90% — Low Sensitivity (only obvious cases)</option>
            </select>
            <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${threshold}%` }} />
            </div>
            <p className="text-slate-600 text-xs mt-1">Pairs with ≥{threshold}% token overlap will be flagged and reviewed by Gemini AI</p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-600/40 rounded-lg text-red-300 text-sm">❌ {error}</div>
          )}

          <button
            onClick={handleScan}
            disabled={isScanning || !selectedProblem}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Scanning + running Gemini AI analysis...</>
            ) : (
              <>🤖 Run AI Plagiarism Scan{selectedProblemName ? ` — ${selectedProblemName}` : ''}</>
            )}
          </button>

          {isScanning && (
            <div className="text-center space-y-2">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full animate-pulse" style={{ width: '70%' }} />
              </div>
              <p className="text-slate-500 text-xs">
                Fetching submissions → comparing code pairs → Gemini AI writing verdicts...
                <br />This may take 10–30 seconds depending on submission count.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">
              {results.flagged === 0 ? '✅ No suspicious pairs found' : `⚠️ ${results.flagged} suspicious pair${results.flagged > 1 ? 's' : ''} found`}
            </h3>
            <p className="text-slate-500 text-xs">Compared {results.total_compared} students · threshold {results.threshold}%</p>
          </div>

          {results.flagged === 0 && (
            <div className="bg-green-900/10 border border-green-600/20 rounded-2xl p-8 text-center">
              <span className="text-5xl block mb-3">✅</span>
              <p className="text-green-400 font-bold text-lg">All Clear</p>
              <p className="text-slate-400 text-sm mt-1">No student pairs exceeded the {results.threshold}% similarity threshold.</p>
            </div>
          )}

          {results.pairs.map((pair, i) => {
            const isExpanded = expandedPair === i
            const simColor =
              pair.similarity >= 95 ? 'text-red-400 bg-red-500/10 border-red-500/20' :
              pair.similarity >= 85 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
              'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'

            return (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-800/30 transition" onClick={() => setExpandedPair(isExpanded ? null : i)}>
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-black border tabular-nums shrink-0 ${simColor}`}>{pair.similarity}%</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {pair.student1.name}<span className="text-slate-500 mx-2">↔</span>{pair.student2.name}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {pair.student1.username} · {pair.student2.username} · {pair.student1.language}
                      {pair.ai_verdict && <span className="ml-2 text-purple-400">· Gemini verdict available</span>}
                    </p>
                  </div>
                  <span className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-5 space-y-4">
                    {pair.ai_verdict ? (
                      <div className="p-4 bg-purple-900/20 border border-purple-600/30 rounded-xl">
                        <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">🤖 Gemini AI Verdict</p>
                        <p className="text-slate-300 text-sm leading-relaxed">{pair.ai_verdict}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                        <p className="text-slate-500 text-xs">AI verdict unavailable — {pair.similarity}% token overlap detected.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: pair.student1.name, code: pair.code_preview1, status: pair.student1.status },
                        { label: pair.student2.name, code: pair.code_preview2, status: pair.student2.status },
                      ].map((s, si) => (
                        <div key={si} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-400 text-xs font-medium">{s.label}</p>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${s.status === 'accepted' ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{s.status}</span>
                          </div>
                          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-auto max-h-48 font-mono leading-relaxed whitespace-pre-wrap">
                            {s.code || '(no code preview)'}
                          </pre>
                          <p className="text-slate-600 text-xs">First 600 chars shown</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* How it works */}
      {!results && !isScanning && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">⚙️ How the Scanner Works</h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Fetches all submissions',          desc: "Gets the latest submission from each student for the selected problem" },
              { step: '2', title: 'Token similarity analysis',        desc: "Strips comments and keywords, checks what fraction of code tokens overlap — same approach as Stanford's MOSS tool" },
              { step: '3', title: 'Flags pairs above threshold',      desc: "Any pair exceeding your similarity threshold is sent to Gemini AI for deeper analysis" },
              { step: '4', title: 'Gemini AI writes plain verdict',   desc: "Gemini Flash explains what looks suspicious and what to check — saves you from reading raw code diffs" },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-600/20 border border-purple-600/30 rounded-full flex items-center justify-center text-xs text-purple-400 font-bold shrink-0 mt-0.5">{s.step}</div>
                <div>
                  <p className="text-white text-sm font-medium">{s.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
