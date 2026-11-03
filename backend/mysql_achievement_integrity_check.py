"""
Achievement-integrity checks against an ISOLATED MySQL/MariaDB database, driving the REAL routes
(GET /api/student|instructor/achievements and POST /api/submissions) with only the code runner stubbed.
Every check ASSERTS on state read through fresh connections; a printed table alone is not a pass.

SAFETY (all must hold, or nothing runs and nothing is imported):
  * DATABASE_URL is set EXPLICITLY in the environment of this process (a .env file is never consulted for it)
  * FORGE_TEST_CONFIRM=throwaway-database
  * host is local (127.0.0.1 / localhost / ::1), database name contains "test"
  * the database contains the marker table `_forge_isolated_test_marker`, created ONLY by `--init-marker`
    on a database that has no other table. A name alone is never enough.
  The URL (and password) is never printed.

  python mysql_achievement_integrity_check.py --init-marker        # once, on a new empty throwaway database
  python mysql_achievement_integrity_check.py                      # full run: with the unique constraint, then without it
  python mysql_achievement_integrity_check.py --control-legacy     # negative control: the OLD award algorithm must FAIL the invariants
Exit code 0 only if every check passed.
"""
import os, sys, re, json, time, threading, multiprocessing as mp
from urllib.parse import urlparse

TOKEN = 'forge-isolated-test-database-v1'


def _guard(init_marker=False):
    url = os.environ.get('DATABASE_URL', '')
    if not url or os.environ.get('FORGE_TEST_CONFIRM') != 'throwaway-database':
        raise SystemExit("Refusing: set DATABASE_URL explicitly and FORGE_TEST_CONFIRM=throwaway-database for this process.")
    u = urlparse(url.replace('mysql+pymysql://', 'mysql://'))
    dbname = (u.path or '/').lstrip('/').split('?')[0]
    if u.hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise SystemExit("Refusing: the database host is not local.")
    if 'test' not in dbname.lower():
        raise SystemExit("Refusing: database name does not contain 'test'.")
    import pymysql
    c = pymysql.connect(host=u.hostname, port=u.port or 3306, user=u.username, password=u.password or '', database=dbname)
    try:
        cur = c.cursor()
        cur.execute("SHOW TABLES"); tables = {r[0] for r in cur.fetchall()}
        if init_marker:
            if tables:
                raise SystemExit("Refusing --init-marker: the database already has tables (it must be new and empty).")
            cur.execute("CREATE TABLE _forge_isolated_test_marker (token VARCHAR(64) NOT NULL)")
            cur.execute("INSERT INTO _forge_isolated_test_marker VALUES (%s)", (TOKEN,)); c.commit()
            print("marker created"); raise SystemExit(0)
        if '_forge_isolated_test_marker' not in tables:
            raise SystemExit("Refusing: the isolation marker table is missing (run --init-marker on a new empty throwaway database).")
        cur.execute("SELECT token FROM _forge_isolated_test_marker"); row = cur.fetchone()
        if not row or row[0] != TOKEN:
            raise SystemExit("Refusing: the isolation marker is wrong.")
    finally:
        c.close()
    return dbname


if __name__ == '__main__' and '--init-marker' in sys.argv:
    _guard(init_marker=True)
DBNAME = _guard()
os.environ.pop('FORGE_ENV', None)
os.environ.pop('ALLOWED_EMAIL_DOMAIN', None)
if not os.environ.get('FORGE_TEST_NO_AUTO_SCHEMA'):
    os.environ['FORGE_AUTO_SCHEMA'] = '1'           # the guard above proved this is the throwaway database
else:
    os.environ.pop('FORGE_AUTO_SCHEMA', None)       # worker processes import read-only: they must not run the upgrade
os.environ.setdefault('HEAD_ADMIN_EMAIL', 'head.admin@forge-test.example')
os.environ.setdefault('STUDENT_EMAIL_DOMAIN', 'student.com')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from sqlalchemy import text, event
from sqlalchemy.exc import OperationalError

with A.app.app_context():
    ENGINE = A.db.engine
STU_EXPECT = {'First Steps': 10, 'Quest Master': 50, 'Week Warrior': 20, 'Python Novice': 15, 'Hard Coder': 40}   # 10 accepted python, 10 days, 6 hard
STU_XP = sum(STU_EXPECT.values())
tag = str(int(time.time()))
_c = {'n': 0}


def hdr(uid):
    with A.app.app_context():
        return {'Authorization': f'Bearer {create_access_token(identity=str(uid))}'}


def q1(sql, **p):
    with ENGINE.connect() as c:
        return c.execute(text(sql), p).all()


def state(uid):
    xp, lvl = q1('SELECT xp, level FROM users WHERE id=:i', i=uid)[0]
    n = q1('SELECT COUNT(*) FROM user_achievements WHERE user_id=:i', i=uid)[0][0]
    return xp, lvl, n


def pair_counts(uid):
    return q1('SELECT achievement_id, COUNT(*) FROM user_achievements WHERE user_id=:i GROUP BY achievement_id', i=uid)


# ------------------------------------------------------------------ gates: force exact lock orders (no sleeps-as-ordering)
class Gate:
    def __init__(self, thread, match, action='wait', exc=None):
        self.thread, self.match, self.action, self.exc = thread, match, action, exc
        self.reached, self.release, self.fired = threading.Event(), threading.Event(), False


GATES = []


def _hook(conn, cur, statement, params, context, executemany):
    name = threading.current_thread().name
    s = statement.lstrip()
    for g in GATES:
        if not g.fired and g.thread == name and g.match(s):
            g.fired = True
            g.reached.set()
            if g.action == 'wait':
                if not g.release.wait(timeout=60):
                    raise RuntimeError('gate timeout')
            elif g.action == 'raise':
                raise g.exc()


event.listen(ENGINE, 'before_cursor_execute', _hook)
M_AWARD_LOCK = lambda s: s.upper().startswith('SELECT') and 'FROM USERS' in s.upper() and 'FOR UPDATE' in s.upper()
M_AWARD_INSERT = lambda s: s.upper().startswith('INSERT INTO USER_ACHIEVEMENTS')
M_USERS_XP = lambda s: s.upper().startswith('UPDATE USERS SET XP')
M_USERS_LEVEL = lambda s: s.upper().startswith('UPDATE USERS SET LEVEL')
M_SLOT_INSERT = lambda s: s.upper().startswith('INSERT INTO SUBMISSION_SLOTS')
M_SUB_INSERT = lambda s: s.upper().startswith('INSERT INTO SUBMISSIONS')


def run_threads(fns, join=90):
    """fns: [(name, callable)] -> {name: result}; raises if a worker raised or did not finish."""
    out, errs = {}, []
    def wrap(n, f):
        def r():
            try: out[n] = f()
            except BaseException as e: errs.append((n, repr(e)))
        return r
    ts = [threading.Thread(target=wrap(n, f), name=n) for n, f in fns]
    [t.start() for t in ts]
    for t in ts:
        t.join(join)
    alive = [t.name for t in ts if t.is_alive()]
    assert not alive, f'workers did not finish: {alive}'
    assert not errs, f'worker errors: {errs}'
    return out


# ------------------------------------------------------------------ fixtures
WORLD = {}


def build_world():
    _c['w'] = _c.get('w', 0) + 1
    wk = f'{tag}w{_c["w"]}'
    with A.app.app_context():
        A.db.create_all()
        if not A.Achievement.query.count():
            A.apply_schema_and_seed()
        ins = A.User(username=f'ach_i{wk}', email=f'ach_i{wk}@example.com', role='instructor', password_hash=generate_password_hash('x'))
        subj = A.Subject(name=f'ACH{wk}', subject_code=f'AC{tag[-5:]}{_c["w"]}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, subj]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'8{tag[-5:]}{_c["w"]}', subject_id=subj.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        probs = []
        for j in range(14):
            p = A.Problem(title=f'ACH{wk}-{j}', description='d', difficulty='Hard' if j < 6 else 'Easy',
                          problem_type='debugging' if j % 4 == 0 else 'coding', xp_reward=100,
                          test_cases=[{'input': '1', 'expected': '1'}, {'input': '2', 'expected': '2'}],
                          hints=[{'text': 'h', 'xp_penalty': 20}] if j == 11 else [],
                          subject_id=subj.id, created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
            A.db.session.add(p); probs.append(p)
        A.db.session.commit()
        WORLD.update(pids=[p.id for p in probs], sec=sec.id, iid=ins.id)


def new_student(n_accepted=0, lang='python'):
    _c['n'] += 1
    with A.app.app_context():
        s = A.User(username=f'ach{tag}_{_c["n"]}', email=f'ach{tag}_{_c["n"]}@student.com', role='student',
                   password_hash=generate_password_hash('x'))
        A.db.session.add(s); A.db.session.flush()
        A.db.session.add(A.IrregularEnrollment(student_id=s.id, section_id=WORLD['sec']))
        for k in range(n_accepted):
            A.db.session.add(A.Submission(user_id=s.id, problem_id=WORLD['pids'][k], code='x', language=lang, status='accepted',
                                          score=0, passed_cases=2, total_cases=2, submitted_at=datetime.utcnow() - timedelta(days=k)))
        A.db.session.commit()
        return s.id


def ev(code, tests, lang, raise_on_infra=False):
    """stub for the code runner only. code 'PASS' -> all tests pass; 'PARTIAL' -> one of two; 'FAIL' -> none; 'INFRA' -> runner outage."""
    if code == 'INFRA':
        raise A.ExecutionInfrastructureError('simulated runner outage')
    k = {'PASS': len(tests), 'PARTIAL': 1, 'FAIL': 0}.get(code, len(tests))
    return [{'passed': i < k, 'message': 'ok' if i < k else 'no', 'output': '1'} for i in range(len(tests))]


A.evaluate_code = ev


def GET(uid, path='/api/student/achievements'):
    r = A.app.test_client().get(path, headers=hdr(uid))
    return r.status_code, (r.get_json() if r.is_json else None)


def POST(uid, pid, code='PASS'):
    r = A.app.test_client().post('/api/submissions', headers=hdr(uid), json={'problem_id': pid, 'code': code, 'language': 'python'})
    return r.status_code, (r.get_json() if r.is_json else None)


def nm(js, key):
    return {a['name'] for a in js if a[key]}


def sub_rows(uid):
    return q1('SELECT problem_id, status, score FROM submissions WHERE user_id=:i AND code <> :x ORDER BY id', i=uid, x='x')


# ------------------------------------------------------------------ results
RESULTS = []


def check(name):
    def deco(f):
        def run(*a, **k):
            t0 = time.time()
            try:
                detail = f(*a, **k)
                RESULTS.append((name, True, detail or '')); print(f'PASS {name}' + (f'  [{detail}]' if detail else ''))
            except AssertionError as e:
                RESULTS.append((name, False, str(e)[:300])); print(f'FAIL {name}  [{str(e)[:300]}]')
            except Exception as e:
                RESULTS.append((name, False, repr(e)[:300])); print(f'ERROR {name}  [{repr(e)[:300]}]')
        run.__name__ = f.__name__
        return run
    return deco


def assert_awards_ok(uid, base_xp, extra_xp=0, expect_awards=STU_EXPECT):
    xp, lvl, n = state(uid)
    assert all(c == 1 for _a, c in pair_counts(uid)), f'duplicate award rows: {pair_counts(uid)}'
    assert xp == base_xp + extra_xp + sum(expect_awards.values()), f'xp {xp} != {base_xp}+{extra_xp}+{sum(expect_awards.values())}'
    assert lvl == 1 + xp // 100, f'level {lvl} for xp {xp}'
    assert n == len(expect_awards), f'rows {n} != {len(expect_awards)}'


# ------------------------------------------------------------------ M1 threads
@check('M1 same-user first GET, 8 simultaneous threads x 12 users: exactly-once award, XP, level, just_earned, timestamps')
def m1():
    total_resp = 0
    for u in range(12):
        sid = new_student(10); bar = threading.Barrier(8)
        def worker():
            bar.wait(timeout=30)
            return GET(sid)
        res = run_threads([(f'g{i}', worker) for i in range(8)])
        assert all(c == 200 for c, _ in res.values()), [c for c, _ in res.values()]
        assert_awards_ok(sid, 0)
        assert state(sid)[1] == 2
        for a_name in STU_EXPECT:
            assert sum(1 for _c_, js in res.values() for a in js if a['name'] == a_name and a['just_earned']) == 1, a_name
        for a_name in STU_EXPECT:      # every request, winner or loser, reports the SAME current timestamp
            stamps = {a['earned_at'] for _c_, js in res.values() for a in js if a['name'] == a_name}
            assert len(stamps) == 1 and None not in stamps and next(iter(stamps)).endswith('Z'), (a_name, stamps)
        total_resp += 8
    return f'{total_resp} responses'


# ------------------------------------------------------------------ M2 processes
def proc_worker(uid, barrier, outq):
    try:
        A.SCHEMA_STATE['up_to_date'] = True            # child imports read-only (no schema writes); the gate is not under test here
        barrier.wait(timeout=60)
        c, js = GET(uid)
        outq.put((c, [(a['name'], a['just_earned'], a['is_earned'], a['earned_at']) for a in js]))
    except BaseException as e:
        outq.put(('ERR', repr(e)))


@check('M2 same-user first GET from 4 SEPARATE PROCESSES x 6 users: exactly-once award')
def m2():
    ctx = mp.get_context('spawn')
    os.environ['FORGE_TEST_NO_AUTO_SCHEMA'] = '1'      # children must NOT run the schema upgrade (it would re-add the unique index in the no-unique pass)
    for u in range(6):
        sid = new_student(10)
        bar, outq = ctx.Barrier(4), ctx.Queue()
        ps = [ctx.Process(target=proc_worker, args=(sid, bar, outq)) for _ in range(4)]
        [p.start() for p in ps]
        got = [outq.get(timeout=120) for _ in ps]
        [p.join(60) for p in ps]
        assert all(not p.is_alive() and p.exitcode == 0 for p in ps), [p.exitcode for p in ps]
        assert all(g[0] == 200 for g in got), got
        assert_awards_ok(sid, 0)
        for a_name in STU_EXPECT:
            assert sum(1 for _c_, rows in got for r in rows if r[0] == a_name and r[1]) == 1, a_name
            assert len({r[3] for _c_, rows in got for r in rows if r[0] == a_name}) == 1
    os.environ.pop('FORGE_TEST_NO_AUTO_SCHEMA', None)
    return '24 responses from 24 processes'


# ------------------------------------------------------------------ M3 overlap with the REAL submission route
SUB_XP = {'PASS': 100, 'PARTIAL': 50, 'FAIL': 10}


def overlap_award_first(kind, pid_idx):
    """GET holds the user-row lock (paused inside the award transaction) when POST /api/submissions reaches its XP update."""
    sid = new_student(10)
    g_award = Gate('G', M_AWARD_INSERT)                  # paused AFTER the users row lock, BEFORE commit
    # the submit's FIRST write that needs the users row is the slot reservation (its foreign key takes a shared lock on
    # the parent user row), so that is where it must queue behind the award transaction
    g_sub = Gate('P', M_SLOT_INSERT, action='observe')
    GATES[:] = [g_award, g_sub]
    out = {}
    tg = threading.Thread(target=lambda: out.__setitem__('G', GET(sid)), name='G'); tg.start()
    assert g_award.reached.wait(30), 'award never reached its insert'
    tp = threading.Thread(target=lambda: out.__setitem__('P', POST(sid, WORLD['pids'][pid_idx], kind)), name='P'); tp.start()
    assert g_sub.reached.wait(30), 'submit never reached its slot reservation'
    time.sleep(0.4)
    assert tp.is_alive() and 'P' not in out, 'submit must be BLOCKED behind the award transaction'
    g_award.release.set()
    tg.join(60); tp.join(60)
    assert not tg.is_alive() and not tp.is_alive()
    GATES.clear()
    return sid, out


def overlap_submit_first(kind, pid_idx):
    """POST holds the user-row lock (paused after its XP update) when GET /api/.../achievements reaches the award lock."""
    sid = new_student(10)
    g_sub = Gate('P', M_SUB_INSERT)                      # after UPDATE users (row lock held), before commit
    g_award = Gate('G', M_AWARD_LOCK, action='observe')
    GATES[:] = [g_sub, g_award]
    out = {}
    tp = threading.Thread(target=lambda: out.__setitem__('P', POST(sid, WORLD['pids'][pid_idx], kind)), name='P'); tp.start()
    assert g_sub.reached.wait(30), 'submit never reached its insert'
    tg = threading.Thread(target=lambda: out.__setitem__('G', GET(sid)), name='G'); tg.start()
    assert g_award.reached.wait(30), 'award never reached its lock'
    time.sleep(0.4)
    assert tg.is_alive() and 'G' not in out, 'award must be BLOCKED behind the submission transaction'
    g_sub.release.set()
    tp.join(60); tg.join(60)
    assert not tg.is_alive() and not tp.is_alive()
    GATES.clear()
    return sid, out


@check('M3a award-first lock order vs REAL POST /api/submissions (accepted / partial / failed): submit queues behind the award transaction at its slot reservation, both commit, exact totals')
def m3a():
    notes = []
    for kind, pid_idx in (('PASS', 10), ('PARTIAL', 10), ('FAIL', 10)):
        sid, out = overlap_award_first(kind, pid_idx)
        assert out['G'][0] == 200 and out['P'][0] == 201, (out['G'][0], out['P'][0])
        rows = sub_rows(sid); assert len(rows) == 1 and rows[0][2] == SUB_XP[kind], rows
        assert_awards_ok(sid, 0, extra_xp=rows[0][2])
        notes.append(f'{kind}:+{rows[0][2]}')
    return ' '.join(notes)


@check('M3b submit-first lock order vs award (accepted / partial / failed): award waits, both commit, exact totals')
def m3b():
    notes = []
    for kind in ('PASS', 'PARTIAL', 'FAIL'):
        sid, out = overlap_submit_first(kind, 10)
        assert out['G'][0] == 200 and out['P'][0] == 201
        rows = sub_rows(sid); assert len(rows) == 1 and rows[0][2] == SUB_XP[kind], rows
        assert_awards_ok(sid, 0, extra_xp=rows[0][2])
        notes.append(f'{kind}:+{rows[0][2]}')
    return ' '.join(notes)


@check('M3c hinted deduction (-20) in both orders: persisted score 80, totals exact')
def m3c():
    for fn in (overlap_award_first, overlap_submit_first):
        sid, out = (None, None)
        sid = new_student(10)
        with A.app.app_context():
            A.db.session.add(A.HintReveal(user_id=sid, problem_id=WORLD['pids'][11], hint_index=0)); A.db.session.commit()
        # reuse the harness on the hinted problem
        if fn is overlap_award_first:
            g_award = Gate('G', M_AWARD_INSERT); g_sub = Gate('P', M_SLOT_INSERT, action='observe'); GATES[:] = [g_award, g_sub]; out = {}
            tg = threading.Thread(target=lambda: out.__setitem__('G', GET(sid)), name='G'); tg.start(); assert g_award.reached.wait(30)
            tp = threading.Thread(target=lambda: out.__setitem__('P', POST(sid, WORLD['pids'][11])), name='P'); tp.start(); assert g_sub.reached.wait(30)
            g_award.release.set()
        else:
            g_sub = Gate('P', M_SUB_INSERT); g_award = Gate('G', M_AWARD_LOCK, action='observe'); GATES[:] = [g_sub, g_award]; out = {}
            tp = threading.Thread(target=lambda: out.__setitem__('P', POST(sid, WORLD['pids'][11])), name='P'); tp.start(); assert g_sub.reached.wait(30)
            tg = threading.Thread(target=lambda: out.__setitem__('G', GET(sid)), name='G'); tg.start(); assert g_award.reached.wait(30)
            g_sub.release.set()
        tg.join(60); tp.join(60); GATES.clear()
        assert out['G'][0] == 200 and out['P'][0] == 201, (out['G'][0], out['P'][0])
        rows = sub_rows(sid); assert len(rows) == 1 and rows[0][2] == 80, rows
        assert_awards_ok(sid, 0, extra_xp=80)


@check('M3d submission that FIRST makes an achievement eligible: a GET snapshot taken before the commit defers it; the next GET converges exactly once')
def m3d():
    sid = new_student(9)                                   # 9 accepted: the 10th accepted submission unlocks Quest Master (+50)
    pre = {'First Steps': 10, 'Week Warrior': 20, 'Python Novice': 15, 'Hard Coder': 40}
    g = Gate('G', M_AWARD_LOCK)                            # GET has computed its stats, has not locked yet
    GATES[:] = [g]
    out = {}
    tg = threading.Thread(target=lambda: out.__setitem__('G', GET(sid)), name='G'); tg.start()
    assert g.reached.wait(30)
    code, body = POST(sid, WORLD['pids'][9])               # the submission commits completely while the GET waits
    assert code == 201 and sub_rows(sid)[0][2] == 100
    g.release.set(); tg.join(60); GATES.clear()
    c1, js1 = out['G']
    assert c1 == 200 and nm(js1, 'just_earned') == set(pre) and 'Quest Master' not in nm(js1, 'is_earned'), 'first GET may legitimately defer Quest Master'
    xp1, _l, n1 = state(sid); assert xp1 == 100 + sum(pre.values()) and n1 == 4
    c2, js2 = GET(sid)
    assert nm(js2, 'just_earned') == {'Quest Master'}, nm(js2, 'just_earned')
    c3, js3 = GET(sid)
    assert not nm(js3, 'just_earned')
    xp, lvl, n = state(sid)
    assert xp == 100 + sum(pre.values()) + 50 and lvl == 1 + xp // 100 and n == 5 and all(c == 1 for _a, c in pair_counts(sid))


@check('M3e same problem, 6 simultaneous POSTs + 4 GET loops: one 201, five 409, one result, XP once, awards once')
def m3e():
    sid = new_student(10); stop = threading.Event(); codes = []
    def getter():
        while not stop.is_set():
            codes.append(GET(sid)[0]); time.sleep(0.01)
    gs = [threading.Thread(target=getter, name=f'g{i}') for i in range(4)]; [t.start() for t in gs]
    res = run_threads([(f'p{i}', lambda: POST(sid, WORLD['pids'][10])) for i in range(6)])
    stop.set(); [t.join(30) for t in gs]
    cs = sorted(c for c, _ in res.values())
    assert cs == [201, 409, 409, 409, 409, 409], cs
    assert set(codes) <= {200}, set(codes)
    GET(sid)
    rows = sub_rows(sid); assert len(rows) == 1 and rows[0][2] == 100
    assert_awards_ok(sid, 0, extra_xp=100)


@check('M3f different problems, 3 simultaneous POSTs + 5 GET loops (x10 rounds): XP == submissions + awards, no 5xx')
def m3f():
    bad = []
    for rnd in range(10):
        sid = new_student(9); stop = threading.Event(); codes = []
        def getter():
            while not stop.is_set():
                codes.append(GET(sid)[0]); time.sleep(0.005)
        gs = [threading.Thread(target=getter, name=f'g{i}') for i in range(5)]; [t.start() for t in gs]
        res = run_threads([(f'p{j}', (lambda j=j: POST(sid, WORLD['pids'][9 + j]))) for j in range(3)])
        stop.set(); [t.join(30) for t in gs]
        assert sorted(c for c, _ in res.values()) == [201, 201, 201], res
        assert set(codes) <= {200}, set(codes)
        GET(sid)
        rows = sub_rows(sid); assert len(rows) == 3
        xp, lvl, n = state(sid)
        awards = q1('SELECT COALESCE(SUM(a.xp_reward),0) FROM user_achievements ua JOIN achievements a ON a.id=ua.achievement_id WHERE ua.user_id=:i', i=sid)[0][0]
        assert xp == sum(r[2] for r in rows) + int(awards), (xp, rows, awards)
        assert lvl == 1 + xp // 100 and all(c == 1 for _a, c in pair_counts(sid))
    return '10 rounds x (3 POST + 5 GET loops)'


@check('M3g runner outage: POST 503 attempt_consumed=false, no result/XP/slot consumed, a failed submit never counts toward quest_count; independent award still lands')
def m3g():
    sid = new_student(9)
    res = run_threads([('P', lambda: POST(sid, WORLD['pids'][9], 'INFRA')), ('G', lambda: GET(sid))])
    assert res['P'][0] == 503 and res['P'][1]['attempt_consumed'] is False
    assert sub_rows(sid) == []
    slot = q1('SELECT status FROM submission_slots WHERE user_id=:i AND problem_id=:p', i=sid, p=WORLD['pids'][9])[0][0]
    assert slot == 'failed'
    c, js = GET(sid)
    assert 'Quest Master' not in nm(js, 'is_earned')        # 9 accepted only: infrastructure failure did not make a 10th
    pre = {'First Steps': 10, 'Week Warrior': 20, 'Python Novice': 15, 'Hard Coder': 40}
    assert state(sid)[0] == sum(pre.values())               # only the independently eligible awards; no submission XP
    code, _ = POST(sid, WORLD['pids'][9], 'PASS'); assert code == 201     # attempt was not consumed
    GET(sid); assert state(sid)[0] == sum(pre.values()) + 100 + 50


@check('M3h submit persistence failures: one deadlock is retried to success; a hard failure rolls back and frees the attempt; awards separate')
def m3h():
    sid = new_student(10)
    g = Gate('P', M_SUB_INSERT, action='raise', exc=lambda: OperationalError('x', {}, type('O', (Exception,), {})(1213, 'Deadlock')))
    GATES[:] = [g]
    res = run_threads([('P', lambda: POST(sid, WORLD['pids'][10])), ('G', lambda: GET(sid))]); GATES.clear()
    assert res['P'][0] == 201 and res['G'][0] == 200
    GET(sid)
    rows = sub_rows(sid); assert len(rows) == 1
    assert_awards_ok(sid, 0, extra_xp=100)
    sid2 = new_student(10)
    g = Gate('P', M_SUB_INSERT, action='raise', exc=lambda: RuntimeError('disk full'))
    GATES[:] = [g]
    res = run_threads([('P', lambda: POST(sid2, WORLD['pids'][10])), ('G', lambda: GET(sid2))]); GATES.clear()
    assert res['P'][0] == 500 and res['P'][1]['attempt_consumed'] is False and res['G'][0] == 200
    GET(sid2)
    assert sub_rows(sid2) == []
    assert_awards_ok(sid2, 0, extra_xp=0)                   # submit XP rolled back; the independent awards stand


@check('M3i expired reservation: the late worker cannot finalize or add XP (409), the new owner does, awards unaffected')
def m3i():
    sid = new_student(10); pid = WORLD['pids'][10]
    entered, release = threading.Event(), threading.Event()
    def slow_eval(code, tests, lang, raise_on_infra=False):
        if threading.current_thread().name == 'late':
            entered.set(); release.wait(60)
        return ev('PASS', tests, lang)
    A.evaluate_code = slow_eval
    try:
        out = {}
        tl = threading.Thread(target=lambda: out.__setitem__('late', POST(sid, pid)), name='late'); tl.start()
        assert entered.wait(30)
        q1_ = ENGINE.connect(); q1_.execute(text("UPDATE submission_slots SET claimed_at=:t WHERE user_id=:u AND problem_id=:p"),
                                           {'t': datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 60), 'u': sid, 'p': pid}); q1_.commit(); q1_.close()
        out['new'] = POST(sid, pid)                       # takes the abandoned reservation over and finishes
        release.set(); tl.join(60)
    finally:
        A.evaluate_code = ev
    assert out['new'][0] == 201 and out['late'][0] == 409, (out['new'][0], out['late'][0])
    GET(sid)
    rows = sub_rows(sid); assert len(rows) == 1
    assert_awards_ok(sid, 0, extra_xp=100)


# ------------------------------------------------------------------ M4 rollback on the real engine
@check('M4 failure injected at award insert / XP update / level update / before commit: nothing committed (fresh connection), recovery awards once')
def m4():
    for label, match in (('insert', M_AWARD_INSERT), ('xp', M_USERS_XP), ('level', M_USERS_LEVEL)):
        sid = new_student(10); before = state(sid)
        GATES[:] = [Gate(threading.current_thread().name, match, action='raise', exc=lambda: RuntimeError('injected'))]
        code, body = GET(sid); GATES.clear()
        assert code == 500 and body['error'] == 'award_failed' and 'injected' not in str(body), (label, code, body)
        assert state(sid) == before, (label, state(sid), before)
        code, js = GET(sid)
        assert code == 200 and nm(js, 'just_earned') == set(STU_EXPECT)
        assert_awards_ok(sid, 0)
    sid = new_student(10); before = state(sid)
    from sqlalchemy.orm import Session
    def boom(session): raise RuntimeError('commit refused')
    event.listen(Session, 'before_commit', boom)
    try:
        code, body = GET(sid)
    finally:
        event.remove(Session, 'before_commit', boom)
    assert code == 500 and state(sid) == before
    code, js = GET(sid); assert_awards_ok(sid, 0)


# ------------------------------------------------------------------ M5 real lock waits / retries / no stuck locks
def with_short_lock_timeout(seconds):
    @event.listens_for(ENGINE, 'connect')
    def _set(dbapi_con, rec):
        cur = dbapi_con.cursor(); cur.execute(f'SET SESSION innodb_lock_wait_timeout={seconds}'); cur.close()
    ENGINE.dispose()                                       # new pooled connections pick the setting up
    return _set


@check('M5 real lock-wait timeouts: retried then 503 (bounded, nothing written); after release the next request succeeds; no stuck transactions')
def m5():
    fn = with_short_lock_timeout(1)
    try:
        # (a) lock held longer than every attempt: exhaustion
        sid = new_student(10); before = state(sid)
        holder = ENGINE.connect(); tx = holder.begin(); holder.execute(text('SELECT id FROM users WHERE id=:i FOR UPDATE'), {'i': sid})
        t0 = time.time(); code, body = GET(sid); dt = time.time() - t0
        assert code == 503 and body['retryable'] is True, (code, body)
        assert dt < 20, dt                                  # bounded: 4 attempts x ~1s timeout, not forever
        assert state(sid) == before
        tx.rollback(); holder.close()
        code, js = GET(sid); assert code == 200 and nm(js, 'just_earned') == set(STU_EXPECT)
        assert_awards_ok(sid, 0)
        # (b) lock released while a later attempt is waiting: eventual success, exact state
        sid = new_student(10)
        holder = ENGINE.connect(); tx = holder.begin(); holder.execute(text('SELECT id FROM users WHERE id=:i FOR UPDATE'), {'i': sid})
        threading.Timer(1.5, lambda: (tx.rollback(), holder.close())).start()
        code, js = GET(sid)
        assert code == 200 and nm(js, 'just_earned') == set(STU_EXPECT)
        assert_awards_ok(sid, 0)
        time.sleep(2)
        open_trx = q1('SELECT COUNT(*) FROM information_schema.INNODB_TRX')[0][0]
        assert open_trx == 0, f'{open_trx} transaction(s) still open'
    finally:
        event.remove(ENGINE, 'connect', fn); ENGINE.dispose()


@check('M6 ambiguous response: the first response is discarded, the repeat does not re-award or claim just_earned')
def m6():
    sid = new_student(10); GET(sid)
    before = state(sid)
    c, js = GET(sid)
    assert c == 200 and not nm(js, 'just_earned') and nm(js, 'is_earned') == set(STU_EXPECT) and state(sid) == before


@check('M7 instructor + administrator awards, same service, exact once under 6 simultaneous requests')
def m7():
    with A.app.app_context():
        _c['a'] = _c.get('a', 0) + 1
        adm = A.User(username=f'ach_a{tag}_{_c["a"]}', email=f'ach_a{tag}_{_c["a"]}@example.com', role='administrator', password_hash=generate_password_hash('x'))
        A.db.session.add(adm); A.db.session.flush()
        for j in range(10):
            A.db.session.add(A.Problem(title=f'adm{tag}_{_c["a"]}-{j}', description='d', difficulty='Easy', xp_reward=10,
                                       test_cases=[{'input': '1', 'expected': '1'}], created_by=adm.id, is_published=True))
        A.db.session.commit(); aid = adm.id
    for uid in (aid,):
        bar = threading.Barrier(6)
        res = run_threads([(f'i{k}', lambda: (bar.wait(30), GET(uid, '/api/instructor/achievements'))[1]) for k in range(6)])
        assert all(c == 200 for c, _ in res.values())
        assert sum(1 for _c_, js in res.values() for a in js if a['name'] == 'Activity Architect' and a['just_earned']) == 1
        assert state(uid) == (60, 1, 1)


def run_all():
    build_world()
    for f in (m1, m2, m3a, m3b, m3c, m3d, m3e, m3f, m3g, m3h, m3i, m4, m5, m6, m7):
        f()


def evidence():
    with A.app.app_context():
        ver = A.db.session.execute(text('SELECT VERSION()')).scalar()
        try: iso = A.db.session.execute(text('SELECT @@transaction_isolation')).scalar()
        except Exception:
            A.db.session.rollback(); iso = A.db.session.execute(text('SELECT @@tx_isolation')).scalar()
        eng = {r[0]: r[1] for r in A.db.session.execute(text(
            "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() "
            "AND TABLE_NAME IN ('users','user_achievements','submissions','submission_slots')")).all()}
        dl = None
        try: dl = int(A.db.session.execute(text("SHOW GLOBAL STATUS LIKE 'Innodb_deadlocks'")).one()[1])
        except Exception: A.db.session.rollback()
    return dict(server=ver, isolation=iso, storage_engines=eng, innodb_deadlocks_counter=dl)


def has_unique():
    return bool(q1("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_achievements' AND INDEX_NAME='uq_user_achievement'")[0][0])


def set_unique(on):
    with ENGINE.begin() as c:
        if on and not has_unique():
            c.execute(text('ALTER TABLE user_achievements ADD CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_id)'))
        if not on and has_unique():
            if not q1("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='user_achievements' AND INDEX_NAME='ix_ua_user'")[0][0]:
                c.execute(text('CREATE INDEX ix_ua_user ON user_achievements (user_id)'))
            c.execute(text('ALTER TABLE user_achievements DROP INDEX uq_user_achievement'))


def legacy_attempt(user_id, candidates):
    """The OLD algorithm (control only): plain reads, ORM absolute "user.xp += n", no lock, level untouched."""
    user = A.db.session.get(A.User, user_id)
    have = {r[0] for r in A.db.session.query(A.UserAchievement.achievement_id).filter_by(user_id=user_id).all()}
    created = set()
    for ach_id, reward, progress in candidates:
        if ach_id in have: continue
        A.db.session.add(A.UserAchievement(user_id=user_id, achievement_id=ach_id, progress=progress)); created.add(ach_id)
        user.xp = (user.xp or 0) + int(reward or 0)
    return created


def nolock_attempt(user_id, candidates):
    """Control only: the new algorithm WITHOUT the users-row lock (plain read of the user)."""
    A.db.session.get(A.User, user_id)
    have = {r[0] for r in A.db.session.query(A.UserAchievement.achievement_id).filter_by(user_id=user_id).with_for_update().all()}
    created, gain = set(), 0
    for ach_id, reward, progress in candidates:
        if ach_id in have: continue
        A.db.session.add(A.UserAchievement(user_id=user_id, achievement_id=ach_id, progress=progress)); created.add(ach_id); gain += int(reward or 0)
    A.db.session.flush()
    if gain:
        A.User.query.filter_by(id=user_id).update({A.User.xp: A.User.xp + gain}, synchronize_session=False)
        A.User.query.filter_by(id=user_id).update({A.User.level: 1 + (A.User.xp // 100)}, synchronize_session=False)
    return created


if __name__ == '__main__':
    if '--control-nolock' in sys.argv:
        set_unique(False); A._award_attempt = nolock_attempt; build_world()
        m3a(); m3b()
        bad = [r for r in RESULTS if not r[1]]
        print(f'CONTROL (no users-row lock): {len(bad)} of {len(RESULTS)} forced-order checks FAILED, as they must')
        sys.exit(0 if bad else 1)
    control = '--control-legacy' in sys.argv
    ev0 = evidence()
    print('ENGINE EVIDENCE:', json.dumps(ev0))
    print(f'isolation guard: marker present, local host, database name contains "test" (name not printed with credentials)')
    print('processes: threads inside 1 process (M1,M3..M7); M2 uses 4 spawned processes per user')
    if control:
        set_unique(False)
        A._award_attempt = legacy_attempt                      # swap in the old algorithm
        build_world()
        m1(); m3f()
        bad = [r for r in RESULTS if not r[1]]
        print(f'CONTROL (old algorithm): {len(bad)} of {len(RESULTS)} checks FAILED as they must for the harness to have teeth')
        sys.exit(0 if bad else 1)
    for label, uq in (('WITH uq_user_achievement', True), ('WITHOUT it (legacy shape: proves the locking logic stands alone)', False)):
        set_unique(uq); RESULTS.clear()
        print(f'\n===== {label}: constraint present = {has_unique()} =====')
        run_all()
        p = sum(1 for r in RESULTS if r[1]); print(f'-- {label}: {p}/{len(RESULTS)} checks passed')
        globals().setdefault('ALL', []).extend((label, *r) for r in RESULTS)
    ev1 = evidence()
    print('\nINNODB deadlocks counter before/after:', ev0['innodb_deadlocks_counter'], ev1['innodb_deadlocks_counter'])
    failed = [a for a in ALL if not a[2]]
    print(f'TOTAL {len(ALL) - len(failed)}/{len(ALL)} checks passed')
    print('ALL PASS' if not failed else 'FAILURES: ' + '; '.join(f'{a[0]}: {a[1]}' for a in failed))
    sys.exit(0 if not failed else 1)
