"""
Concurrency check for submissions, to be run against an ISOLATED MySQL TEST database.
It creates synthetic users/problems and mocks the code runner (no Docker needed).
It refuses to run unless the database name contains "test".

  1. In MySQL:   CREATE DATABASE forge_test CHARACTER SET utf8mb4;
  2. PowerShell: $env:DATABASE_URL="mysql+pymysql://USER:PASSWORD@localhost/forge_test"
                 python mysql_concurrency_check.py
Expected output: every line says PASS and the last line says ALL PASS.
Do not run it against the real database. Do not share the connection string.
"""
import os, sys, time, threading
url = os.environ.get('DATABASE_URL', '')
dbname = url.rsplit('/', 1)[-1].split('?')[0]
if 'test' not in dbname.lower():
    raise SystemExit(f"Refusing to run: database name {dbname!r} does not contain 'test'.")
os.environ.pop('FORGE_ENV', None)
os.environ.setdefault('FORGE_AUTO_SCHEMA', '1')   # test database only
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

fails = []
def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail and not ok else ''))
    if not ok: fails.append(name)

def ok_eval(code, tests, lang, raise_on_infra=False):
    time.sleep(0.6)                                   # keep the first request "in flight"
    return [{'passed': True, 'message': 'Passed', 'output': '1'} for _ in tests]

A.evaluate_code = ok_eval
tag = str(int(time.time()))
with A.app.app_context():
    A.db.create_all()
    ins = A.User(username=f'cc_ins{tag}', email=f'cc_ins{tag}@example.com', role='instructor',
                 password_hash=generate_password_hash('x'))
    subj = A.Subject(name=f'CC{tag}', subject_code=f'CC{tag[-6:]}', year_level=1, subject_type='lab')
    A.db.session.add_all([ins, subj]); A.db.session.flush()
    sec = A.SubjectSection(section_no=f'9{tag[-5:]}', subject_id=subj.id, is_active=True)
    A.db.session.add(sec); A.db.session.flush()
    studs = []
    for i in range(3):
        s = A.User(username=f'cc{tag}{i}', email=f'cc{tag}{i}@student.com', role='student',
                   password_hash=generate_password_hash('x'))
        A.db.session.add(s); studs.append(s)
    A.db.session.flush()
    for s in studs:
        A.db.session.add(A.IrregularEnrollment(student_id=s.id, section_id=sec.id))
    probs = []
    for j in range(6):
        p = A.Problem(title=f'CC{tag}-{j}', description='d', difficulty='Easy', xp_reward=100,
                      test_cases=[{'input': '1', 'expected': '1'}], subject_id=subj.id,
                      created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
        A.db.session.add(p); probs.append(p)
    A.db.session.commit()
    sid = [s.id for s in studs]; pid = [p.id for p in probs]
    hdr = {i: {'Authorization': f'Bearer {create_access_token(identity=str(sid[i]))}'} for i in range(3)}

def post(i, p, out):
    c = A.app.test_client()
    out.append(c.post('/api/submissions', headers=hdr[i], json={'problem_id': p, 'code': 'x', 'language': 'python'}).status_code)

# 1. same student, same problem, 8 simultaneous requests
out = []; ts = [threading.Thread(target=post, args=(0, pid[0], out)) for _ in range(8)]
[t.start() for t in ts]; [t.join() for t in ts]
with A.app.app_context():
    subs = A.Submission.query.filter_by(user_id=sid[0], problem_id=pid[0]).count()
    xp = A.db.session.get(A.User, sid[0]).xp
check('1. exactly one request graded (201)', out.count(201) == 1, str(sorted(out)))
check('1. the others were refused (409), none crashed', out.count(409) == 7, str(sorted(out)))
check('1. exactly one submission row', subs == 1, str(subs))
check('1. XP awarded once (100)', xp == 100, str(xp))

# 2. same student, 5 different problems at the same time: no lost XP updates
out = []; ts = [threading.Thread(target=post, args=(1, pid[j], out)) for j in range(1, 6)]
[t.start() for t in ts]; [t.join() for t in ts]
with A.app.app_context():
    u = A.db.session.get(A.User, sid[1])
check('2. all five graded', out.count(201) == 5, str(sorted(out)))
check('2. XP is exactly 500 (no lost update)', u.xp == 500, str(u.xp))
check('2. level matches XP (1 + 500 // 100 = 6)', u.level == 6, str(u.level))

# 3. runner failure under load frees the attempt, then the retry succeeds
state = {'fail': True}
def flaky(code, tests, lang, raise_on_infra=False):
    if state['fail']:
        raise A.ExecutionInfrastructureError('simulated docker outage')
    return ok_eval(code, tests, lang)
A.evaluate_code = flaky
out = []; ts = [threading.Thread(target=post, args=(2, pid[0], out)) for _ in range(4)]
[t.start() for t in ts]; [t.join() for t in ts]
with A.app.app_context():
    n_sub = A.Submission.query.filter_by(user_id=sid[2], problem_id=pid[0]).count()
    slot = A.SubmissionSlot.query.filter_by(user_id=sid[2], problem_id=pid[0]).first()
check('3. no submission saved during the outage', n_sub == 0, str(n_sub))
check('3. slot is failed, not consumed', slot is not None and slot.status == 'failed', str(slot and slot.status))
state['fail'] = False
out = []; post(2, pid[0], out)
check('3. retry after recovery is graded', out == [201], str(out))

# 4. an abandoned (expired) reservation: six simultaneous claimers, exactly one takes over
from datetime import datetime, timedelta
with A.app.app_context():
    A.SubmissionSlot.query.filter_by(user_id=sid[2], problem_id=pid[0]).delete()
    A.db.session.add(A.SubmissionSlot(user_id=sid[2], problem_id=pid[1], status='pending', owner_token='dead-worker',
                                      claimed_at=datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 60)))
    A.db.session.commit()
wins, losses = [], []
def claimer():
    with A.app.app_context():
        try:
            wins.append(A.claim_submission_slot(sid[2], pid[1]))
        except A.SubmissionConflict:
            losses.append(1)
ts = [threading.Thread(target=claimer) for _ in range(6)]
[t.start() for t in ts]; [t.join() for t in ts]
check('4. exactly one claimer takes over an expired reservation', len(wins) == 1 and len(losses) == 5, f'{len(wins)}/{len(losses)}')
with A.app.app_context():
    A.release_submission_slot(sid[2], pid[1], 'late worker', 'dead-worker')       # old owner is ignored
    check('4. the old owner cannot release the new owner reservation',
          A.SubmissionSlot.query.filter_by(user_id=sid[2], problem_id=pid[1]).first().status == 'pending')

print('ALL PASS' if not fails else 'FAILURES: ' + '; '.join(fails))
