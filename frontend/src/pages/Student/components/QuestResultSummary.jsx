import passedCrest from '../../../assets/results/passed-crest.webp'
import partialCrest from '../../../assets/results/partial-crest.webp'
import failedCrest from '../../../assets/results/failed-crest.webp'

export default function QuestResultSummary({ output, xpGained, language, remainingLanguages = [] }) {
  const cases = output.test_results || []
  const passed = output.passed ?? output.passed_cases ?? cases.filter(t => t.passed).length
  const total = output.total ?? output.total_cases ?? cases.length
  // A request/capture error is not a failed student answer. A pass needs an
  // actual result, never equality between two absent counts.
  const unavailable = (!output.is_saved_final && output.status === 'error') || !!output.error || !Number.isFinite(Number(total)) || Number(total) <= 0
  const accepted = !unavailable && output.status === 'accepted' && total > 0 && passed === total
  const partial = !unavailable && !accepted && passed > 0
  const tone = unavailable ? 'border-violet-300/30 bg-violet-400/5 text-violet-200'
    : accepted ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300'
      : partial ? 'border-amber-300/40 bg-amber-300/5 text-amber-200' : 'border-rose-400/30 bg-rose-400/5 text-rose-300'
  const earnedXP = output.is_run_mode ? 0 : (output.xp_earned ?? (accepted ? xpGained : 0) ?? 0)
  const title = output.is_saved_final ? `Saved final · ${language === 'csharp' ? 'C#' : language === 'java' ? 'Java' : 'Python'} · ${output.status.replaceAll('_', ' ')}` : unavailable ? 'Execution could not finish'
    : accepted ? (remainingLanguages.length && !output.is_run_mode ? `${language} cleared` : 'Victory! All tests passed!')
      : partial ? 'Some tests passed — keep refining' : 'No tests passed'

  return <div role="status" className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${tone}`}>
    {unavailable ? <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" /></svg>
      : <img src={accepted ? passedCrest : partial ? partialCrest : failedCrest} alt="" aria-hidden="true" width="56" height="56" className="h-14 w-14 shrink-0 object-contain" />}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold leading-relaxed">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">
        {output.is_saved_final ? `Stored result · Passed ${passed}/${total} tests · Viewing does not award XP`
          : unavailable ? 'Review the message below. No successful result is available.'
          : output.is_run_mode ? `Run preview · Passed ${passed}/${total} tests · Not submitted · No XP`
            : `Final result · Passed ${passed}/${total} tests`}
      </p>
      {!output.is_run_mode && !unavailable && output.scoring_note && <p className="mt-1 text-xs text-slate-400">{output.scoring_note}</p>}
      {accepted && !output.is_run_mode && remainingLanguages.length > 0 && <p className="mt-1 text-xs text-amber-100">Answer {remainingLanguages.join(', ')} to clear the quest.</p>}
    </div>
    {output.is_saved_final && <p className="ml-auto whitespace-nowrap text-sm font-bold text-amber-200 tabular-nums">Recorded quest score: {output.score ?? '—'} XP</p>}
    {!output.is_saved_final && !output.is_run_mode && !unavailable && earnedXP > 0 && <p className="ml-auto whitespace-nowrap font-cinzel text-xl font-bold text-amber-200 tabular-nums">+{earnedXP} XP</p>}
  </div>
}
