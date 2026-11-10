-- Submission integrity: reservation table for the single graded attempt.
-- ADDITIVE ONLY. Touches no existing table and no existing row.
-- Review before applying. The app also creates this table by itself the first time
-- the new code starts (db.create_all), so apply this FIRST if you want to control when.
--
-- Rollback (only if no slot rows matter): DROP TABLE submission_slots;

CREATE TABLE IF NOT EXISTS submission_slots (
    id          INT NOT NULL AUTO_INCREMENT,
    user_id     INT NOT NULL,
    problem_id  INT NOT NULL,
    status      VARCHAR(10) NOT NULL DEFAULT 'pending',   -- pending | done | failed
    claimed_at  DATETIME NOT NULL,
    finished_at DATETIME NULL,
    error_msg   VARCHAR(500) NULL,
    owner_token VARCHAR(36) NULL,                              -- who currently owns a pending reservation
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission_slot_user_problem (user_id, problem_id),
    CONSTRAINT fk_slot_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_slot_problem FOREIGN KEY (problem_id) REFERENCES problems (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Existing submissions are NOT copied into slots and are not changed. The app
-- still refuses a second graded submission when a row already exists in
-- `submissions`, so history keeps blocking resubmission exactly as before.
--
-- Read-only pre-check (run it, nothing is modified): historical duplicates.
-- They are not a problem for this migration; they are listed so you know about them.
--   SELECT user_id, problem_id, COUNT(*) AS n
--   FROM submissions GROUP BY user_id, problem_id HAVING COUNT(*) > 1;
