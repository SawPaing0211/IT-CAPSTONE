# Forge.Dev owner roadmap — 25 October 2026

**27 October update:** the active deadline assessment is [Delivery assessment](C:/Users/Christian/forge-dev/docs/DELIVERY_ASSESSMENT_2026-10-27.md). Defense8 November, testing this week, target freeze5 November. Localization and C.1 are delivered/unapproved (hashes verified); C.1 independent review first. Earlier prerequisite/next-deliverable wording below is historical. No work beyond the two earlier approved scopes is authorized by the assessment.

**Goal: a safe, supervised school test of the core learning journey—not every feature finished.** This roadmap uses existing reviews; no new broad audit or application change was performed. Claude implements; Codex designs and independently reviews. “Built in a candidate” does not mean integrated into the running app.

## 1. UI/design: approved, built, integrated

| Work | Current position |
|---|---|
| Simple Adventure navy/violet direction; professional instructor/admin screens | Direction approved. Earlier brown/cream previews are superseded. |
| Pack 02 dashboard party/cave artwork, all four people, 130px phone hero | Built and approved in the **isolated preview**; not integrated into the running app as the new dashboard. |
| 14 achievement medals plus fallback, earned/locked variants | All **30 variants built**, mapped to real achievements and visually accepted; small-size/phone/accessibility/performance checks and final integration package remain. |
| Four-person moonlit landing scene and separate animation layers | **Four layers built** and visually accepted. Phone composition/live interface copy and technical checks remain. The party stays still. |
| Running app | Earlier UI remains. The reviewed readiness corrections and new artwork packages are still unapplied. No new visible redesign is claimed integrated. |

[Visual approval](C:/Users/Christian/forge-dev/docs/design-assets/2026-10-23/APPROVAL_AND_VERIFICATION.md) · [remaining design checks](C:/Users/Christian/forge-dev/docs/design-assets/2026-10-23/DESIGN_PREPARATION_REVIEW_2026-10-24.md).

## 2. What must work before participant testing

Progress is measured by completed workflows:

| User workflow | Progress and remaining gate |
|---|---|
| Admin issues accounts → enrolls students → student changes temporary password → signs in | Provisioning/enrollment/forced-change paths demonstrated with synthetic accounts. Rehearse the complete chosen session setup; create no participant accounts until authorized. |
| Instructor manages own classes → students see only allowed content → instructor reviews work | Head-account and class-boundary corrections passed isolated review. They still need controlled integration and browser/direct-request regression on the chosen session candidate. Do not describe the running app as already corrected. |
| Student writes → saves/reopens draft → Runs → confirms final Submit → sees result/XP → reopens read-only code | **Blocked:** incomplete output can receive full credit; Windows capture fails ordinary execution; declared dependencies fail a clean install. Preserve earlier scoring/input fixes. Close session-expiry/save/Submit failure handling so the screen never pretends a failed operation succeeded. |
| Student earns an achievement → receives one correct celebration | Award/notification corrections have isolated evidence in earlier candidates; preserve them and verify the connected journey after integration. A missed celebration must not undo committed Submit. New medal art is not required for grading safety. |
| Staff uploads material or exports CSV | Fix actual upload-size enforcement/recorded size and spreadsheet-formula-safe exports before exposing these functions. A feature may be excluded only through reviewed server-side disabling and denial checks—not “please don't click it.” |
| Session is interrupted → staff restores all saved work and attachments | **Blocked:** incomplete backups can look valid; complete restore and lossless recovery/write control are not demonstrated. Rehearse with synthetic records/files; no live migration or historical correction. |

Also required: a debugger-off, reviewed session configuration; agreed data collection/retention/access; exact date and connectivity; and separate browser/API versus real-Docker measurements to set a safe operating limit. The tentative owner estimate of 100–200/below 400 is **not demonstrated capacity**.

### Bounded testing-ready scope

Propose **one school-approved introductory subject, two test sections, prepared lessons and a small set of quests**. Students use individual synthetic-profile accounts, forced password change, drafts, Run, one final Submit, result/XP and read-only history. Instructors manage only their assigned test classes and review submissions. Administrators provision/enroll/recover the session. Exercise only selected languages that pass real grading; explicitly disable unavailable languages/features rather than leaving broken paths reachable. Use measured, possibly staggered cohorts; no participant limit is set yet.

This is a proposed supervised evaluation scope, not formal UAT, curriculum approval or permission to issue accounts. Synthetic identities still generate genuine participant code/progress/feedback. Any confidentiality, authorization, grading or recovery defect reachable in this scope remains a blocker.

## 3. What can wait until after that test

- Elaborate landing animation, extra effects, further collectible art and broad visual expansion. Static approved artwork is sufficient initially; usable contrast, keyboard access and readable code are not optional.
- Advanced analytics, expanded leaderboard presentation, extra dashboards and unsupported achievements. Keep known-inaccurate analytics out of the evaluated scope and clearly unavailable where needed; actual cross-class disclosure is never deferred as cosmetic work. Never invent achievement rules.
- Self-registration, additional curricula/features, permanent hosting and broad refactors/upgrades. None is required for a measured supervised laptop-hosted session.
- Historical XP reconciliation remains a separate evidence-and-approval decision; it is not a prerequisite cleanup task and must not be inferred from duplicate awards.

## 4. What closes the current output-capture batch

**Current checkpoint,25 October:** the standalone P0 reader-portability gate is accepted on the corrected native delivery. That has not changed the running application. The [P1 brief](C:/Users/Christian/forge-dev/docs/P1_PROTECTED_COLLECTOR_IMPLEMENTATION_BRIEF_2026-10-25.md) now defines the smallest protected-collector/bundle experiment and its remaining G1–G4 prerequisites. **Plan appendix only; no implementation approval.** Application Run/Submit, timeout attribution, multi-language/dependency regression and recovery gates remain later work.

It must prove **all output was received**, not merely that the program exited or the bytes looked well formed. Matching first output plus a lost wrong tail must never receive credit. The reviewed proposal is a protected producer-side collector sealing bounded output and authenticated counts/hashes before transfer; its privilege/trust design still needs approval before code.

Closure requires the actual Run/Submit journey to distinguish correct output, wrong output, student limits and genuine infrastructure faults; preserve score/XP and the single final attempt; allow retry after genuine capture failure; work natively on Windows and the target Linux setup; use reproducible compatible dependencies; and stop readers/containers within measured resource bounds. Missing/truncated/tampered result evidence must fail safely. Keep the original/replacement probes separately labeled and remove expected-failure status only when the desired behavior genuinely passes.

[Current independent review, approach and acceptance criteria](C:/Users/Christian/forge-dev/docs/reviews/BATCH_B12_INDEPENDENT_REVIEW_2026-10-25.md). Next: **Claude returns only the P1 G1–G4 prerequisite appendix; separate review and explicit authorization precede collector implementation.**

## 5. When visible UI integration resumes

Design-only proof preparation can continue now, separate from application edits. After the critical learning/permissions/recovery gates above are reviewed, propose a controlled local integration: **static student dashboard and medals first**, professional staff styling next, landing/motion later. Claude owns application integration; Codex reviews the connected workflows, phones and accessibility. Approve a concrete, technically verified asset package before integration, and obtain explicit authorization before updating the running app.

The existing interface can support a bounded test once safe and usable; testing need not wait for every new artwork screen or animation. Capture closure alone does not clear backup/recovery or authorize integration. No dates are promised until the school date is confirmed and the workflow gates pass. No commits, deployment, live changes or migrations are authorized by this roadmap.
