"""
Read-only check of the live database for student year-level data and
subject curriculum years. Makes NO changes (inspection and SELECTs only).
It does not import the Flask app, so none of the app's startup migrations run.

Run from the backend folder with the project's venv active:
    python check_student_schema.py
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text

load_dotenv()
engine = create_engine(os.environ.get('DATABASE_URL', 'mysql+pymysql://root:@localhost/forge_dev'))


class _Db:          # tiny shim so the queries below read the same as before
    engine = engine
    session = None


db = _Db()
with engine.connect() as conn:
    db.session = conn
    insp = inspect(db.engine)
    print('== users columns')
    cols = [c['name'] for c in insp.get_columns('users')]
    print(', '.join(cols))
    year_like = [c for c in cols if 'year' in c.lower() or 'grade' in c.lower()]
    print('year/grade-like columns on users:', year_like or 'none')

    print('\n== other tables with year/grade-like columns')
    for t in insp.get_table_names():
        hits = [c['name'] for c in insp.get_columns(t) if 'year' in c['name'].lower() or 'grade' in c['name'].lower()]
        if hits:
            print(f'{t}: {hits}')

    print('\n== subjects by curriculum year (with related record counts)')
    rows = db.session.execute(text("""
        SELECT s.subject_code, s.year_level, s.is_active,
               (SELECT COUNT(*) FROM subject_sections x WHERE x.subject_id = s.id) AS sections,
               (SELECT COUNT(*) FROM problems p WHERE p.subject_id = s.id) AS problems
        FROM subjects s ORDER BY s.year_level, s.subject_code
    """)).fetchall()
    for r in rows:
        print(tuple(r))

    print('\n== counts (students by role are not split by year)')
    for label, sql in [
        ('students', "SELECT COUNT(*) FROM users WHERE role='student'"),
        ('enrollments', "SELECT COUNT(*) FROM irregular_enrollments"),
    ]:
        print(label, db.session.execute(text(sql)).scalar())
