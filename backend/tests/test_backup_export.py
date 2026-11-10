# The in-app backup must cover every table and write values MySQL can load back.
import os, sys, tempfile
_db = os.path.join(tempfile.mkdtemp(), 'bk_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash


def test_backup_covers_every_table_and_escapes_json_text():
    with A.app.app_context():
        adm = A.User(username='bkadmin', email='bk@example.com', role='administrator', password_hash=generate_password_hash('x'))
        subj = A.Subject(name='BK', subject_code='BK1', year_level=1, subject_type='lab')
        A.db.session.add_all([adm, subj]); A.db.session.flush()
        A.db.session.add(A.Problem(title="It's a \"quote\"", description='line1\nline2 back\\slash', difficulty='Easy', xp_reward=10,
                                   test_cases=[{'input': '1', 'expected': 'a\nb'}], starter_code={'python': 'x = 1\nprint(x)\n'},
                                   subject_id=subj.id, created_by=adm.id, visible_to_sections=[]))
        A.db.session.commit()
        h = {'Authorization': f'Bearer {create_access_token(identity=str(adm.id))}'}
        every = {t.name for t in A.db.metadata.sorted_tables}
    r = A.app.test_client().post('/api/admin/backup', json={'tables': 'all'}, headers=h)
    sql = r.get_data(as_text=True)
    header = [l for l in sql.split('\n') if l.startswith('-- Tables')][0]
    assert every <= {t.strip() for t in header.split(':', 1)[1].split(',')}
    for must in ('irregular_enrollments', 'lessons', 'lesson_files', 'user_achievements', 'submission_slots', 'code_drafts'):
        assert must in header
    # newline inside JSON text must be written as the two characters \n inside the SQL string, and backslashes doubled
    assert 'x = 1\\\\nprint(x)' in sql          # JSON "\n" (backslash n) is itself escaped: \\n
    assert "It\\'s a" in sql
    assert '\n' not in [l for l in sql.split('\n') if l.startswith('INSERT INTO `problems`')][0]
    # selective backup still works
    r2 = A.app.test_client().post('/api/admin/backup', json={'tables': ['users']}, headers=h)
    assert 'INSERT INTO `users`' in r2.get_data(as_text=True) and 'INSERT INTO `problems`' not in r2.get_data(as_text=True)
