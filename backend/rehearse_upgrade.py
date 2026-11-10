"""Upgrade rehearsal on a THROWAWAY MySQL (synthetic rows): old schema -> read-only check -> explicit upgrade -> data intact.
Run through a disposable server only (needs FORGE_DEMO=1; database name must contain demo/test)."""
import os, sys, subprocess, json
os.environ['FORGE_DEMO'] = '1'
here = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, here)
# 1. build the current schema + a few rows
os.environ['FORGE_AUTO_SCHEMA'] = '1'
import app as A
from sqlalchemy import text, inspect
from werkzeug.security import generate_password_hash
with A.app.app_context():
    s = A.Subject(name='Old', subject_code='OLD1', year_level=1, subject_type='lab'); u = A.User(username='old1', email='old1@old.example', role='student', password_hash='HASH_KEEP', xp=250, level=3)
    i = A.User(username='oldins', email='oldins@old.example', role='instructor', password_hash='x')
    A.db.session.add_all([s, u, i]); A.db.session.flush()
    p = A.Problem(title='old quest', description='d', difficulty='Easy', xp_reward=50, test_cases=[{'input': '1', 'expected': '1'}], subject_id=s.id, created_by=i.id, is_published=True)
    A.db.session.add(p); A.db.session.flush()
    A.db.session.add(A.Submission(user_id=u.id, problem_id=p.id, code='print(1)', language='python', status='partial', score=25, passed_cases=1, total_cases=2))
    A.db.session.commit()
    # 2. make it look like the previous release (no new columns / tables)
    for c in ('must_change_password', 'token_version', 'password_changed_at'):
        A.db.session.execute(text(f'ALTER TABLE users DROP COLUMN {c}'))
    A.db.session.execute(text('ALTER TABLE submissions DROP COLUMN result_details'))
    A.db.session.execute(text('DROP TABLE submission_slots')); A.db.session.commit()
print('OLD SCHEMA READY')
env = {k: v for k, v in os.environ.items() if k != 'FORGE_AUTO_SCHEMA'}
def run(args, inp=None):
    r = subprocess.run([sys.executable] + args, cwd=here, env=env, capture_output=True, text=True, input=inp, timeout=150)
    return r.returncode, (r.stdout + r.stderr)
rc, out = run(['manage_schema.py', 'status']); print('STATUS BEFORE rc=%s' % rc); print('\n'.join(l for l in out.splitlines() if 'missing' in l.lower() or 'up to date' in l.lower() or 'result_details' in l)[:600])
rc, out = run(['-c', "import app,json;c=app.app.test_client();r=c.get('/api/problems');print(r.status_code, r.get_json());print(c.get('/api/health').get_json())"])
print('APP ON OLD SCHEMA:', [l for l in out.splitlines() if l.startswith(('503', '200', '{'))][:3])
rc, out = run(['manage_schema.py', 'upgrade', '--yes']); print('UPGRADE rc=%s' % rc); print('\n'.join(l for l in out.splitlines() if 'Added' in l or 'rror' in l)[:600])
rc, out = run(['manage_schema.py', 'status']); print('STATUS AFTER rc=%s' % rc, '| up to date' if 'up to date' in out.lower() and 'missing' not in out.lower().replace('nothing is missing', '') else out[-300:])
rc, out = run(['-c', """
import app as A
from sqlalchemy import inspect
with A.app.app_context():
    cols=[c['name'] for c in inspect(A.db.engine).get_columns('submissions')]
    u=A.User.query.filter_by(username='old1').first(); s=A.Submission.query.filter_by(user_id=u.id).first()
    print('RESULT result_details col:', 'result_details' in cols, '| old user kept:', u.password_hash, u.xp, u.level, 'flag', u.must_change_password, 'tv', u.token_version)
    print('RESULT old submission kept:', s.status, s.score, s.passed_cases, s.total_cases, 'result_details=', s.result_details)
    from flask_jwt_extended import create_access_token
    ins=A.User.query.filter_by(username='oldins').first()
    r=A.app.test_client().get(f'/api/instructor/submissions/{s.id}/code', headers={'Authorization':'Bearer '+create_access_token(identity=str(ins.id), additional_claims={'tv':0})})
    d=r.get_json(); print('RESULT viewer on legacy row:', r.status_code, d.get('results_recorded'), '|', d.get('note'))
"""]); print('\n'.join(l for l in out.splitlines() if l.startswith('RESULT')))
