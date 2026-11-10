# Database schema changes are explicit

The web app **never changes the database schema by itself**. On start it only runs a read-only
check. If the schema is out of date it prints what is missing, answers `/api/*` with
`503 schema_upgrade_required` (health stays up and reports `schema_up_to_date: false`), and
changes nothing.

## Commands (from `backend/`)
- `python manage_schema.py status` : read-only; shows the target database (no password) and what is missing.
- `python manage_schema.py upgrade` : shows the target, asks you to type the database name, then adds
  missing tables/columns and default rows. **Take a backup first.** It only adds; it never drops or rewrites data.
- `python manage_schema.py upgrade --yes` : same without the prompt (test/demo databases only).
- Docker: `docker compose run --rm backend python manage_schema.py upgrade`.

## What the next upgrade of the existing (live) database will add
| Change | Source | Effect on existing rows |
|---|---|---|
| table `submission_slots` | `migrations/2026_10_submission_slots.sql` | none (new, empty) |
| `users.must_change_password`, `users.token_version`, `users.password_changed_at` | `migrations/2026_10_password_change.sql` | all existing accounts get 0/0/NULL: nobody is flagged, no session ends |
| `submissions.result_details` (JSON, nullable) | `migrations/2026_10_submission_result_details.sql` | existing rows stay NULL. The instructor code viewer then shows the stored code, status, score and pass counts and says plainly that per-test results were not recorded; it never re-runs the code |
| unique constraint `uq_user_achievement` on `user_achievements(user_id, achievement_id)` | `migrations/2026_10_achievement_pair_unique.sql` | none when no duplicate pair exists. **If duplicates exist the step is refused**: nothing is deleted, merged or rewritten, and everything else in `upgrade` is still applied (it is additive). Until the constraint exists the app fails closed (`503 schema_upgrade_required`). See `docs/ACHIEVEMENT_PRESERVATION_DESIGN.md` |
You can instead run those SQL files yourself; `manage_schema.py status` then reports up to date.

## Test and demo databases
`FORGE_AUTO_SCHEMA=1` makes the app create tables on start. Use it only with a throwaway database.
`FORGE_DEMO=1` makes the app refuse to start unless the database name contains `demo` or `test`.
The test suite sets `FORGE_AUTO_SCHEMA=1` itself.

## Rollback
See the rollback notes at the top of each SQL file. A backup taken before `upgrade` is the real safety net.

## Verification that the upgrade is complete
- `python manage_schema.py status` exits 0 when up to date and 3 when an upgrade is needed; `upgrade` exits non-zero and prints what is still missing if it did not finish.
- `--yes` skips the prompt but is refused unless the database name contains `demo` or `test`.
- Tests: `tests/test_upgrade_from_previous_release.py` builds the schema of the previous release (git `HEAD`) in a throwaway SQLite file, checks that starting the current app and answering requests changes nothing (an outdated schema answers 503), runs the explicit upgrade, and requires it to be fully up to date with no column lost (covers `submissions.result_details`, `submission_slots` and the user columns). It compares against whatever `HEAD` is, so after the next commit it only guards later changes.
- Rehearsed on a throwaway MySQL 9.7.1 (`rehearse_upgrade.py`): old schema, 503, explicit upgrade, data intact. Not done: a copy of the real database.
- Known oddity (unchanged): the upgrade also adds `login_attempts` and `locked_until` to the `problems` table although the models define them on `users`; harmless extra columns left from an old migration.

## Demo runner and production
The simulated runner (`demo_runner.py`) is switched on only by a demo script calling `demo_runner.install(app)`; `app.py` never imports it, so an environment variable on a normal deployment cannot enable it, and the file is excluded from the Docker image. When a demo script does call it, **all** of these must hold: `FORGE_DEMO=1` and `FORGE_DEMO_RUNNER=1`; `FORGE_ENV` is not `production` (the app also refuses to start in production if either flag is set); the database name contains `demo`/`test`; the database is a local SQLite file or on this machine (a remote host such as the compose service `mysql` is refused even if named `forge_test`); and a database that already contains users must carry the synthetic-data marker `system_config.demo_database` written by `seed_demo.py` (a real database that merely has "test" in its name is refused). `/api/health` reports `execution_mode`, the UI shows a banner, and each stored result is tagged with its runner, so demo results can never be mistaken for real sandbox evidence. It is not grading verification.

## Backups (`/api/admin/backup`)
The SQL export covers every table in the schema but not the uploads folder; use `backend/backup_full.py` for database + files (`docs/BACKUP_AND_RECOVERY.md`). Restore was rehearsed only on a synthetic database in a throwaway MySQL (`backend/backup_restore_check.py`); it has not been tried on a copy of the real database.

## Achievement uniqueness (read-only audit first)
- `python manage_schema.py audit-achievements [--detail FILE]` is read-only (read-only session where supported). It reports aggregate counts, whether an effective unique key over exactly `{user_id, achievement_id}` exists (any name, any column order; plain, partial, prefix or wider indexes do not count), and writes per-pair ids only to the file given. It infers no XP corrections. Exit code 4 = duplicates exist.
- `status` lists `Missing constraints` and prints a BLOCKER line when duplicates prevent the constraint.
- MySQL DDL auto-commits: a failed or interrupted `ADD UNIQUE` cannot be rolled back as part of a transaction. Re-run `status`; the step is idempotent.
- A SQL backup taken while duplicates exist cannot be restored into a database that already has the constraint (the INSERT fails on the duplicate pair). Restore into a schema without it, then follow the preservation design.
- Known compatibility limitation: `GET /api/student/achievements` and `GET /api/instructor/achievements` still award newly qualifying achievements (a read that writes). Awarding is serialized and idempotent, and failures are reported (503 retryable / 500), but the proposal in the preservation design is to move awarding into the mutations that change progress and make GET read-only. Not implemented here, pending review.
