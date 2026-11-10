import { useEffect, useRef, useState } from 'react'
import { formatApiTimestamp } from '../../utils/apiTimestamp'
import { api } from '../../api/client'
import ModuleIcon from './ModuleIcon'
import './InstructorQuestReview.css'

const languageName = language => ({ python: 'Python', java: 'Java', csharp: 'C#' }[language] || language)
const statusName = status => String(status || 'Unavailable').replaceAll('_', ' ')

export default function StudentCodeModal({ submissionId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [reload, setReload] = useState(0)
  const dialogRef = useRef(null)
  const copyTimer = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const oldOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(copyTimer.current)
      dialog.close()
      document.body.style.overflow = oldOverflow
      previousFocus?.focus()
    }
  }, [])

  useEffect(() => {
    let active = true
    // Reset the remote resource state when its identity changes or Retry is used.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setData(null)
    setError(null)
    setCopied(false)
    setCopyError(false)
    api.get(`/api/instructor/submissions/${submissionId}/code`)
      .then(result => { if (active) setData(result) })
      .catch(() => { if (active) setError('We could not load this submission. Check your connection and try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [submissionId, reload])

  const handleCopy = async () => {
    if (!data?.code) return
    setCopyError(false)
    try {
      await navigator.clipboard.writeText(data.code)
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <dialog ref={dialogRef} className="iq-code-dialog" aria-labelledby="submission-dialog-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="iq-dialog-inner">
        <header className="iq-dialog-header">
          <div>
            <p className="iq-readonly"><ModuleIcon name="lock" size={14} /> Read-only submission</p>
            <h2 id="submission-dialog-title">Student code & result</h2>
            {data && <p className="iq-dialog-subtitle">{data.student?.full_name || data.student?.username} · {data.problem?.title}</p>}
          </div>
          <button className="iq-close" aria-label="Close submission" onClick={onClose} autoFocus>×</button>
        </header>
        <div className="iq-dialog-body">
          {loading && <p className="iq-empty" role="status">Loading saved submission…</p>}
          {error && <div className="iq-empty" role="alert"><ModuleIcon name="warning" size={28} /><h3>Submission unavailable</h3><p>{error}</p><button className="ir-secondary" onClick={() => setReload(value => value + 1)}>Try again</button></div>}
          {data && <>
            <div className="iq-code-meta">
              <span className="iq-language">{languageName(data.language)}</span>
              <span>{formatApiTimestamp(data.submitted_at)}</span>
              <button className="ir-secondary" onClick={handleCopy}>{copied ? 'Copied' : 'Copy code'}</button>
            </div>
            <div role="status" className="iq-copy-status">{copyError ? 'Copy failed. You can select the code below and copy it manually.' : copied ? 'Code copied to clipboard.' : ''}</div>
            <div className="iq-code" tabIndex={0} role="region" aria-label="Submitted code"><pre>{data.code}</pre></div>
            <section className="iq-recorded" aria-label="Recorded result">
              <div className="iq-result-heading"><h3>Recorded result</h3><strong>{data.score} <span>XP</span></strong></div>
              <div className="iq-result-meta">
                <span className={`iq-status ${data.status === 'accepted' ? 'iq-status-success' : 'iq-status-warning'}`}>{statusName(data.status)}</span>
                <span>{data.results_recorded ? `Passed ${data.passed_cases ?? 0} of ${data.total_cases ?? 0} tests` : 'Per-test details unavailable'}</span>
              </div>
              <p>Saved at submission. Viewing this result does not run code or change XP.</p>
              {data.execution_mode === 'demo-stub' && <p className="iq-warning">SIMULATED (demo) result, not real execution.</p>}
              {data.error_msg && <pre className="iq-error-message">{data.error_msg}</pre>}
            </section>
            {!data.results_recorded && <p className="iq-warning">{data.note || 'No per-test results were recorded for this submission.'}</p>}
            {data.results_recorded && data.test_results?.length > 0 && <section className="iq-test-section">
              <h3>Per-test results <span>{data.test_results.filter(result => result.passed).length}/{data.test_results.length} passed</span></h3>
              <div className="iq-test-grid">
                {data.test_results.map(result => <article key={result.index} className={`iq-test-card ${result.passed ? 'is-passed' : 'is-failed'}`}>
                  <header><strong>Test {result.index}</strong><span>{result.passed ? 'Passed' : 'Failed'}</span></header>
                  {result.hidden && <p className="iq-hidden"><ModuleIcon name="lock" size={13} /> Hidden from students</p>}
                  <>
                    {result.kind && <p>{statusName(result.kind)}</p>}
                    {result.message && <div className="iq-test-detail"><span>Note</span><code>{result.message}</code></div>}
                    {!result.passed && result.output && <div className="iq-test-detail"><span>Output</span><code>{result.output}</code></div>}
                  </>
                </article>)}
              </div>
            </section>}
            {Array.isArray(data.current_test_cases) && <section className="iq-test-section">
              <h3>Current quest test cases</h3>
              <p className="iq-definition-note">Author view · These are the quest’s current inputs and expected outputs. They may have changed since submission; they are not a snapshot of what ran. Hidden-case output was not retained in older submission records.</p>
              <div className="iq-test-grid">{data.current_test_cases.map(test => <article key={test.index} className="iq-test-card iq-definition">
                <header><strong>Test {test.index}</strong><span>{test.hidden ? 'Hidden from students' : 'Visible to students'}</span></header>
                <div className="iq-test-detail"><span>Input</span><pre>{String(test.input) || '(empty)'}</pre></div>
                <div className="iq-test-detail"><span>Expected output</span><pre>{String(test.expected) || '(empty)'}</pre></div>
              </article>)}</div>
            </section>}
          </>}
        </div>
      </div>
    </dialog>
  )
}
