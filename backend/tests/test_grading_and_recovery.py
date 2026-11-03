# Grading outcomes, attempt consumption, Run safety and reservation ownership.
# sqlite + mocked runner: shows the logic, not real Docker or MySQL behaviour.
import os, sys, tempfile
from datetime import datetime, timedelta
import pytest

os.environ.setdefault('DATABASE_URL', f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'grade.db')}")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

_n = {'i': 0}


def R(kind, hidden=False):
    return {'passed': kind == 'passed', 'kind': kind, 'hidden': hidden, 'output': 'x',
            'message': 'Passed' if kind == 'passed' else 'nope'}


@pytest.fixture()
def world():
    _n['i'] += 1; k = _n['i']
    with A.app.app_context():
        ins = A.User(username=f'gins{k}', email=f'gins{k}@forge-test.example', role='instructor', password_hash=generate_password_hash('x'))
        stu = A.User(username=f'3026{k:04d}', email=f'3026{k:04d}@student.com', role='student', password_hash=generate_password_hash('x'))
        sub = A.Subject(name=f'G{k}', subject_code=f'GRD{k}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, stu, sub]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'6{k:04d}', subject_id=sub.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        A.db.session.add(A.IrregularEnrollment(student_id=stu.id, section_id=sec.id))
        p = A.Problem(title=f'G{k}', description='d', difficulty='Medium', xp_reward=200, partial_credit=100,
                      test_cases=[{'input': str(i), 'expected': str(i), 'visible': i == 0} for i in range(4)],
                      subject_id=sub.id, created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
        A.db.session.add(p); A.db.session.commit()
        w = dict(uid=stu.id, pid=p.id, h={'Authorization': f'Bearer {create_access_token(identity=str(stu.id))}'})
    w['c'] = A.app.test_client()
    return w


def submit(w, results, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', lambda *a, **k: results)
    return w['c'].post('/api/submissions', headers=w['h'], json={'problem_id': w['pid'], 'code': 'c', 'language': 'python'})


@pytest.mark.parametrize('kinds,status,score_min,score_max', [
    (['passed'] * 4, 'accepted', 200, 200),
    (['passed', 'passed', 'wrong_output', 'wrong_output'], 'partial', 100, 100),
    (['wrong_output'] * 4, 'wrong_answer', 20, 20),                 # floor XP = 10% of 200
    (['runtime_error'] * 4, 'error', 20, 20),                       # compile failure / crash
    (['timeout', 'wrong_output', 'wrong_output', 'wrong_output'], 'timeout', 20, 20),
])
def test_student_code_outcomes_are_graded_and_consume_the_attempt(world, monkeypatch, kinds, status, score_min, score_max):
    r = submit(world, [R(k) for k in kinds], monkeypatch)
    assert r.status_code == 201, r.get_json()
    body = r.get_json()
    assert body['status'] == status and score_min <= body['score'] <= score_max
    with A.app.app_context():
        assert A.db.session.get(A.User, world['uid']).xp == body['xp_earned']
    # the one final submission is spent whatever the outcome
    assert submit(world, [R('passed')] * 4, monkeypatch).status_code == 409
    with A.app.app_context():
        assert A.Submission.query.filter_by(user_id=world['uid'], problem_id=world['pid']).count() == 1


def test_wrong_answer_is_reachable_from_the_real_runner_output(world, monkeypatch):
    """Drive the real evaluate_code with a fake sandbox: wrong stdout must not look like an error."""
    def fake(code, language, stdin):
        return {'stdout': 'WRONG', 'stderr': '', 'returncode': 0, 'timed_out': False, 'elapsed': 5}
    monkeypatch.setattr(A, '_run_in_docker_with_stdin', fake)
    r = world['c'].post('/api/submissions', headers=world['h'],
                        json={'problem_id': world['pid'], 'code': 'c', 'language': 'python'})
    assert r.get_json()['status'] == 'wrong_answer'


def test_real_runner_compile_error_and_timeout_kinds(world, monkeypatch):
    monkeypatch.setattr(A, '_run_in_docker_with_stdin',
                        lambda c, l, s: {'stdout': '', 'stderr': 'error CS1002', 'returncode': 1, 'timed_out': False, 'elapsed': 5})
    res = A.evaluate_code('c', [{'input': '1', 'expected': '1'}], 'csharp')
    assert res[0]['kind'] == 'runtime_error' and not res[0]['passed']
    monkeypatch.setattr(A, '_run_in_docker_with_stdin',
                        lambda c, l, s: {'stdout': '', 'stderr': '', 'returncode': 0, 'timed_out': True, 'elapsed': 10000})
    assert A.evaluate_code('c', [{'input': '1', 'expected': '1'}], 'python')[0]['kind'] == 'timeout'


def test_infrastructure_failure_never_consumes_the_attempt(world, monkeypatch):
    def boom(*a, **k): raise A.ExecutionInfrastructureError('docker down')
    monkeypatch.setattr(A, 'evaluate_code', boom)
    r = world['c'].post('/api/submissions', headers=world['h'], json={'problem_id': world['pid'], 'code': 'c', 'language': 'python'})
    assert r.status_code == 503 and r.get_json()['attempt_consumed'] is False
    assert submit(world, [R('passed')] * 4, monkeypatch).status_code == 201


def test_run_never_reveals_hidden_inputs_or_expected_output_and_awards_nothing(world, monkeypatch):
    def fake(code, language, stdin):
        return {'stdout': 'nope', 'stderr': '', 'returncode': 0, 'timed_out': False, 'elapsed': 5}
    monkeypatch.setattr(A, '_run_in_docker_with_stdin', fake)
    r = world['c'].post(f"/api/problems/{world['pid']}/run", headers=world['h'], json={'code': 'c', 'language': 'python'})
    assert r.status_code == 200
    res = r.get_json()['test_results']
    hidden = [x for x in res if x['hidden']]
    assert len(hidden) == 3
    for x in hidden:
        assert x['test_case'] == '🔒 Hidden' and x['expected'] == '🔒 Hidden' and x['output'] == '🔒 Hidden'
        assert 'Expected' not in x['message']
    with A.app.app_context():
        assert A.db.session.get(A.User, world['uid']).xp == 0
        assert A.Submission.query.filter_by(user_id=world['uid']).count() == 0
        assert A.SubmissionSlot.query.filter_by(user_id=world['uid']).count() == 0
    # unlimited Run, then Submit still works
    for _ in range(3):
        assert world['c'].post(f"/api/problems/{world['pid']}/run", headers=world['h'], json={'code': 'c', 'language': 'python'}).status_code == 200
    assert submit(world, [R('passed')] * 4, monkeypatch).status_code == 201


# ── reservation ownership and recovery ───────────────────────────────────────
def test_late_worker_cannot_finalize_after_takeover(world, monkeypatch):
    """Worker 1 stalls past the expiry; worker 2 takes over and finishes; worker 1's late result is discarded."""
    c, h = world['c'], world['h']
    calls = {'n': 0}

    def stalling_runner(code, tests, lang, raise_on_infra=False):
        calls['n'] += 1
        if calls['n'] == 1:
            # while worker 1 is "running", its reservation expires and worker 2 submits and finishes
            with A.app.app_context():
                A.SubmissionSlot.query.filter_by(user_id=world['uid']).update(
                    {'claimed_at': datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 60)})
                A.db.session.commit()
            r2 = c.post('/api/submissions', headers=h, json={'problem_id': world['pid'], 'code': 'second', 'language': 'python'})
            calls['r2'] = r2.status_code
        return [R('passed')] * len(tests)

    monkeypatch.setattr(A, 'evaluate_code', stalling_runner)
    r1 = c.post('/api/submissions', headers=h, json={'problem_id': world['pid'], 'code': 'first', 'language': 'python'})
    assert calls['r2'] == 201                       # the new owner finished
    assert r1.status_code == 409                    # the late worker was refused
    with A.app.app_context():
        subs = A.Submission.query.filter_by(user_id=world['uid'], problem_id=world['pid']).all()
        assert len(subs) == 1 and subs[0].code == 'second'
        assert A.db.session.get(A.User, world['uid']).xp == 200       # XP awarded once


def test_late_worker_cannot_release_the_new_owners_reservation(world):
    with A.app.app_context():
        t1 = A.claim_submission_slot(world['uid'], world['pid'])
        A.SubmissionSlot.query.filter_by(user_id=world['uid']).update(
            {'claimed_at': datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 5)})
        A.db.session.commit()
        t2 = A.claim_submission_slot(world['uid'], world['pid'])
        assert t1 != t2
        A.release_submission_slot(world['uid'], world['pid'], 'late failure', t1)      # ignored
        assert A.SubmissionSlot.query.filter_by(user_id=world['uid']).first().status == 'pending'
        A.release_submission_slot(world['uid'], world['pid'], 'real failure', t2)
        assert A.SubmissionSlot.query.filter_by(user_id=world['uid']).first().status == 'failed'


def test_fresh_pending_slot_is_not_claimable_and_expired_one_is(world):
    with A.app.app_context():
        A.claim_submission_slot(world['uid'], world['pid'])
        with pytest.raises(A.SubmissionConflict):
            A.claim_submission_slot(world['uid'], world['pid'])
        A.SubmissionSlot.query.filter_by(user_id=world['uid']).update(
            {'claimed_at': datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 5)})
        A.db.session.commit()
        assert A.claim_submission_slot(world['uid'], world['pid'])


# ── drafts ──────────────────────────────────────────────────────────────────
def test_drafts_are_server_side_and_separated_by_account_problem_language(world):
    c, h, pid = world['c'], world['h'], world['pid']
    assert c.put(f'/api/problems/{pid}/draft', headers=h, json={'code': 'PY', 'language': 'python'}).status_code == 200
    assert c.put(f'/api/problems/{pid}/draft', headers=h, json={'code': 'JV', 'language': 'java'}).status_code == 200
    got = lambda lang, hh=h: c.get(f'/api/problems/{pid}/draft?language={lang}', headers=hh).get_json()['code']
    assert got('python') == 'PY' and got('java') == 'JV' and got('csharp') is None
    # a new "session" (new token, as after logout/login) still gets the draft
    with A.app.app_context():
        h2 = {'Authorization': f"Bearer {create_access_token(identity=str(world['uid']))}"}
    assert got('python', h2) == 'PY'
    # another student cannot see it (not enrolled -> 404; never returns this code)
    with A.app.app_context():
        other = A.User(username=f"other{world['uid']}", email=f"other{world['uid']}@student.com", role='student',
                       password_hash=generate_password_hash('x'))
        A.db.session.add(other); A.db.session.commit(); oh = {'Authorization': f'Bearer {create_access_token(identity=str(other.id))}'}
    assert c.get(f'/api/problems/{pid}/draft?language=python', headers=oh).status_code == 404


def test_draft_cannot_overwrite_after_final_submission(world, monkeypatch):
    c, h, pid = world['c'], world['h'], world['pid']
    c.put(f'/api/problems/{pid}/draft', headers=h, json={'code': 'before', 'language': 'python'})
    assert submit(world, [R('passed')] * 4, monkeypatch).status_code == 201
    r = c.put(f'/api/problems/{pid}/draft', headers=h, json={'code': 'after', 'language': 'python'})
    assert r.status_code == 409
    with A.app.app_context():
        assert A.Submission.query.filter_by(user_id=world['uid']).first().code == 'c'
