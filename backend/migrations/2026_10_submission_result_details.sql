-- Recorded per-test results on submissions. ADDITIVE ONLY: one nullable JSON column.
-- NOT applied by anyone yet. Back up first (or use: python manage_schema.py upgrade).
-- Existing rows get NULL: the instructor viewer then says the record has no per-test results.
-- Rollback: ALTER TABLE submissions DROP COLUMN result_details;
ALTER TABLE submissions ADD COLUMN result_details JSON NULL;
