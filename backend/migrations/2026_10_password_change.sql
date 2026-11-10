-- Password-change support. ADDITIVE ONLY: three columns on `users`.
-- NOT applied by anyone yet. Back up first. The app also adds these columns by
-- itself the first time the new code starts (same mechanism it already uses for
-- other columns), so start the new code ONLY after you are ready for this change.
--
-- Impact on existing data
--   * No row is flagged: every existing account gets must_change_password = 0.
--   * No session is invalidated by the upgrade: token_version starts at 0 and
--     tokens issued before the upgrade carry no version, which counts as 0.
--   * Passwords, ids, enrollments, submissions, XP are untouched.
--   * ALTER on a small `users` table is quick; on MySQL 8 it is online (INSTANT/INPLACE).
--
-- Rollback (loses only the flags and timestamps, not accounts):
--   ALTER TABLE users DROP COLUMN must_change_password,
--                     DROP COLUMN token_version,
--                     DROP COLUMN password_changed_at;

ALTER TABLE users
    ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN token_version        INT        NOT NULL DEFAULT 0,
    ADD COLUMN password_changed_at  DATETIME   NULL;

-- Optional, only if you deliberately want an existing account to choose a new password:
--   UPDATE users SET must_change_password = 1 WHERE id IN (...reviewed ids...);
