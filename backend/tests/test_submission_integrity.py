# Submission integrity: one graded attempt per problem, reserved before the code
# runs and written (with the XP) in one short transaction afterwards.
# NOTE: these run on sqlite with Docker mocked, in a single process. They show the
# logic and the failure recovery; they do NOT prove behaviour under real
# concurrent MySQL connections (see mysql_concurrency_check.py for that).
import os, sys, tempfile
from datetime import datetime, timedelta
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'sub_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

_n = {'i': 0}


def _ok(code, tests, lang, raise_on_infra=False):
    return [{'passed': True, 'message': 'Passed', 'output': '1'} for _ in tests]


@pytest.fixture()
def world():
    """A fresh student, instructor, subject, section and problem per test."""
    _n['i'] += 1
    k = _n['i']
    with A.app.app_context():
        ins = A.User(username=f'ins{k}', email=f'ins{k}@example.com', role='instructor',
                     password_hash=generate_password_hash('x'), full_name='I')
        stu = A.User(username=f'20260{k:04d}', email=f'20260{k:04d}@student.com', role='student',
                     password_hash=generate_password_hash('x'), full_name='S')
        subj = A.Subject(name=f'S{k}', subject_code=f'SUB{k}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, stu, subj]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'7{k:04d}', subject_id=subj.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        A.db.session.add(A.IrregularEnrollment(student_id=stu.id, section_id=sec.id))
        probs = []
        for j in range(3):
            p = A.Problem(title=f'P{k}-{j}', description='d', difficulty='Easy', xp_reward=100,
                          test_cases=[{'input': '1', 'expected': '1'}], subject_id=subj.id,
                          created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
            A.db.session.add(p); probs.append(p)
        A.db.session.commit()
        w = dict(uid=stu.id, pids=[p.id for p in probs],
                 h={'Authorization': f'Bearer {create_access_token(identity=str(stu.id))}'})
    w['c'] = A.app.test_client()
    return w


def _post(w, pid=None, code='print(1)'):
    return w['c'].post('/api/submissions', headers=w['h'],
                       json={'problem_id': pid or w['pids'][0], 'code': code, 'language': 'python'})


def _state(w, pid=None):
    pid = pid or w['pids'][0]
    with A.app.app_context():
        slot = A.SubmissionSlot.query.filter_by(user_id=w['uid'], problem_id=pid).first()
        subs = A.Submission.query.filter_by(user_id=w['uid'], problem_id=pid).count()
        return (slot.status if slot else None), subs, A.db.session.get(A.User, w['uid']).xp


def test_success_writes_result_slot_and_xp_together(world, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', _ok)
    r = _post(world)
    assert r.status_code == 201, r.get_json()
    assert r.get_json()['user_xp'] == 100
    assert _state(world) == ('done', 1, 100)


def test_second_submission_refused_no_second_xp(world, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', _ok)
    assert _post(world).status_code == 201
    r = _post(world)
    assert r.status_code == 409 and r.get_json()['error'] == 'Already submitted'
    assert _state(world) == ('done', 1, 100)


def test_runner_failure_does_not_consume_the_attempt(world, monkeypatch):
    def boom(code, tests, lang, raise_on_infra=False):
        raise A.ExecutionInfrastructureError('docker is down')
    monkeypatch.setattr(A, 'evaluate_code', boom)
    r = _post(world)
    assert r.status_code == 503 and r.get_json()['attempt_consumed'] is False
    assert _state(world) == ('failed', 0, 0)          # no submission row, no XP
    monkeypatch.setattr(A, 'evaluate_code', _ok)       # runner is back: the student can try again
    r = _post(world)
    assert r.status_code == 201, r.get_json()
    assert _state(world) == ('done', 1, 100)


def test_real_evaluate_code_treats_runner_error_as_infrastructure(world, monkeypatch):
    monkeypatch.setattr(A, '_run_in_docker_with_stdin',
                        lambda code, lang, stdin: {'stdout': '', 'stderr': '', 'error': '💥 Execution error: x',
                                                   'returncode': -1, 'elapsed': 1, 'timed_out': False})
    r = _post(world)
    assert r.status_code == 503 and _state(world) == ('failed', 0, 0)
    # the ungraded Run path still reports it as a failed test, as before
    out = A.evaluate_code('x', [{'input': '', 'expected': '1'}], 'python')
    assert out[0]['passed'] is False


def test_docker_client_exception_is_infrastructure(world, monkeypatch):
    def nodocker(code, lang, stdin):
        raise RuntimeError('Cannot connect to the Docker daemon')
    monkeypatch.setattr(A, '_run_in_docker_with_stdin', nodocker)
    r = _post(world)
    assert r.status_code == 503 and _state(world) == ('failed', 0, 0)


def test_student_timeout_and_wrong_code_are_graded_and_consume_the_attempt(world, monkeypatch):
    monkeypatch.setattr(A, '_run_in_docker_with_stdin',
                        lambda code, lang, stdin: {'stdout': '', 'stderr': '', 'returncode': -1,
                                                   'elapsed': 10000, 'timed_out': True})
    r = _post(world)
    assert r.status_code == 201 and r.get_json()['status'] == 'timeout'
    assert _state(world)[0:2] == ('done', 1)
    assert _post(world).status_code == 409
    # wrong answer on another problem
    monkeypatch.setattr(A, '_run_in_docker_with_stdin',
                        lambda code, lang, stdin: {'stdout': '2', 'stderr': '', 'returncode': 0, 'elapsed': 5, 'timed_out': False})
    r = _post(world, world['pids'][1])
    assert r.status_code == 201 and r.get_json()['status'] in ('wrong_answer', 'error')   # graded either way


def test_result_persistence_failure_frees_the_attempt(world, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', _ok)
    class Broken:
        @property
        def query(self):
            raise RuntimeError('database went away')
    real = A.HintReveal
    monkeypatch.setattr(A, 'HintReveal', Broken())
    r = _post(world)
    assert r.status_code == 500 and r.get_json()['attempt_consumed'] is False
    assert _state(world) == ('failed', 0, 0)
    monkeypatch.setattr(A, 'HintReveal', real)
    assert _post(world).status_code == 201


def test_slot_is_committed_and_no_result_row_exists_while_code_runs(world, monkeypatch):
    seen = {}
    def spy(code, tests, lang, raise_on_infra=False):
        with A.db.engine.connect() as other:      # a separate connection, like a second request
            from sqlalchemy import text as _t
            seen['slots'] = other.execute(_t("select status from submission_slots where problem_id = :p"),
                                          {'p': world['pids'][0]}).fetchall()
            seen['subs'] = other.execute(_t("select count(*) from submissions where problem_id = :p"),
                                         {'p': world['pids'][0]}).scalar()
        return _ok(code, tests, lang)
    monkeypatch.setattr(A, 'evaluate_code', spy)
    assert _post(world).status_code == 201
    assert seen['slots'] == [('pending',)]        # reserved and visible to others
    assert seen['subs'] == 0                      # nothing half-finished in submissions


def test_duplicate_request_while_first_is_running_is_refused(world, monkeypatch):
    calls = {'n': 0, 'second': None}
    def spy(code, tests, lang, raise_on_infra=False):
        calls['n'] += 1
        if calls['n'] == 1:                         # the "double click" arrives mid-grading
            calls['second'] = _post(world)
        return _ok(code, tests, lang)
    monkeypatch.setattr(A, 'evaluate_code', spy)
    r = _post(world)
    assert r.status_code == 201
    assert calls['second'].status_code == 409 and calls['n'] == 1     # second never ran the code
    assert _state(world) == ('done', 1, 100)                           # XP awarded once


def test_stale_pending_slot_can_be_taken_over_but_fresh_one_cannot(world, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', _ok)
    pid = world['pids'][0]
    with A.app.app_context():
        A.db.session.add(A.SubmissionSlot(user_id=world['uid'], problem_id=pid, status='pending',
                                          claimed_at=datetime.utcnow()))
        A.db.session.commit()
    assert _post(world).status_code == 409           # someone is grading right now
    with A.app.app_context():
        s = A.SubmissionSlot.query.filter_by(user_id=world['uid'], problem_id=pid).first()
        s.claimed_at = datetime.utcnow() - timedelta(seconds=A.PENDING_SLOT_STALE_SECONDS + 5)
        A.db.session.commit()
    assert _post(world).status_code == 201           # abandoned by a crash: claimable again


def test_unique_key_rejects_a_second_slot_for_the_same_attempt(world):
    from sqlalchemy.exc import IntegrityError
    with A.app.app_context():
        A.db.session.add(A.SubmissionSlot(user_id=world['uid'], problem_id=world['pids'][0], status='pending'))
        A.db.session.commit()
        A.db.session.add(A.SubmissionSlot(user_id=world['uid'], problem_id=world['pids'][0], status='pending'))
        with pytest.raises(IntegrityError):
            A.db.session.commit()
        A.db.session.rollback()


def test_xp_is_added_by_the_database_not_overwritten_from_a_stale_copy(world, monkeypatch):
    """Submission B finishes while A is still grading; A must add to B's XP, not replace it.
    (Interleaved in one process; real parallel connections are checked by mysql_concurrency_check.py.)"""
    calls = {'n': 0}
    def spy(code, tests, lang, raise_on_infra=False):
        calls['n'] += 1
        if calls['n'] == 1:
            assert _post(world, world['pids'][1]).status_code == 201
        return _ok(code, tests, lang)
    monkeypatch.setattr(A, 'evaluate_code', spy)
    r = _post(world, world['pids'][0])
    assert r.status_code == 201
    assert r.get_json()['user_xp'] == 200 and r.get_json()['user_level'] == 3
    assert _state(world, world['pids'][0])[2] == 200


def test_unfinished_attempts_never_reach_scores_analytics_or_plagiarism(world, monkeypatch):
    def boom(code, tests, lang, raise_on_infra=False):
        raise A.ExecutionInfrastructureError('down')
    monkeypatch.setattr(A, 'evaluate_code', boom)
    _post(world)
    with A.app.app_context():
        # failed and pending attempts live only in submission_slots
        assert A.Submission.query.filter_by(user_id=world['uid']).count() == 0
        assert A.db.session.get(A.User, world['uid']).xp == 0
