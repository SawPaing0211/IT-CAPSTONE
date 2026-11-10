"""
READ-ONLY check before/after the submission-integrity change.
Run from the backend folder:  python check_submission_integrity.py
It only runs SELECTs. Do not paste passwords or real student names/IDs into reports.
"""
import os
from sqlalchemy import create_engine, text, inspect
try:
    from dotenv import load_dotenv; load_dotenv()
except Exception:
    pass

url = os.environ.get('DATABASE_URL')
if not url:
    raise SystemExit("DATABASE_URL is not set (check backend/.env).")
eng = create_engine(url)
insp = inspect(eng)
with eng.connect() as c:
    print("submission_slots table exists:", 'submission_slots' in insp.get_table_names())
    print("submissions by status:")
    for status, n in c.execute(text("SELECT status, COUNT(*) FROM submissions GROUP BY status")):
        print(f"  {status}: {n}")
    dup = c.execute(text("SELECT COUNT(*) FROM (SELECT 1 FROM submissions GROUP BY user_id, problem_id "
                         "HAVING COUNT(*) > 1) d")).scalar()
    print("(student, problem) pairs with more than one submission:", dup)
    if 'submission_slots' in insp.get_table_names():
        for status, n in c.execute(text("SELECT status, COUNT(*) FROM submission_slots GROUP BY status")):
            print(f"  slots {status}: {n}")
        stuck = c.execute(text("SELECT COUNT(*) FROM submission_slots WHERE status='pending' "
                               "AND claimed_at < NOW() - INTERVAL 15 MINUTE")).scalar()
        print("slots stuck in 'pending' for over 15 minutes (claimable again):", stuck)
