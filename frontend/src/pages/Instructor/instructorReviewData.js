export const displayNumber = value => Number.isFinite(value) ? value.toLocaleString() : '—'
export function scanSummary(result) {
  if (!result || !Array.isArray(result.pairs) || !Number.isFinite(result.total_compared) || !Number.isFinite(result.flagged) || !Number.isFinite(result.threshold)) throw new Error('The scan returned incomplete data. Please try again.')
  if (result.total_compared < 2) return { title: 'Not enough submissions to compare', detail: 'At least two students must submit this quest before a pair can be compared.' }
  if (result.flagged === 0) return { title: 'No pairs exceeded the threshold', detail: `No compared pair reached ${result.threshold}% token similarity. This is not proof of originality.` }
  return { title: `${result.flagged} ${result.flagged === 1 ? 'pair needs' : 'pairs need'} review`, detail: 'Similarity is a review signal, not a plagiarism determination. Review context and student work before drawing conclusions.' }
}
export function validateAnalytics(data) {
  if (!data || !['top_performers','challenging_problems','activity_heatmap','at_risk_students'].every(key => Array.isArray(data[key])) || !['total_students','total_submissions','success_rate','avg_xp'].every(key => Number.isFinite(data[key]))) throw new Error('Analytics returned incomplete data.')
  return data
}
