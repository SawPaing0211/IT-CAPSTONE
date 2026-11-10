# Account email cutover

All new Forge.Dev accounts use `@laconsolacion.edu`. The application generates sign-in identifiers; it does not create mailboxes. Existing records are not migrated on startup.

1. Verify the database target and a recoverable backup. Identify the intended active Head Admin by immutable user ID, and verify their username sign-in.
2. From the backend folder, use the read-only `python account_inventory.py --out <new-private-plan.csv>` on the verified target. Keep the CSV private and inspect as plain text. It includes account IDs and old/new emails, without password data. The optional `--legacy-domain` flag counts matching audit-history rows; it does not limit the inventory.
3. Resolve any duplicate targets, malformed addresses and legacy email-shaped usernames before proceeding. For ordinary addresses the plan preserves the stored local part, even if a student ID was edited after account creation. Do not merge or recreate accounts.
4. In a controlled maintenance window, verify the Head Admin configuration by ID and apply only reviewed identity-field changes by ID in one transaction. Keep the old values for rollback. Do not edit passwords, XP, enrollments, quests, submissions or historical audit text.
5. Verify account, enrollment and submission counts and the Head Admin's privilege boundary before reopening. Confirm username and new email sign-in with approved test accounts; previous-domain email sign-in is refused by the new policy.

The preflight does not apply the migration.
