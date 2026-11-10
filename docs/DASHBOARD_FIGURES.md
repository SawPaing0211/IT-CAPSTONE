# What the instructor dashboard numbers mean

| Card / figure | Source | Calculation | Not counted |
|---|---|---|---|
| Total Students | `GET /api/instructor/dashboard-stats` -> `total_students` | Distinct students enrolled in any section the instructor teaches. A student in two of the instructor's classes counts once. (Before this change the card added up the per-class counts, so such a student counted twice: 14 shown for 12 people in the demo.) | Students in other instructors' classes |
| XP earned (was "Avg Class Score"; API field still named `avg_score`) | `avg_score` and `avg_score_basis` in the same response | 100 x (sum of XP earned) / (sum of XP available), over the final graded submissions of those students on this instructor's **published** quests. XP earned is `Submission.score`; XP available is that quest's `xp_reward`. Rounded to a whole percent. **It is an XP ratio, not an academic grade and not a test-case correctness rate**: partial-credit XP, the 10 % floor XP for failed attempts and quest weights all affect it, and no passing mark is defined. The card is labelled "XP earned" with the caption "x/y students submitted" and a tooltip saying so. | Students who have not submitted are **not** treated as zero: they are absent from both numerator and denominator. The card shows "x/y students submitted" so the reader can see how many are included. Unpublished quests and quests with 0 XP are excluded |
| Pending Reviews, Active Problems | same response | unchanged | |
| Success Rate (Analytics page) | `success_rate` | **UNVERIFIED.** Believed to be accepted submissions / all submissions in the Analytics scope; the definition, scope and denominator have not been audited and the figure must not be quoted as a measured result until reviewed | |

Problems found and fixed:
- The old average divided every submission's score by a fixed 100, although `score` is XP and a quest's maximum is its own `xp_reward` (Easy 100, Medium 250, Hard 500 at most). A full-marks Medium quest counted as 250 %, and a floor-XP result on a Medium quest counted as 25 %. Example used in the tests: 100/100 XP (Easy) and 25/250 XP (Medium) is 36 %, not the old 63 %.
- The "Above passing / Below passing" caption used a 70 % threshold that no policy defines; it is removed. The Analytics insight text that claimed the class was "above passing threshold" is removed for the same reason. A pass mark can be added once a grading policy is approved.
- Per-quest "average score" on the quest submissions page (`ProblemSubmissions.jsx`) is separate: the mean XP of students who submitted that quest, shown in XP (not percent), unchanged.

Tests: `tests/test_score_and_deadline.py` (known synthetic examples, never above 100 %, zero with no submissions).
Status: no further dashboard formula is to be changed until the definitions above have been reviewed.
Limits: the figure mixes quests of different weights by XP (a Hard quest weighs more than an Easy one); it does not distinguish classes when an instructor teaches several; the demo has no real-class data.
