# Forge.Dev achievement inventory (source inspection)

Date: 23 Oct 2026. Source inspected read-only: `backend/app.py` (model, seed, two GET endpoints), `frontend/src/components/Achievement{Badge,Modal,Toast}.jsx`, `pages/Student/components/ProgressStats.jsx`, `pages/Instructor/InstructorAchievements.jsx`, `backend/seed_demo.py`. Nothing was changed. **The live database was not queried**, so the rows below are what the code seeds, not a confirmed dump of production data (see "What is not confirmed").

## How achievements work
- Table `achievements`: `id, name, description, icon (String(50), NOT NULL), xp_reward, requirement_type, requirement_value, category ('student'|'instructor')`. Table `user_achievements`: `user_id, achievement_id, earned_at, progress`.
- Rows are created **only by the seed** in `app.py` (`if not Achievement.query.first()`: 27 rows, once, on an empty table). There is **no create/edit/delete endpoint, no instructor or admin UI, and no per-class custom achievement.** Instructor-created achievements are **not supported**. The "instructor" category is a fixed set of 15 badges for instructors/administrators, not something instructors author.
- **Icon selection:** the `icon` column is a free-text string (the seed uses one emoji each). The frontend renders it as text inside the badge (`{icon || '🔒'}`); there is no icon key, image or per-type mapping. Empty icon → 🔒 fallback. Colour is only earned (purple→pink gradient, green tick, "+N XP" pill) vs locked (slate, grayscale).
- **Earning:** lazy. Achievements are awarded inside `GET /api/student/achievements` and `GET /api/instructor/achievements` (side effect on GET; also `user.xp += xp_reward` on first award). Nothing else awards them. Only the requirement types listed as "implemented" below have progress code; any other type stays at progress 0 and **can never be earned**.
- Frontend celebration: see the correction below (it compares earned counts between fetches, but the page fetches only once on mount).

## Student achievements (category `student`, 12)
| # | Name | Description (as stored) | requirement_type / value | XP | Icon now | Earnable today? |
|---|---|---|---|---|---|---|
| 1 | First Steps | Complete your first quest | quest_count / 1 | 10 | 🎯 | Yes |
| 2 | Quest Master | Complete 10 quests | quest_count / 10 | 50 | ⚔️ | Yes |
| 3 | Week Warrior | Maintain a 7-day streak | streak / 7 | 20 | 🔥 | Yes |
| 4 | Python Novice | Solve 5 Python quests | python_count / 5 | 15 | 🐍 | Yes |
| 5 | Java Apprentice | Solve 5 Java quests | java_count / 5 | 15 | ☕ | Yes |
| 6 | C# Wizard | Solve 5 C# quests | csharp_count / 5 | 15 | 🔷 | Yes |
| 7 | Hard Coder | Complete 5 Hard quests | hard_count / 5 | 40 | 💀 | Yes |
| 8 | Debug Master | Complete 5 Debugging quests | debug_count / 5 | 30 | 🐛 | Yes |
| 9 | Marathon Coder | Maintain a 30-day streak | streak / 30 | 100 | 🏃 | Yes |
| 10 | Perfect Score | Get 100% on a Hard quest | perfect_hard / 1 | 25 | 💯 | **No: no progress code** |
| 11 | Sandbox Wizard | Run code in Sandbox 10 times | sandbox_runs / 10 | 20 | 🧪 | **No: no progress code** |
| 12 | Leaderboard Champ | Reach Top 10 on Leaderboard | leaderboard / 10 | 50 | **(empty string → 🔒)** | **No: no progress code** |

Actual earning rules (from the code): quest_count/python/java/csharp/hard/debug count **accepted** submissions only (status `accepted`; partial credit does not count), by language or by problem difficulty `Hard` or problem type `debugging`. Counts submissions, not distinct problems. `streak` = consecutive calendar days with **any** submission (any status), counted back from the newest, capped at 30.

## Instructor achievements (category `instructor`, 15; returned to roles instructor and administrator)
| # | Name | Description (as stored) | requirement_type / value | XP | Icon now | Earnable today? |
|---|---|---|---|---|---|---|
| 13 | First Module | Create your first module | lesson_count / 1 | 25 | 📖 | Yes (lessons created by you) |
| 14 | Activity Architect | Create 10 activities | problem_count / 10 | 60 | 🧩 | Yes (problems created by you) |
| 15 | Class Starter | Have a student complete a quest | student_quest / 1 | 20 | 🚀 | Yes (distinct students with an accepted submission on your problems) |
| 16 | Engagement Booster | 80%+ students attempt a quest | engagement / 80 | 40 | 📈 | **No** |
| 17 | Curriculum Builder | Create lessons for 3 weeks | lesson_weeks / 3 | 50 | 🗂️ | **No** |
| 18 | Resource Curator | Attach files to 10 lessons | file_count / 10 | 30 | 📎 | Yes (counts lesson files, not lessons) |
| 19 | Multimedia Master | Add videos to 5 lessons | video_count / 5 | 25 | 🎬 | **No** |
| 20 | Clear Explainer | Lesson with 95% completion | lesson_completion / 95 | 45 | 🗣️ | **No** |
| 21 | Activity Solver | Activity with <10% error rate | problem_quality / 10 | 40 | 🔍 | **No** |
| 22 | Innovation Award | Create a quest with hints | hints_used / 1 | 50 | 💡 | **No** |
| 23 | Student Success | 70%+ students pass all quests | class_pass_rate / 70 | 75 | 🎓 | **No** |
| 24 | Daily Educator | Login and act for 14 days | instructor_streak / 14 | 30 | 📅 | **No** |
| 25 | Semester Veteran | Teach for 16 weeks | weeks_taught / 16 | 100 | 🎓 (same glyph as #23) | **No** |
| 26 | Multi-Class Maestro | Teach 3 different subjects | subjects_taught / 3 | 60 | 🎭 | Yes |
| 27 | Platform Pioneer | Use new features within 1 week | early_adopter / 1 | 20 | 🚀 (same glyph as #15) | **No** |
The code also computes progress for `blocks_taught` and `students_taught`, but no seeded achievement uses them.

## Totals
27 seeded rows: 12 student + 15 instructor. Earnable by current code: 9 student + 5 instructor = **14**. Defined but never earnable: 3 student + 10 instructor = **13** (their requirement types have no progress logic). Student-side types for a medal family: quest count, streak, language (Python/Java/C#), hard, debugging, plus the three unimplemented (perfect score, sandbox runs, leaderboard).

## Active vs demo
- **Active product definitions:** the 27 seeded rows above (assuming the live table was seeded from this code). 14 are actually earnable; 13 are visible but locked forever until progress code exists.
- **Demo-only content in the Simple Adventure preview:** the three fixture achievements "First Quest", "Python Practice", "Steady Coder" are **my invented demo names/wording/XP** (First Quest 20 XP, Python Practice 25 XP, Steady Coder 30 XP); they are not real product achievements and do not match the seed names, descriptions or XP. The preview maps requirement types to three temporary code-drawn medals (star = quest_count/hard_count, flame = streak, code = python/java/csharp/debug count). Earned dates, locked progress "4 of 5/7" and the reward toast are synthetic.
- Correction to my earlier note: I previously said a "Hidden" achievement exists with an emoji string. No such achievement exists in the code. The real oddity is Leaderboard Champ's empty icon (🔒 fallback), plus duplicate glyphs (🎓 ×2, 🚀 ×2).
- `seed_demo.py` does not define achievements; it just calls `GET /api/student/achievements` so they are awarded "the normal (lazy) way".

## What is not confirmed
- Live database contents (rows, edits made via SQL, earned counts): not queried. Seeding only runs on an empty table, so an older or hand-edited database could differ from this list.
- Whether Sandbox runs and leaderboard rank are tracked anywhere that could feed #11 and #12: nothing in the code reads them for achievements.
- Behaviour of awarding on GET under concurrent requests (possible duplicate `user_achievements` rows; no unique constraint seen in the model): not tested. Integration concern only; no change proposed.

## Implications for the medal family (for ChatGPT; no decision made here)
- Needs: a locked variant per medal (cool slate) and earned (gold/violet), a **generic fallback medal** for unknown or empty icons and any future/custom achievement, and a mapping from `requirement_type` (not from emoji) to a medal key. Custom/instructor-authored achievements do not exist today, so a fallback is only insurance.
- Production would need an icon-key field or a mapping table, because the current `icon` field is an emoji string. That is an integration decision; no backend change is authorized or made.

## Corrections added 23 Oct 2026 (after the awarding investigation)
- The achievements API payload does **not** include `requirement_type` or `category`; it returns `id, name, description, icon, xp_reward, is_earned, progress, max_progress, earned_at` (`max_progress` = requirement_value). Any artwork mapping by type needs those two existing columns added to the response.
- The student page fetches achievements once on mount (`useEffect(..., [])`), so the "newly earned" toast/confetti, which needs a later increase in the earned count, cannot fire as written (static reading; not run in a browser).
- Awarding on GET is not concurrency-safe: simultaneous first loads insert duplicate rows (no unique constraint) and can lose XP; see AWARDING_INVESTIGATION.md.
