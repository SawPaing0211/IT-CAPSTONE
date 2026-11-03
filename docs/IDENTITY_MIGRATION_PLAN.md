# Identity migration plan (DRAFT - for review; nothing has been applied)

Goal: no active dependency on the previous institution's email identities, while keeping every
account id, password hash, enrollment link, submission, score, XP value and audit relationship.

## Why this is safe in principle
Every table refers to a user by `users.id`; none stores the email. Changing `users.email`
alone therefore keeps enrollments, submissions, XP and audit rows attached. The audit
`details` text is history and is NOT rewritten.

## Steps (to run only after review)
1. Back up the database and verify the backup restores (see backup/restore check).
2. `python account_inventory.py --legacy-domain <old-domain> --head-admin <email> --out plan.csv`
   (read-only). Review: counts by role, collisions, rows marked BLOCKED / NEEDS VALUE.
3. Students: proposed email = `<student_id>@student.com` (generated identifier, not an inbox).
   BLOCKED rows (identifier already used, or username not a usable ID) are resolved by hand.
4. Staff: the university supplies each real address; none is invented. Until supplied, those
   accounts keep their current email and still sign in with their username.
5. Head admin: verify per `HEAD_ADMIN_SETUP_AND_RECOVERY.md` BEFORE touching any administrator row.
6. Apply in one transaction per role group, only the reviewed rows, with a before/after count check.
7. Verify: each migrated student signs in by ID and by new email with the SAME password; XP,
   enrollments and submission counts equal the pre-migration numbers.
8. Rollback: restore the backup, or reverse using the saved `plan.csv` (old email column).

## Not done yet
No row has been changed. Student sign-in by `<student_id>@student.com` already works for
existing students before migration, because the login resolves the ID from the address.
