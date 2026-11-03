# Achievement awarding: response contract, exactly-once awards, XP + level + award rows commit together or not at all,
# bounded retries, historical duplicates left alone, UTC timestamps.
# SQLite, single process: this proves the LOGIC and the failure handling. It does NOT prove InnoDB locking or the
# overlap with the real submission route: that is mysql_achievement_integrity_check.py (needs an isolated MySQL/MariaDB).
import os, sys, tempfile, hashlib
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'ach_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from sqlalchemy import event, text
from sqlalchemy.exc import OperationalError, IntegrityError
from sqlalchemy.orm import Session

STUDENT = '/api/student/achievements'
INSTRUCTOR = '/api/instructor/achievements'
_n = {'i': 0}

# Independent expectation, written from the seeded definitions (not read back from the code under test):
# 10 accepted python submissions on 10 consecutive days, 6 of them on Hard problems, 3 on debugging problems.
EXPECT_STUDENT = {'First Steps': 10, 'Quest Master': 50, 'Week Warrior': 20, 'Python Novice': 15, 'Hard Coder': 40}
EXPECT_STUDENT_XP = sum(EXPECT_STUDENT.values())          # 135
EXPECT_INSTRUCTOR = {'Activity Architect': 60}            # 12 problems created -> problem_count 10


def hdr(uid, **claims):
    with A.app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(uid), additional_claims=claims)}'}


def engine():
    with A.app.app_context():
        return A.db.engine


@pytest.fixture()
def w():
    _n['i'] += 1
    k = _n['i']
    with A.app.app_context():
        mk = lambda role, name: A.User(username=f'{name}{k}', email=f'{name}{k}@{"student.com" if role == "student" else "example.com"}',
                                       role=role, password_hash=generate_password_hash('x'))
        ins, stu, adm, other = mk('instructor', 'ains'), mk('student', 'astu'), mk('administrator', 'aadm'), mk('student', 'aoth')
        subj = A.Subject(name=f'AS{k}', subject_code=f'AS{k}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, stu, adm, other, subj]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'6{k:04d}', subject_id=subj.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        for u in (stu, other):
            A.db.session.add(A.IrregularEnrollment(student_id=u.id, section_id=sec.id))
        pids = []
        for j in range(12):
            p = A.Problem(title=f'a{k}-{j}', description='d', difficulty='Hard' if j < 6 else 'Easy',
                          problem_type='debugging' if j % 4 == 0 else 'coding', xp_reward=100,
                          test_cases=[{'input': '1', 'expected': '1'}], subject_id=subj.id,
                          created_by=ins.id if j < 12 else adm.id, is_published=True, visible_to_sections=[sec.id])
            A.db.session.add(p); pids.append(p)
        A.db.session.commit()
        return dict(sid=stu.id, iid=ins.id, aid=adm.id, oid=other.id, pids=[p.id for p in pids], secid=sec.id)


def seed_subs(w, uid, n=10, lang='python'):
    with A.app.app_context():
        for k in range(n):
            A.db.session.add(A.Submission(user_id=uid, problem_id=w['pids'][k], code='x', language=lang, status='accepted',
                                          score=10, passed_cases=1, total_cases=1,
                                          submitted_at=datetime.utcnow() - timedelta(days=k)))
        A.db.session.commit()


def get(uid, path=STUDENT, **claims):
    r = A.app.test_client().get(path, headers=hdr(uid, **claims))
    return r.status_code, (r.get_json() if r.is_json else None), r


def state(uid):
    """Read through a brand-new connection, so only COMMITTED data is seen."""
    with engine().connect() as c:
        xp, lvl = c.execute(text('SELECT xp, level FROM users WHERE id=:i'), {'i': uid}).one()
        n = c.execute(text('SELECT COUNT(*) FROM user_achievements WHERE user_id=:i'), {'i': uid}).scalar()
    return xp, lvl, n


def rows_fp(uid=None):
    with engine().connect() as c:
        q = 'SELECT id,user_id,achievement_id,earned_at,progress FROM user_achievements' + (' WHERE user_id=:i' if uid else '') + ' ORDER BY id'
        rows = c.execute(text(q), {'i': uid} if uid else {}).all()
    return hashlib.sha256(repr([tuple(r) for r in rows]).encode()).hexdigest(), len(rows)


def names(js, key):
    return {a['name'] for a in js if a[key]}


# ---------------------------------------------------------------- A1 sequential, all roles
def test_a1_student_exact_set_xp_level_timestamps_and_repeat(w):
    seed_subs(w, w['sid'])
    xp0, lvl0, _ = state(w['sid'])
    code, first, _r = get(w['sid'])
    assert code == 200
    assert names(first, 'is_earned') == set(EXPECT_STUDENT)
    assert names(first, 'just_earned') == set(EXPECT_STUDENT)
    xp1, lvl1, n1 = state(w['sid'])
    assert xp1 - xp0 == EXPECT_STUDENT_XP == 135 and lvl1 == 1 + xp1 // 100 == 2 and n1 == len(EXPECT_STUDENT)
    for a in first:
        if a['is_earned']:
            assert a['earned_at'] and a['earned_at'].endswith('Z') and '+' not in a['earned_at']
            datetime.strptime(a['earned_at'], '%Y-%m-%dT%H:%M:%SZ')
    fp = rows_fp(w['sid'])
    code, second, _r = get(w['sid'])
    assert not any(a['just_earned'] for a in second)
    assert state(w['sid']) == (xp1, lvl1, n1) and rows_fp(w['sid']) == fp
    assert {a['id']: a['earned_at'] for a in first if a['is_earned']} == {a['id']: a['earned_at'] for a in second if a['is_earned']}


def test_a1_instructor_and_administrator_receive_instructor_definitions(w):
    with A.app.app_context():                         # the administrator also created 10 problems
        for j in range(10):
            A.db.session.add(A.Problem(title=f'adm{w["aid"]}-{j}', description='d', difficulty='Easy', xp_reward=10,
                                       test_cases=[{'input': '1', 'expected': '1'}], created_by=w['aid'], is_published=True))
        A.db.session.commit()
    for uid in (w['iid'], w['aid']):
        xp0, _, _ = state(uid)
        code, js, _r = get(uid, INSTRUCTOR)
        assert code == 200
        assert names(js, 'is_earned') == set(EXPECT_INSTRUCTOR) == names(js, 'just_earned')
        xp1, lvl1, n1 = state(uid)
        assert xp1 - xp0 == 60 and lvl1 == 1 + xp1 // 100 and n1 == 1
        assert all(a['category'] == 'instructor' for a in js)
        code, again, _r = get(uid, INSTRUCTOR)
        assert not any(a['just_earned'] for a in again) and state(uid) == (xp1, lvl1, n1)


def test_a1_zero_reward_award_writes_no_user_row_and_level_policy(w):
    with A.app.app_context():
        d = A.Achievement(name=f'zero{w["sid"]}', description='d', icon='x', xp_reward=0, requirement_type='java_count',
                          requirement_value=1, category='student')
        A.db.session.add(d); A.db.session.commit()
        u = A.db.session.get(A.User, w['sid']); u.xp, u.level = 0, 5; A.db.session.commit()
    seed_subs(w, w['sid'], 1, 'java')           # First Steps (10 XP) is eligible too, so use a second student for the pure case
    with A.app.app_context():
        A.Achievement.query.filter_by(name='First Steps').update({'xp_reward': 10})   # unchanged; explicit
    # pure zero-reward case: other student, one java submission, remove First Steps from play by pre-awarding it
    seed_subs(w, w['oid'], 1, 'java')
    with A.app.app_context():
        fs = A.Achievement.query.filter_by(name='First Steps').one().id
        A.db.session.add(A.UserAchievement(user_id=w['oid'], achievement_id=fs, progress=1))
        u = A.db.session.get(A.User, w['oid']); u.xp, u.level = 0, 5; A.db.session.commit()
    code, js, _r = get(w['oid'])
    assert code == 200 and names(js, 'just_earned') == {f'zero{w["sid"]}'}
    assert state(w['oid']) == (0, 5, 2)         # row added; XP unchanged; level NOT touched (no unrelated drift repair)


def test_a1_level_follows_resulting_xp_when_xp_is_awarded_and_drift_is_not_repaired_otherwise(w):
    with A.app.app_context():
        u = A.db.session.get(A.User, w['sid']); u.xp, u.level = 250, 1; A.db.session.commit()
    get(w['sid'])                                # nothing eligible: stale level stays as it was
    assert state(w['sid']) == (250, 1, 0)
    seed_subs(w, w['sid'])
    get(w['sid'])                                # awards worth 135 -> resulting XP 385 -> level 4, same transaction
    assert state(w['sid']) == (385, 4, 5)


# ---------------------------------------------------------------- earning rules / unsupported
def test_unsupported_definitions_never_earn_but_historical_awards_stay_visible(w):
    with A.app.app_context():
        bad = A.Achievement(name=f'unsup{w["sid"]}', description='d', icon='x', xp_reward=500, requirement_type='perfect_hard',
                            requirement_value=0, category='student')          # value 0 would "pass" a default-0 comparison
        old = A.Achievement.query.filter_by(requirement_type='sandbox_runs').one()
        A.db.session.add(bad); A.db.session.flush()
        A.db.session.add(A.UserAchievement(user_id=w['sid'], achievement_id=old.id, progress=0, earned_at=datetime(2026, 9, 1, 8, 0, 0)))
        A.db.session.commit(); bad_id, old_id = bad.id, old.id
    xp0 = state(w['sid'])[0]
    code, js, _r = get(w['sid'])
    by = {a['id']: a for a in js}
    assert by[bad_id]['attainable'] is False and by[bad_id]['is_earned'] is False and by[bad_id]['just_earned'] is False
    assert by[old_id]['attainable'] is False and by[old_id]['is_earned'] is True and by[old_id]['just_earned'] is False
    assert by[old_id]['earned_at'] == '2026-09-01T08:00:00Z'
    assert state(w['sid']) == (xp0, 1, 1)


def test_metadata_fields_types_and_the_14_9_5_13_split(w):
    _c, st, _r = get(w['sid']); _c, ins, _r = get(w['iid'], INSTRUCTOR)
    for a in st + ins:
        assert isinstance(a['id'], int) and isinstance(a['name'], str) and isinstance(a['description'], str)
        assert a['category'] in ('student', 'instructor') and isinstance(a['requirement_type'], str)
        assert isinstance(a['requirement_value'], int) and a['requirement_value'] == a['max_progress']
        assert isinstance(a['attainable'], bool) and isinstance(a['just_earned'], bool) and isinstance(a['is_earned'], bool)
        assert isinstance(a['xp_reward'], int) and isinstance(a['progress'], int)
        assert a['earned_at'] is None or a['earned_at'].endswith('Z')
        assert a['attainable'] == (a['requirement_type'] in (A.STUDENT_EARNABLE_TYPES if a['category'] == 'student' else A.INSTRUCTOR_EARNABLE_TYPES))
    seeded = [a for a in st + ins if not a['name'].startswith(('zero', 'unsup'))]
    assert sum(a['attainable'] for a in seeded) == 14 and sum(not a['attainable'] for a in seeded) == 13
    assert sum(a['attainable'] for a in st if a['category'] == 'student' and not a['name'].startswith(('zero', 'unsup'))) == 9
    assert sum(a['attainable'] for a in ins) == 5


# ---------------------------------------------------------------- A4 rollback injection
def _inject(match, exc_factory, count=1):
    hits = {'n': 0}
    def hook(conn, cur, statement, *a):
        if match(statement.lstrip()) and hits['n'] < count:
            hits['n'] += 1
            raise exc_factory()
    return hook, hits


@pytest.mark.parametrize('label,match', [
    ('award insert/flush', lambda s: s.upper().startswith('INSERT INTO USER_ACHIEVEMENTS')),
    ('xp update',          lambda s: s.upper().startswith('UPDATE USERS SET XP')),
    ('level update',       lambda s: s.upper().startswith('UPDATE USERS SET LEVEL')),
])
def test_a4_failure_rolls_back_everything_then_recovers_exactly_once(w, label, match):
    seed_subs(w, w['sid'])
    before = state(w['sid']); fp = rows_fp(w['sid'])
    hook, hits = _inject(match, lambda: RuntimeError('injected'))
    eng = engine(); event.listen(eng, 'before_cursor_execute', hook)
    try:
        code, body, _r = get(w['sid'])
    finally:
        event.remove(eng, 'before_cursor_execute', hook)
    assert hits['n'] == 1
    assert code == 500 and body['error'] == 'award_failed' and 'injected' not in str(body) and 'SELECT' not in str(body).upper()
    assert not any(a.get('just_earned') for a in body if isinstance(a, dict)) if isinstance(body, list) else True
    assert state(w['sid']) == before and rows_fp(w['sid']) == fp        # nothing partial, seen through a fresh connection
    code, ok, _r = get(w['sid'])
    assert code == 200 and names(ok, 'just_earned') == set(EXPECT_STUDENT)
    xp, lvl, n = state(w['sid'])
    assert (xp, lvl, n) == (before[0] + EXPECT_STUDENT_XP, 1 + (before[0] + EXPECT_STUDENT_XP) // 100, len(EXPECT_STUDENT))


def test_a4_failure_just_before_commit_rolls_back(w):
    seed_subs(w, w['sid'])
    before = state(w['sid']); fp = rows_fp(w['sid'])
    n = {'k': 0}
    def boom(session):
        n['k'] += 1
        raise RuntimeError('commit refused')
    event.listen(Session, 'before_commit', boom)
    try:
        code, body, _r = get(w['sid'])
    finally:
        event.remove(Session, 'before_commit', boom)
    assert n['k'] >= 1 and code == 500 and body['error'] == 'award_failed'
    assert state(w['sid']) == before and rows_fp(w['sid']) == fp
    code, ok, _r = get(w['sid'])
    assert code == 200 and state(w['sid'])[2] == len(EXPECT_STUDENT)


# ---------------------------------------------------------------- A5 retries
def _deadlock():
    class Orig(Exception):
        pass
    return OperationalError('INSERT ...', {}, Orig(1213, 'Deadlock found when trying to get lock'))


def test_a5_deadlock_is_retried_with_a_rebuilt_transaction_and_ends_exact(w, monkeypatch):
    seed_subs(w, w['sid'])
    monkeypatch.setattr(A.time, 'sleep', lambda s: None)
    hook, hits = _inject(lambda s: s.upper().startswith('INSERT INTO USER_ACHIEVEMENTS'), _deadlock, count=2)
    eng = engine(); event.listen(eng, 'before_cursor_execute', hook)
    try:
        code, js, _r = get(w['sid'])
    finally:
        event.remove(eng, 'before_cursor_execute', hook)
    assert hits['n'] == 2 and code == 200
    assert names(js, 'just_earned') == set(EXPECT_STUDENT)
    assert state(w['sid']) == (EXPECT_STUDENT_XP, 2, len(EXPECT_STUDENT))        # awarded exactly once despite 2 failed attempts


def test_a5_retry_exhaustion_is_bounded_safe_and_leaves_nothing(w, monkeypatch):
    seed_subs(w, w['sid'])
    monkeypatch.setattr(A.time, 'sleep', lambda s: None)
    before = state(w['sid'])
    hook, hits = _inject(lambda s: s.upper().startswith('INSERT INTO USER_ACHIEVEMENTS'), _deadlock, count=10 ** 6)
    eng = engine(); event.listen(eng, 'before_cursor_execute', hook)
    try:
        code, body, r = get(w['sid'])
    finally:
        event.remove(eng, 'before_cursor_execute', hook)
    assert hits['n'] == A.AWARD_MAX_ATTEMPTS                      # bounded
    assert code == 503 and body['retryable'] is True and r.headers.get('Retry-After')
    assert 'Deadlock' not in str(body) and 'INSERT' not in str(body)
    assert state(w['sid']) == before
    code, ok, _r = get(w['sid'])                                   # no stuck state: the next request works
    assert code == 200 and state(w['sid'])[2] == len(EXPECT_STUDENT)


@pytest.mark.parametrize('factory', [
    lambda: OperationalError('x', {}, type('O', (Exception,), {})(2013, 'Lost connection')),      # not a lock conflict
    lambda: IntegrityError('x', {}, Exception('constraint')),                                         # NOT treated as "already earned"
])
def test_a5_non_retryable_errors_are_not_retried_or_swallowed(w, factory):
    seed_subs(w, w['sid'])
    before = state(w['sid'])
    hook, hits = _inject(lambda s: s.upper().startswith('INSERT INTO USER_ACHIEVEMENTS'), factory, count=10 ** 6)
    eng = engine(); event.listen(eng, 'before_cursor_execute', hook)
    try:
        code, body, _r = get(w['sid'])
    finally:
        event.remove(eng, 'before_cursor_execute', hook)
    assert hits['n'] == 1 and code == 500 and body['error'] == 'award_failed' and body['retryable'] is False
    assert state(w['sid']) == before


# ---------------------------------------------------------------- A6 ambiguous response
def test_a6_dropped_response_then_repeat_does_not_double_award_or_claim_just_earned(w):
    seed_subs(w, w['sid'])
    _ = get(w['sid'])                                    # the client "never saw" this response
    xp, lvl, n = state(w['sid'])
    code, again, _r = get(w['sid'])
    assert code == 200 and not any(a['just_earned'] for a in again) and names(again, 'is_earned') == set(EXPECT_STUDENT)
    assert state(w['sid']) == (xp, lvl, n)


# ---------------------------------------------------------------- A7 security / regressions
def test_a7_auth_roles_temp_password_and_isolation(w):
    seed_subs(w, w['sid'])
    r = A.app.test_client().get(STUDENT)
    assert r.status_code == 401
    assert get(w['iid'], STUDENT)[0] == 403 and get(w['sid'], INSTRUCTOR)[0] == 403
    assert state(w['sid'])[2] == 0
    with A.app.app_context():
        A.db.session.get(A.User, w['sid']).must_change_password = True; A.db.session.commit()
    code, body, _r = get(w['sid'])
    assert code == 403 and body['error'] == 'password_change_required' and state(w['sid'])[2] == 0
    assert state(w['oid']) == (0, 1, 0)                  # another user is unaffected


def test_a7_run_mode_adds_no_submission_xp_or_award(w, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', lambda code, tests, lang, raise_on_infra=False: [{'passed': True, 'message': 'ok', 'output': '1'} for _ in tests])
    c = A.app.test_client()
    r = c.post(f'/api/problems/{w["pids"][0]}/run', headers=hdr(w['oid']), json={'code': 'x', 'language': 'python'})
    assert r.status_code == 200 and r.get_json()['is_run_mode'] is True
    with A.app.app_context():
        assert A.Submission.query.filter_by(user_id=w['oid']).count() == 0
    code, js, _r = get(w['oid'])
    assert not any(a['is_earned'] for a in js) and state(w['oid']) == (0, 1, 0)


# ---------------------------------------------------------------- A11 time / null legacy timestamp (duplicates: test_achievement_schema.py)
def test_a11_null_legacy_timestamp_is_not_invented_and_manila_boundary(w):
    with A.app.app_context():
        pn = A.Achievement.query.filter_by(name='Python Novice').one().id
        A.db.session.execute(text('INSERT INTO user_achievements (user_id, achievement_id, earned_at, progress) VALUES (:u, :a, NULL, 5)'),
                             {'u': w['sid'], 'a': pn})      # raw SQL: the ORM default would stamp "now"
        u = A.db.session.get(A.User, w['sid']); u.xp, u.level = 777, 3
        A.db.session.commit()
    fp, n = rows_fp(w['sid'])
    code, js, _r = get(w['sid'])
    by = {a['name']: a for a in js}
    assert by['Python Novice']['is_earned'] and by['Python Novice']['earned_at'] is None and by['Python Novice']['just_earned'] is False
    assert rows_fp(w['sid']) == (fp, n) and state(w['sid']) == (777, 3, 1)
    manila = ZoneInfo('Asia/Manila')
    def local(z): return datetime.strptime(z, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).astimezone(manila).date().isoformat()
    assert local('2026-10-22T15:59:59Z') == '2026-10-22' and local('2026-10-22T16:00:00Z') == '2026-10-23'
    assert A._utc_iso(datetime(2026, 10, 22, 15, 59, 59, 999999)) == '2026-10-22T15:59:59Z'
    assert A._utc_iso(datetime(2026, 10, 23, 0, 0, 0, tzinfo=timezone(timedelta(hours=8)))) == '2026-10-22T16:00:00Z'
    assert A._utc_iso(None) is None
