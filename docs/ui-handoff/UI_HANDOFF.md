# Forge.Dev UI design handoff

Status: preparation only. No visual direction is chosen and no UI rewrite has been done. Everything here was captured from an isolated, synthetic demo database. Nothing was committed, deployed, or applied to real data or a live database.

## 1. What the captures are (and are not)

- Source: `frontend` as it is in the working tree (includes the Batch 4 changes), served locally against a throwaway SQLite demo database seeded by `backend/seed_demo.py`. The seed drives the app's own endpoints, so access rules, XP, password rules, and the one-graded-submission rule apply to it.
- Screenshots: `docs/ui-handoff/screens/` — desktop is 1280 wide; "mobile" shots are about 500 px wide (the narrowest headless Firefox allows; the app's own phone layout is what shows, not a real phone). Names are `<ID>_<screen>_<desktop|mobile>.png`.
- Not real: all names (e.g. "Dan Santos"), IDs (`DEMO-0001`…), staff, instructors and the administrator are fictional. Subjects are the provisional first-year list already in the code (institution/campus and official prospectus are still PENDING). Class codes (29022, 29023, 29030, 30011) are invented.
- Code runner: the real grader needs Docker, which was not available. A demo-only stub supplies pass/fail results, so what the **Run** console and the instructor's "Student Code Viewer" show are stub results, not real grading.
- Not captured: short recordings, the app-level loading spinner, an instructor with no classes, and screens of the sandbox actually running code (Docker). Not reviewed in detail: Bounty Board, Hall of Champions, Hero Sheet, Sandbox, Instructor Analytics/Plagiarism (captured, but no deeper notes below).
- Scheduled/unpublished announcements are **not supported** by the data model (no schedule or draft field). Unpublished lessons and quests are supported and are in the demo (one draft module, one draft quest).
- Hidden test cases exist in the demo data; no capture shows hidden inputs or expected outputs.

## 2. Demo accounts and data (details; no passwords)

Passwords are random and written only to `demo_credentials.local.txt` in the local demo working folder (gitignored; not in the ZIP).

| Account | Role | Purpose |
|---|---|---|
| DemoAdmin | administrator | head administrator for the demo |
| demo.instructor1 | instructor | class codes 29022 and 29030 |
| demo.instructor2 | instructor | class codes 29023 and 30011 |
| DEMO-0001 | regular student | two subjects (29022, 29030), light progress |
| DEMO-0002 | irregular student | two subjects in different sections (29022, 30011) |
| DEMO-0003 | new student | no activity; starts on a temporary password (forced change) |
| DEMO-0004 | active student | five submissions with different outcomes (accepted, partial, wrong answer, error, timeout) |
| DEMO-0005…0012 | classmates | leaderboard and class lists |

Content in class 29022: 5 coding quests (Easy/Medium/Hard), 2 debugging quests, 1 Event Quest (due in 5 days), 1 closed quest (due 3 days ago), 1 due-soon quest, 1 unpublished draft. Lessons across 4 weeks (3 published with a sample PDF handout, 1 draft). Three announcements with low/medium/high priority, one pinned, one long. Test cases per quest: 2 visible, 2 hidden.

## 3. Cross-cutting facts and functional constraints to preserve

Any redesign must keep these (they are policy or security, not styling):

1. **Run vs Submit.** Run: unlimited, not graded, no XP, never shows hidden tests. Submit: one final graded submission per student per quest, behind a confirmation dialog that saves the draft first; infrastructure failures do not consume it; after submitting the editor is read-only and the quest shows as completed.
2. **Drafts** persist on the server per student per quest and survive reload.
3. **Sign-in** accepts the student ID or the generated `<student_id>@student.com` identifier (an identifier, not an inbox). Staff use staff emails. Student year level is never collected.
4. **Temporary passwords**: accounts created by an administrator or CSV import must change the password at first sign-in; nothing else loads until they do. Administrator reset can generate a temporary password that is shown once.
5. **Change password** lives in each role's account menu (avatar/name dropdown).
6. **Roles and routes**: `/student`, `/instructor`, `/admin`; the wrong role is redirected to the landing page; an invalid session returns to the sign-in page.
7. **Scope**: students see only their enrolled class codes; instructors only their assigned class codes; only first-year (supported) subjects can be assigned.
8. **XP rules** (existing, unchanged): easy/medium/hard maximum 100/250/500; partial and failed attempts earn a 10 % floor of the reward; levels derive from XP. Timeout currently earns the floor too (open question for the supervisor).
9. **Enrollment** only by administrator CSV (regular = one row per class code, irregular = one row per class code for the same ID) or manual creation.
10. Quests and lessons belong to specific class codes; the quest wizard sets the subject from the chosen class.

## 4. Screen inventory

ID prefixes: **S** student, **I** instructor, **A** administrator, **X** access/error states. "D" = desktop capture, "M" = narrow capture.

### Public / sign-in

| # | Screen | Role · how to reach | Purpose and main actions | Data/state shown | Existing problems seen | Files |
|---|---|---|---|---|---|---|
| S01 | Sign-in | anyone · `/auth` (from landing "Login") | enter ID/email + password, show/hide password | empty form | footer says "Server Online · Secure Connection" always (static, even when the server is down, see X03) | D, M |
| S02 | Sign-in, wrong password | anyone | error feedback | generic error | none notable | D, M |
| X03 | Sign-in, server unreachable | anyone | error feedback | raw browser text "NetworkError when attempting to fetch resource." next to "Server Online" | unfriendly message and contradictory status | D |
| S03 | Forced password change | student/staff with temporary password · after sign-in | choose own password; or sign out | modal over blank page; hint "8+ characters with a letter and a number" | none after this batch's fix (it previously rendered a blank screen; see report) | D, M |
| S04 | Forced change, filled | same | field entry (masked) | | | D, M |
| S05 | Forced change, validation error | same | shows the first failing rule ("At least 8 characters.") | one error at a time | mismatch/length checked in order only | D, M |
| S33/S34 | Forced change success → dashboard | same | after success the normal dashboard loads | | no success confirmation message | D, M |
| X01 | Student opens `/admin` | student | redirected to landing page | landing page | no "not allowed" explanation | D |
| X02 | Invalid/expired session | any | redirected to sign-in | sign-in | no "session expired" message | D |

### Student

| # | Screen | Role · path | Purpose and actions | Data/state | Problems | Files |
|---|---|---|---|---|---|---|
| S06 | My Subjects (home) | student · after sign-in, top tab "My Subjects" (M: bottom "Subjects") | switch between enrolled subjects, open a course | level, XP, streak header; subject cards with class code, semester (provisional), instructor; totals (subjects, quests done, XP) | long subject names truncate; level/XP/streak header is dense on narrow screens; semester label is provisional data | D, M |
| S07 | Account menu | student · avatar/name dropdown | My Progress, **Change password**, Logout | name, ID, generated sign-in identifier, level, XP | on narrow screens the name is hidden (avatar only) | D, M |
| S08 | Course: Lessons | student · My Subjects → Open Course → Lessons | read modules by week, download handouts | published modules only; draft module is hidden | none notable | D, M |
| S09 | Course: Announcements ("News" on narrow) | student · course tab | read announcements | priority, pinned, long text | priority not visually strong | D, M |
| S10 | Course: Quest Board ("Quests") | student · course tab | browse quests, filter All/Coding/Debugging/Event | cards: title, difficulty, XP, rarity, due date, language | cards do not show state (conquered / in progress / closed / due soon); closed quests look identical to open ones; the pill filter row is not obvious on narrow screens | D, M |
| S11 | Course: Quest Log ("Log") | student · course tab | see progress per quest | conquered / partial / wrong / timeout / error / not started; XP earned of max; success rate | outcomes named in game terms; same status colors as elsewhere not defined | D, M |
| S12 | Course: Sandbox | student · course tab | free coding area, no grading | | not exercised (no Docker) | D, M |
| S13 | Quest workspace: problem | student · Quest Board → card | read the task | title, difficulty, XP, type, examples, limits; left tabs Problem / Test Cases / Hints | on narrow screens there are **two stacked tab rows** (Problem·Code, then Problem·Test Cases·Hints) | D, M |
| S13b | Workspace: code tab (narrow only) | student | write code | | extra tap needed to reach the editor | M |
| S14 | Workspace: visible test cases | student | see sample cases only | visible cases | hidden cases are not hinted at | D, M |
| S15 | Workspace: hints | student | reveal hints | hint count badge | | D, M |
| S16 | Run result: passed | student · Run (Ctrl+Enter) | ungraded trial | "Run mode • Passed n/n", per-test result | stub results in this demo | D, M |
| S17 | Run result: failed | student | ungraded trial | failed tests with expected/actual (visible only) | long output needs scrolling; console sits below the fold on short screens | D, M |
| S18 | Draft restored | student · reopen the quest | last autosaved code comes back; "Saved" indicator | | indicator is small | D, M |
| S19 | Submit confirmation | student · Submit | warns it is graded once and cannot be repeated; Keep editing / Submit final answer | | | D, M |
| S20 | Submitted result | student · after confirming | outcome, score, XP gained | | | D, M |
| S21 | Submitted, read-only | student | editor locked; button shows "Conquered" | | button label is gamified; no explicit "submitted on <date>" | D |
| S22 | Closed quest (past due) | student | read-only view of an overdue quest | due date | not clear from the board that it is closed | D, M |
| S23 | Submit refused, past due | student | server refuses ("Deadline passed") | error message | message presentation not captured clearly on narrow | D, M |
| S24 | Event Quest | student · filter Event Quests | time-boxed quest | EVENT badge, due date | | D |
| S25 | Quest Log after submit | student | shows the new result | | | D |
| S26 | Bounty Board | student · top tab ("Bounty" on narrow) | cross-subject quest list | not reviewed in detail | | D, M |
| S27 | Hall of Champions | student · top tab ("Champions") | leaderboard (global) | top 20 by XP | not reviewed in detail | D, M |
| S28 | Hero Sheet | student · top tab ("Hero") | achievements, stats, language progress | success rate, streak, achievements | language bars show 0/0 for unused languages | D, M |
| S29 | Sandbox (global) | student · top tab | free coding | | not exercised (no Docker) | D, M |
| S30 | My Progress | student · account menu | personal stats | | | D, M |
| S31 | Change password dialog | student · account menu | voluntary change; signs out other sessions | | | D, M |
| S32 | Notifications | student · bell | list of recent notices | badge count | | D, M |
| S35 | Dashboard, new student | DEMO-0003 | empty state: 0 quests, 0 XP, level 1 | | no guidance on where to start | D, M |
| S36 | Quest Log, new student | same | empty progress | all "not started" | | D, M |
| S37 | Hero Sheet, new student | same | empty stats | | | D, M |

### Instructor

| # | Screen | Role · path | Purpose and actions | Data/state | Problems | Files |
|---|---|---|---|---|---|---|
| I01 | Dashboard | instructor · `/instructor` | overview; shortcuts to create quest / post announcement | totals, "avg class score", pending reviews, my classes, recent activity | header shows "All Systems OK" and "+13 this week"-style text that look like fixed strings; origin of "avg class score / above passing" not verified | D, M |
| I02 | Account menu | instructor · avatar dropdown | Change password, Logout | | | D, M |
| I03 | My Classes | instructor · "My Classes" | choose a subject → class code | subject cards, student counts, search | two-step navigation (subject, then class code) | D, M |
| I04 | Class detail | instructor · My Classes → class | summary tiles (students, quests, modules, announcements) | | **fixed in this batch:** announcements tile always showed 0; the modules count is by subject, not by class code | D, M |
| I09 | Class students | instructor · class → Students | roster with progress | | | D |
| I10–I12 | Class tiles: quests, modules, announcements | instructor | the tiles do not navigate; they only show counts | | tiles look clickable but are not (except Students) | D |
| I05 | Quest management | instructor · `/instructor/problems` | list, edit, delete, publish quests | | delete/edit icons only; no filter by class or status; destructive icon next to edit | D, M |
| I06/I14/I15 | Announcements | instructor · Announcements → subject → class | list, post (priority Low/Medium/High/Urgent, pinned), edit, delete | | three-step picker; no scheduling or draft state (not supported by data model) | D, M |
| I07/I16 | Course materials | instructor · Materials | modules by week; New Module (Draft vs Publish), upload handouts | published/draft counts | | D, M |
| I17/I17b | Create quest: pick class → step 1 | instructor · Create Quest | wizard start; subject locked from class | | | D, M |
| I20–I26 | Quest wizard steps | instructor | Basic info → Problem type & languages → Visibility → Starter code → Test cases (mark hidden) → Hints → Review | validation on empty title | seven steps, no save-as-draft per step indicated; validation shown only on Next | D |
| I27 | Quest submissions | instructor · quest → submissions | who submitted, status, score | All/Submitted/Pending filters | | D |
| I28 | Student code viewer | instructor · submissions → View Code | read a student's code | **the backend re-runs the code to show test results (it does not use the stored grade), so the shown pass count can differ from the graded result and costs a sandbox run per view** | | D |
| I08 | Achievements | instructor | | not reviewed in detail | | D, M |
| I18 | Analytics | instructor | | not reviewed in detail | | D |
| I19 | Plagiarism check | instructor | pick quest, threshold, run scan | | | D |

### Administrator

| # | Screen | Role · path | Purpose and actions | Data/state | Problems | Files |
|---|---|---|---|---|---|---|
| A01 | Dashboard | admin · `/admin` | overview, quick actions (create user, class codes, backup, settings) | counts, activity, system status | "All Systems OK", "99.9 % uptime", "↑ +12 %" trend badges are fixed strings, not measurements | D, M |
| A02 | Account menu | admin · avatar | Change password, Logout | | | D, M |
| A03 | Class Codes | admin · "Class Codes" (M: bottom "Classes") | sections per subject, enrollment, Upload CSV, Create Section, **Delete All** | subject cards with enrollment | "Delete All" sits beside routine actions | D, M |
| A04 | User Management | admin · "User Management" ("Users") | users and subjects tabs, Add User, Upload CSV, Export CSV, **Delete All Students**, per-row Manage / Recover / Delete | role, ID, class codes, level, XP, status | destructive bulk actions in the main toolbar | D, M |
| A05 | Instructor Assignments | admin | assign an instructor to a class code (one instructor per class code) | | | D, M |
| A06 | Activity Logs | admin | audit trail, filter by action/date, Critical only, Export CSV | | | D, M |
| A07/A08 | Create user | admin · User Management → Add User | username, generated sign-in identifier (students), password, role, optional class code; validation | | | D, M (A07) |
| A09/A18/A19 | CSV enrollment | admin · Upload CSV | preview first rows, enroll, result summary | preview showed "0 Issues" for a row with **no section_no**; result then reports the error; result panel still says "Auto-generated credentials ready — Download" although 0 accounts were created | preview does not validate; misleading credentials notice | D |
| A10 | Reset password | admin · row → Recover | set or **generate a temporary password** (shown once, then forces change) | | the demo captured the first row (the admin's own account) | D, M |
| A11 | Edit user | admin · row → Manage | | | | D |
| A12 | Subjects | admin · User Management → Subjects | list, New Subject | provisional first-year list | | D |
| A13 | Create section | admin · Class Codes → Create Section | | | | D |
| A14 | Class codes expanded | admin | enrollment per section | | | D |
| A15 | Assign instructor | admin | | | | D |
| A16 | System settings | admin · Settings | maintenance flag only; other values read-only | | | D |
| A17 | Database backup | admin · Backup DB | full / selective export, warning about sensitive data | | | D |

## 5. Issues found while capturing (beyond per-screen notes)

Fixed in this working tree during capture (small, no UI redesign):
1. A student on a temporary password saw a **blank screen** instead of the forced change dialog (the sign-in flow did not carry the flag, and the dashboard crashed on the refused API calls). Fixed in `Auth.jsx` and `App.jsx`. I did not test this in a browser before this batch; the unit tests only cover the API.
2. Instructor class page showed announcements "0" always (hard-coded); now counts real rows.

Open (not changed; for the supervisor or the next batch):
3. Several status/metric displays look measured but are fixed strings: landing statistics ("12,847 quests solved", "2.4M XP", "847 players"), sign-in footer "Server Online", admin "All Systems OK / 99.9 % uptime / ↑ +12 %", instructor "All Systems OK". These should be removed or made real before any client demo.
4. The code editor loads from a public CDN at runtime; on a campus network without access to it the editor never loads ("Loading…").
5. The instructor Student Code Viewer re-executes code instead of showing the stored grade (see I28).
6. Quest Board cards do not show completion/closed state; the Quest Log does.
7. The CSV preview does not flag rows with a missing section; the result always offers a credentials download.
8. Destructive bulk actions (Delete All, Delete All Students) are in the primary toolbars.
9. Network errors are shown as raw browser text.
10. Class "modules" count is per subject, not per class code.

## 6. How to regenerate the captures

`docs/ui-handoff/tools/` holds the capture scripts; `backend/seed_demo.py` builds the demo database. They need a throwaway SQLite file named with "demo", `FORGE_DEMO=1`, and the front end built with `build_fe.sh` (demo-only copy that bundles the editor locally because the sandbox had no CDN access; the project's own files are not changed). Re-running the seed deletes and recreates only that demo file and writes new random passwords.

## 7. Updates after the focused corrections (baseline screens unchanged)
Corrected captures: `screens-after-corrections/C01–C07`. Resolved from §5: invented statistics/health claims removed; editor bundled locally; code viewer shows the stored result (legacy rows flagged); CSV preview matches the server's rules; demo banner added (results are simulated, not grading evidence).
Redesign requirements: present quest states (available / submitted / closed) distinctly per `docs/QUEST_STATES.md`; do not add scheduled announcements or invented metrics; show deadlines in the viewer's timezone; keep the viewer read-only and keep the "recorded result" and "legacy" wording honest; keep the demo banner whenever `execution_mode` is `demo-stub`. Open gap: no screen sets a due date.

## 8. Updates after the second round of readiness checks
New captures: `screens-after-corrections/C08` (Java) and `C09` (C#) editor highlighting with every external network destination blocked, `C10_instructor_xp_earned_ratio` instructor dashboard with the corrected figures.
- **Editor**: runs entirely from the app's own files (core, Python/Java/C# grammars, editor worker); Java and C# highlighting and the worker (word suggestions) were verified with external access blocked. This says nothing about the rest of the app being usable offline: the page, the API and the database must still be reachable (the frontend is planned for Vercel, the backend on a VPS); the only external call left is the optional Gemini API in the backend.
- **Instructor dashboard**: "Total Students" is now distinct students (it double-counted a student in two classes); "XP earned" (not "average score") is XP earned over XP available on submitted work; it is not a grade or a test-case correctness rate and must not be styled or worded as one, unsubmitted students are not counted as zero, and the card says "x/y students submitted"; the invented "Above/Below passing" caption is gone. Definitions: `docs/DASHBOARD_FIGURES.md`. Design note: keep the denominator visible next to the percentage.
- **Deadlines**: the API now rejects an invalid `due_date` (HTTP 400 `invalid_due_date`), treats a value without an offset as UTC, and refuses Submit only strictly after the due instant. No screen sets deadlines yet: a deadline picker is a proposed design decision, see `docs/QUEST_STATES.md`. The visual direction must show open / submitted / closed quests distinctly.
- **Demo data**: the demo seed lists a few lesson attachments that have no file; downloads of those fail. They are demo artefacts, not a defect to design around.

Deadlines: user-facing timezone is Asia/Manila; timestamps sent to the API carry explicit offsets. Analytics "Success Rate" is unverified: do not give it prominence or wording that implies it is measured.
No deadline UI and no further dashboard formula changes until the definitions are reviewed.
