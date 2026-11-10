import { useEffect, useRef, useState } from 'react'
import { API_BASE, authFetch } from '../../api/client'
import ModuleIcon from './ModuleIcon'
import { displayNumber, scanSummary } from './instructorReviewData'
import './InstructorInsights.css'

export default function PlagiarismCheck({ classId }) {
  const [problems, setProblems] = useState([])
  const [selected, setSelected] = useState('')
  const [threshold, setThreshold] = useState('85')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const busy = useRef(false)
  const scanRequest = useRef(null)
  useEffect(() => {
    const controller = new AbortController()
    let current = true
    async function load() {
      setLoading(true); setLoadError('')
      try {
        const res = await authFetch(`${API_BASE}/api/instructor/classes/${classId}/problems`, { signal: controller.signal })
        if (!res.ok) throw new Error('Unable to load quests for this class.')
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error('The quest list is incomplete.')
        if (current) setProblems(data)
      } catch (err) { if (current) setLoadError(err.message) }
      finally { if (current) setLoading(false) }
    }
    load()
    return () => { current = false; controller.abort(); scanRequest.current?.abort() }
  }, [classId, reload])

  async function scan(e) {
    e.preventDefault()
    if (busy.current || !problems.some(p => String(p.id) === selected)) return
    busy.current = true; setScanning(true); setError(''); setResult(null)
    const controller = new AbortController()
    scanRequest.current = controller
    try {
      const res = await authFetch(`${API_BASE}/api/instructor/plagiarism/scan`, {
        method: 'POST', signal: controller.signal, headers: {'Content-Type':'application/json'},
        body: JSON.stringify({problem_id:Number(selected), class_id:Number(classId), threshold:Number(threshold)}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'The scan could not be completed. Try again when ready.')
      scanSummary(data)
      if (!controller.signal.aborted) setResult({...data, questTitle:problems.find(p => String(p.id) === selected)?.title})
    } catch (err) { if (!controller.signal.aborted) setError(err.message || 'The scan could not be completed.') }
    finally { busy.current = false; if (!controller.signal.aborted) setScanning(false) }
  }
  const summary = result ? scanSummary(result) : null
  return <section className="ii" aria-label="Plagiarism review">
    <header className="ii-heading"><div><h2>Plagiarism review</h2><p>Compare submitted code and review similarities in context.</p></div><span className="ii-label"><ModuleIcon name="search" />Instructor review tool</span></header>
    <div className="ii-scan-layout">
      <form className="ii-panel ii-scan-form" onSubmit={scan}>
        <h3><ModuleIcon name="search" />Scan setup</h3>
        {loading ? <p role="status">Loading class quests…</p> : loadError ? <div className="ii-error" role="alert"><p>{loadError}</p><button type="button" className="ir-secondary" onClick={() => setReload(n => n + 1)}>Retry quest list</button></div> : !problems.length ? <div className="ii-empty"><h4>No quests available to scan</h4><p>The current scan list includes quests you created and made visible to this class. Create or assign one through Activities.</p></div> : <>
          <label className="ii-field">Quest<select required value={selected} disabled={scanning} onChange={e => {setSelected(e.target.value);setResult(null);setError('')}}><option value="">Choose a quest…</option>{problems.map(p => <option key={p.id} value={p.id}>{p.title} · {p.difficulty} · {p.problem_type}</option>)}</select></label>
          <label className="ii-field">Similarity threshold<select value={threshold} disabled={scanning} onChange={e => {setThreshold(e.target.value);setResult(null);setError('')}}><option value="75">75% — Higher sensitivity</option><option value="85">85% — Balanced</option><option value="90">90% — Lower sensitivity</option></select><small>Lower thresholds flag more pairs and can include more coincidental similarities.</small></label>
          <p className="ii-disclosure">Flagged code previews and student names may be sent to the configured Gemini service for an optional explanation. Similarity results remain available when AI is unavailable.</p>
          {error && <p className="ii-error" role="alert">{error}</p>}
          <button className="ii-primary" type="submit" disabled={scanning || !selected}><ModuleIcon name="search" />{scanning ? 'Scanning submissions…' : 'Run similarity scan'}</button>
          {scanning && <p role="status">Comparing submissions and requesting available AI explanations. Please wait; leaving this tab does not guarantee the server scan stops.</p>}
        </>}
      </form>
      <aside className="ii-guide"><h3>Read similarities carefully</h3><ol><li><strong>Latest work per student</strong><p>The scanner uses each student’s latest submission for this quest within the selected class.</p></li><li><strong>Token overlap</strong><p>Comments and selected keywords are removed before comparing token sets. Short introductory answers can naturally resemble each other.</p></li><li><strong>Review, not an accusation</strong><p>Open flagged pairs to inspect both previews and any AI explanation. This scan does not change grades, XP or attempt status.</p></li></ol></aside>
    </div>
    {result && <section className="ii-results" aria-label="Similarity scan results"><header className="ii-heading"><div><h3>{summary.title}</h3><p>{summary.detail}</p></div></header><p className="ii-result-context">{result.questTitle} · {displayNumber(result.total_compared)} students with submissions · {result.threshold}% threshold</p>
      {result.pairs.map((pair,i) => <details className="ii-panel ii-pair" key={`${pair.student1.id}-${pair.student2.id}-${i}`}><summary><span className="ii-similarity">{pair.similarity}%<small>code similarity</small></span><span><strong>{pair.student1.name} &amp; {pair.student2.name}</strong><small>{pair.student1.language} / {pair.student2.language} · {pair.ai_verdict ? 'AI explanation available' : 'AI explanation unavailable'}</small></span><span className="ii-pair-open">Review pair</span></summary><div className="ii-pair-body"><h4>AI-assisted explanation</h4><p className="ii-disclosure">{pair.ai_verdict || 'No AI explanation was returned. Review the code previews and similarity score yourself.'}</p><div className="ii-code-grid">{[pair.student1,pair.student2].map((s,index)=><div key={s.id}><h4>{s.name}</h4><p>{s.username} · {s.language} · {s.status}</p><pre>{(index ? pair.code_preview2 : pair.code_preview1) || '(No code preview)'}</pre><small>Preview only · first 600 characters supplied by the server</small></div>)}</div></div></details>)}
    </section>}
  </section>
}
