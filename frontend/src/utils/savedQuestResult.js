// Stored score is historical data, not a fresh XP award or inferred Run result.
export function savedQuestResult(submission, language) {
  if (!submission) return null
  return {
    ...submission,
    language,
    is_saved_final: true,
    is_run_mode: false,
    test_results: submission.results_recorded ? submission.test_results ?? [] : [],
  }
}
