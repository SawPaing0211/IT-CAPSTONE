# Achievement history preservation design (FOR REVIEW — nothing here has been applied)

Status: proposal only. No reconciliation, backfill, deletion, live migration or XP correction has been
run or is authorised by this document. The implementation in this change **fails safely** on a
duplicate-bearing database and never cleans records.

## 1. Problem
Before this change, concurrent requests could insert several `user_achievements` rows for the same
`(user_id, achievement_id)`, and each insert added XP. Whether the live database contains such rows is
**unknown** (no copy of the real database has been inspected). Every historical row, including its
`earned_at` and its XP effect, must be preserved; XP corrections must not be inferred from duplicates.

## 2. What the code does today (implemented)
- New writes go through one award service for all roles: lock the `users` row, locking-read the user's
  earned ids, insert only missing pairs, add XP in the database (`xp = xp + n`), set `level = 1 + xp // 100`
  in the same transaction. Retries (max 4) only for MySQL 1213/1205, whole transaction rebuilt.
- The unique constraint `uq_user_achievement` is detected by effective shape, not name.
- Reads collapse duplicates deterministically: the earliest non-null `earned_at` (ties: lowest id; NULL if all
  NULL) is served. Original rows are untouched.
- `schema_status()` reports a missing constraint, so the app answers 503 until it exists. `upgrade` adds it
  only if `audit-achievements` finds no duplicate pair; otherwise it stops that step and changes nothing.

## 3. Options for duplicate-bearing databases
### (a) Canonical entitlement table referencing retained history (recommended for review)
New table `user_achievement_entitlements(user_id, achievement_id, canonical_history_id, first_earned_at,
PRIMARY KEY(user_id, achievement_id), FOREIGN KEY(canonical_history_id) -> user_achievements.id)`.
`user_achievements` is left byte-for-byte as is (the old uniqueness is *not* added to it).
- Canonical selection: earliest non-null `earned_at`, ties by lowest `id`; all-NULL → lowest `id`, NULL time.
- The award service checks/inserts in the entitlements table (unique), and appends the history row only in
  the same transaction when it inserts the entitlement.
- Reads join the entitlements table. Duplicates remain as history only.
- Pros: nothing rewritten or deleted; the unique guarantee is real; XP history untouched. Cons: a new
  table and a read-path change; two tables must stay consistent (same transaction, FK).
### (b) Lossless archive + deduplicated main table
Copy all rows to `user_achievements_archive` (verified by row count + checksum), then remove non-canonical
rows from `user_achievements` and add the unique key. Cons: involves deleting rows from the live table
(requires explicit approval), harder rollback. Not recommended unless (a) is rejected.

## 4. Recognising existing entitlements without XP or celebration
Backfilling entitlements inserts **no** XP, writes **no** `users` row, and sets no `just_earned`
(that flag is true only on the response that created the award). A user with an existing award never gets a
celebration or a second payout for it.

## 5. Backfill without racing writers
1. Maintenance window: stop the app (write exclusion). Taking a backup is mandatory first.
2. Verify with `audit-achievements` (aggregate) and keep the `fingerprint_of_all_rows` value.
3. Run the backfill in a single transaction per batch of users, ordered by `user_id`, using
   `INSERT ... SELECT` over the canonical pick; idempotent (re-running inserts nothing).
4. Re-run the audit and compare `distinct_pairs` with the entitlement count; verify row count and fingerprint
   of `user_achievements` are unchanged.
5. Deploy the code that reads/writes entitlements only after step 4 passes.

## 6. DDL, partial failure, backup and restore
- MySQL DDL auto-commits; every step must be idempotent and re-runnable. After a partial failure run
  `manage_schema.py status` and repeat only the missing step; do not rerun a half-applied script by hand.
- MariaDB drops the implicit FK index on `user_id` after `ADD UNIQUE`; a reversal must `CREATE INDEX` first
  (otherwise error 1553). The provided SQL file documents the reversal and warns not to reverse while writes are active.
- Backups are generic over the schema. A backup that contains duplicate pairs cannot be restored into a
  database that already has `uq_user_achievement`. Verify a restore on a throwaway database before the change:
  restore, run `audit-achievements`, compare fingerprint and counts.

## 7. Deployment order and rollback
Backup → verify restore on a throwaway DB → write exclusion → audit → (clean path) `upgrade` / (duplicate path)
reviewed plan above → status check → deploy code → smoke test → lift exclusion. There is no automatic
downgrade; rollback = restore the backup taken in step 1 (and redeploy the previous code).

## 8. Decisions needed from the reviewer
1. Option (a) or (b), or another. 2. Whether any XP reconciliation is wanted (this design does none).
3. Whether to move awarding out of the GET routes into the mutations (proposed, not implemented).
4. Real MySQL (intended version) validation in Docker is still required before release.
