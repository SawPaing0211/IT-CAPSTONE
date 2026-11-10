# Proposed November 4 quest bank — REVIEW ONLY

Owner requested this separate content package on October 27. No quest is instructor-approved, imported, published or associated with an approved subject. It does not verify the client's curriculum. Use **quests** in delivery documentation and UI; preserve implementation field names where necessary.

Proposed quantity: **four quests** progressing from input/arithmetic through selection to loops. Planning assumption: **90 minutes total**, approximately 15 minutes for onboarding/forced password change and instructions, 55 for quests, 10 for instructor/admin journeys and 10 for feedback. Duration is unconfirmed. Completion of every quest is not an eligibility requirement for participants; keep all four available only after full grading readiness. This is a suggested session format, not a replacement for the owner's mandatory workflows or languages.

| Quest | Learning focus | Complete test set | Proposed effort |
|---|---|---|---|
| Q01 Combine Two Integers | Input, signs, arithmetic | 1 visible + 5 hidden | 5–10 minutes |
| Q02 Greatest of Three | Conditions, negative values, ties | 1 visible + 5 hidden | 8–12 minutes |
| Q03 Sum the Even Numbers | Loop/accumulator or equivalent formula; 64-bit result | 1 visible + 5 hidden | 12–18 minutes |
| Q04 Sum the Digits | Loop, remainder/division, sign/zero handling | 1 visible + 5 hidden | 12–18 minutes |

Students may choose Python, Java or C# for every quest. Statements, constraints, expected outputs and grading configuration must be identical across languages. No algorithm restriction: the alternatives are deliberately valid. Proposed normalized score is 100 per quest with identical instructor-reviewed scoring parameters across languages; this is content configuration for review, not a change to scoring/XP code or an approved XP amount. Freeze actual settings with the instructor before import. Keep Run ungraded/unlimited and the confirmed single final Submit behavior.

## Files and protection

- `Q01`–`Q04/QUEST.md` and `PUBLIC_QUESTS.json`: proposed student statements and visible examples.
- `REVIEWER_ONLY_TESTS.json`: complete expected outputs, purposes and visibility. **Instructor/reviewer only. Do not put this file, reference solutions, intentionally incorrect solutions or this whole directory in student frontend assets or an API response.** No hidden tests are published by this package.
- Each `reference/` contains primary and alternative Python, Java and C# solutions. Each `incorrect/` contains one deliberately wrong logical solution per language, clearly separated from valid references.
- `REFERENCE_CHECK_RESULTS.json`, `verify_python_references.py`: reproducible finite, in-process Python content arithmetic checks. These are not Docker grading, API, database, timeout, recovery or capacity evidence.
- `MANIFEST_SHA256.txt`: immutable content identity for review; any content change needs a new reviewed revision.

All inputs are valid under the statement. No registrar/student data or real participant details. Only standard whitespace-separated input and decimal integer output; no prompts. Java reference entrypoint is `Solution.main(String[] args)`; C# is `Solution.Run()` for the existing wrapper. A supported student Main signature may be rewritten by the reviewed adapter, but that path still requires actual verification. Java uses `long`; C# uses `long` where the range demands it. UTF-8 source and LF newlines are intentional.

## Evidence and limitations

Independently authored hard-coded expected outputs were cross-checked with separate arithmetic oracles. Both Python references pass every complete test and 441/125/102/304 additional vectors respectively; each intentionally wrong Python solution is rejected by at least one complete case. Java/C# algorithms and entrypoints were manually inspected for equivalence, including integer width and sign/zero handling. **Java/C# have not been compiled or executed; their incorrect variants have not been tested by the real grader.** T2/T3 remains held. No claim that all three reference sets are fully verified is made.

Before approval for use: instructor/owner checks topic fit, difficulty, statement, hidden coverage, time and scoring; authorized project-image checks execute both valid references and every deliberately wrong solution in all three languages through Run and final Submit, including persisted score/XP/attempt behavior. Add separate controlled compilation/runtime/timeout/transport tests from the existing grading matrix; content answers alone do not establish these. Validate visible/hidden redaction and input normalization on the composed candidate. Demonstrate recovery of these quest definitions and genuine-shaped drafts/submissions.

## Reservation incompatibility — do not remove cases to fit

Every quest intentionally has six cases, covering distinct boundary/sign/tie/loop faults. Current provisional per-case accounting gives:

| Language | Six-case worst-case reservation accounting | Admission window | Current outcome |
|---|---:|---:|---|
| Python | 6 × 130 = 780 seconds | strictly below 840 seconds | Arithmetic admits; native proof still open |
| Java | 6 × 173 = 1,038 seconds | strictly below 840 seconds | Refused |
| C# | 6 × 248 = 1,488 seconds | strictly below 840 seconds | Refused |

These are conservative accounting bounds, not measured latency or participant capacity. They cannot be used to promise a 90-minute session or parallel throughput. The four-/three-case compiled-language ceilings are incompatible with this proposed complete bank. Do not silently drop hidden cases, shorten the actual language limits, extend the 900-second reservation or split a final attempt. Claude must return a concrete bounded design (for example compile once with isolated case executions and explicit output/attempt/cleanup accounting) for review before implementation authorization. Merely naming that approach is insufficient. A tighter budget needs demonstrated bounded calls and cleanup, not optimistic typical times.

School content approval, compiled-language reservation design, actual-image reference accuracy and connected G/S/R verification remain required before these quests can be used on November 4. No import or publication authority is implied.
