# Quest (problem) states: what the backend does today

States are derived, not stored. There is no `status` column on a problem.

| State | How the backend decides | What a student can do |
|---|---|---|
| Available | Problem is visible to the class and the student has no final graded submission for it (and, if `due_date` is set, it has not passed) | Run unlimited (ungraded, no XP). Drafts persist server-side. One final graded Submit, after confirmation |
| Submitted | The student has a final graded submission (`submission_slots` row owned by them) | Code is read-only. Further Submit is refused. Run does not change the record |
| Closed | `due_date` is set and has passed | Submit is refused. **The deadline is enforced on Submit only**; Run and viewing still work |

Facts the UI must respect:
- `due_date` is stored as a naive UTC date-time. See "Deadlines" below.
- No instructor screen currently sets or edits a due date. Closed quests are only reachable through the API or data.
- Infrastructure failures (sandbox unavailable) do not consume the final Submit.
- The instructor code viewer reads stored data only: it does not run code, consume an attempt, award XP or change any record.

## Announcements
Scheduled or unpublished (draft) announcements are **not supported**. An announcement is visible as soon as it is created. Ordering is pinned first, then newest first; it is not "sorted by priority" as the baseline Appendix states. Do not add scheduling to match the document; correct the document.

## UI redesign requirement
The redesign must present all three states distinctly on the student quest list and quest page (badge, disabled editor/Submit when submitted or closed, deadline shown in the viewer's timezone) without implying features the backend lacks.

## Deadlines (`due_date`)

**Validation (changed).** `POST /api/problems` and `PUT /api/problems/<id>` now reject an invalid `due_date` with HTTP 400 `{"error": "invalid_due_date", "message": ...}`. Nothing is created or changed in that case (the update is checked before any field is touched), so existing records are preserved. Before this change an invalid value was silently discarded (the quest was saved with no deadline).

Accepted: ISO 8601 date-time strings (`2026-11-05T17:00:00+08:00`, `2026-11-05T09:00:00Z`, `2026-11-05T09:00:00`) and plain dates (`2026-11-05`, meaning 00:00 UTC). Anything else, including numbers, lists and free text such as "tomorrow", is rejected. `null` or an empty string means "no value given".

**Timezone.** A value with an offset or `Z` is converted to UTC. A value **without** an offset is taken as UTC (not the server's or the browser's local time). Stored and returned values are UTC without an offset (`2026-11-05T09:00:00`). A client in Asia/Manila (UTC+8) must send `...+08:00` or convert to UTC, or the deadline will be 8 hours later than intended. The rejection message in the Submit refusal is printed in UTC.

**Exact boundary.** Submit is refused when `now_utc > due_date` (strictly after). A Submit that arrives at exactly the due instant is accepted; one microsecond later is refused with HTTP 403 `Deadline passed`, and nothing is consumed (no attempt, no XP, no record). The comparison uses the moment the server receives the Submit, before grading starts: a graded attempt that began before the deadline is not cancelled by grading time. Run is not affected by deadlines.

**Absent values on update.** `PUT` without `due_date` (or with `null`/empty) leaves the stored deadline unchanged. There is currently no way to remove a deadline through the API; this is part of the proposal below.

### Recorded decision: user-facing timezone
The user-facing timezone for deadlines is **Asia/Manila (UTC+08:00)**. Whatever the interface shows or accepts is Manila time. When a timestamp is sent to the API it must carry an explicit offset (for example `2026-11-05T17:00:00+08:00`); the API stores and compares UTC. A value sent without an offset is read as UTC, so clients must never omit it. Not built: the deadline UI.

### Proposed design decision (not built): setting deadlines in the interface
Pending your approval of the visual direction. Suggested behaviour: a date-time picker in the quest form that shows the instructor's local time and the resulting UTC instant before saving; an explicit "No deadline" option that clears the value (needs the API to accept an explicit clear); a plain-language state on the student side ("Closes Nov 5, 5:00 PM (Manila)"); optional grace period or late submission policy to be decided with the instructors; and a decision on whether Run should remain available after the deadline (currently yes). Until approved, deadlines can only be set through the API, in UTC or with an explicit offset.
