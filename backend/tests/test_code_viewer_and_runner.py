# Instructor code viewer shows only what was stored; the demo runner cannot be enabled by accident.
import os, sys, subprocess, tempfile
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'viewer_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

BACKEND = os.path.join(os.path.dirname(__file__), '..')
_n = {'i': 0}


@pytest.fixture()
def world():
    _n['i'] += 1
    k = _n['i']
    with A.app.app_context():
        ins = A.User(username=f'vins{k}', email=f'vins{k}@example.com', role='instructor',
                     password_hash=generate_password_hash('x'), full_name='I')
        stu = A.User(username=f'30{k:05d}', email=f'30{k:05d}@student.com', role='student',
                     password_hash=generate_password_hash('x'), full_name='S', xp=40)
        subj = A.Subject(name=f'VS{k}', subject_code=f'VSUB{k}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, stu, subj]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'8{k:04d}', subject_id=subj.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        A.db.session.add(A.IrregularEnrollment(student_id=stu.id, section_id=sec.id))
        A.db.session.add(A.TeacherAssignment(instructor_id=ins.id, subject_id=subj.id, section_id=sec.id))
        p = A.Problem(title=f'VP{k}', description='d', difficulty='Easy', xp_reward=100,
                      test_cases=[{'input': '1', 'expected': '1'}, {'input': '2', 'expected': '2', 'visible': False}],
                      subject_id=subj.id, created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
        A.db.session.add(p); A.db.session.flush()
        legacy = A.Submission(user_id=stu.id, problem_id=p.id, code='print(1)', language='python',
                              status='partial', score=50, passed_cases=1, total_cases=2)
        A.db.session.add(legacy); A.db.session.commit()
        w = dict(sid=stu.id, pid=p.id, legacy=legacy.id,
                 h={'Authorization': f'Bearer {create_access_token(identity=str(ins.id))}'},
                 sh={'Authorization': f'Bearer {create_access_token(identity=str(stu.id))}'})
    w['c'] = A.app.test_client()
    return w


def _boom(*a, **k):
    raise AssertionError('the viewer must never run code')


def _snapshot(w):
    with A.app.app_context():
        return (A.Submission.query.count(), A.SubmissionSlot.query.count(), A.db.session.get(A.User, w['sid']).xp)


def test_viewer_does_not_execute_or_change_anything_and_flags_legacy(world, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', _boom)
    before = _snapshot(world)
    r = world['c'].get(f"/api/instructor/submissions/{world['legacy']}/code", headers=world['h'])
    assert r.status_code == 200
    d = r.get_json()
    assert d['results_recorded'] is False and d['test_results'] == []
    assert 'before per-test results were recorded' in d['note']
    assert (d['status'], d['score'], d['passed_cases'], d['total_cases']) == ('partial', 50, 1, 2)
    assert _snapshot(world) == before


def test_new_submission_records_results_and_viewer_shows_them(world, monkeypatch):
    def fake(code, tests, lang, raise_on_infra=False):
        return [{'passed': True, 'message': 'Passed', 'output': '1', 'kind': 'passed', 'hidden': False},
                {'passed': False, 'message': 'Wrong', 'output': 'SECRET-HIDDEN-DATA', 'kind': 'wrong_output', 'hidden': True}]
    monkeypatch.setattr(A, 'evaluate_code', fake)
    # a second problem so the legacy record does not occupy the single attempt
    with A.app.app_context():
        p0 = A.db.session.get(A.Problem, world['pid'])
        p2 = A.Problem(title='VP-new', description='d', difficulty='Easy', xp_reward=100, test_cases=p0.test_cases,
                       subject_id=p0.subject_id, created_by=p0.created_by, is_published=True,
                       visible_to_sections=p0.visible_to_sections)
        A.db.session.add(p2); A.db.session.commit(); pid2 = p2.id
    r = world['c'].post('/api/submissions', headers=world['sh'], json={'problem_id': pid2, 'code': 'print(1)', 'language': 'python'})
    assert r.status_code == 201, r.get_json()
    sub_id = r.get_json()['submission_id']
    monkeypatch.setattr(A, 'evaluate_code', _boom)
    before = _snapshot(world)
    d = world['c'].get(f'/api/instructor/submissions/{sub_id}/code', headers=world['h']).get_json()
    assert d['results_recorded'] is True and d['execution_mode'] == 'docker-sandbox'
    assert [t['index'] for t in d['test_results']] == [1, 2]
    hidden = d['test_results'][1]
    assert hidden['hidden'] is True and 'output' not in hidden and 'message' not in hidden
    assert 'SECRET-HIDDEN-DATA' not in str(d)
    assert _snapshot(world) == before


def test_other_instructors_cannot_open_it(world):
    with A.app.app_context():
        o = A.User(username='vother', email='vother@example.com', role='instructor', password_hash=generate_password_hash('x'))
        A.db.session.add(o); A.db.session.commit()
        h = {'Authorization': f'Bearer {create_access_token(identity=str(o.id))}'}
    assert world['c'].get(f"/api/instructor/submissions/{world['legacy']}/code", headers=h).status_code == 403
    assert world['c'].get(f"/api/instructor/submissions/{world['legacy']}/code", headers=world['sh']).status_code == 403


def _run(code, env):
    e = {k: v for k, v in os.environ.items() if not k.startswith('FORGE_')}
    e.update(env)
    return subprocess.run([sys.executable, '-c', code], cwd=BACKEND, env=e, capture_output=True, text=True, timeout=60)


PROD = {'FORGE_ENV': 'production', 'SECRET_KEY': 'k' * 40, 'JWT_SECRET_KEY': 'j' * 40,
        'DATABASE_URL': 'sqlite:///' + os.path.join(tempfile.mkdtemp(), 'prod_demo_check.db')}


def test_production_refuses_demo_runner_flag():
    r = _run('import app', {**PROD, 'FORGE_DEMO_RUNNER': '1'})
    assert r.returncode != 0 and 'Refusing to start in production' in (r.stderr + r.stdout)


def test_production_refuses_demo_flag():
    r = _run('import app', {**PROD, 'FORGE_DEMO': '1'})
    assert r.returncode != 0 and 'Refusing to start in production' in (r.stderr + r.stdout)


def test_demo_runner_needs_both_flags_and_labels_results():
    r = _run('import app, demo_runner; demo_runner.install(app)', {'DATABASE_URL': PROD['DATABASE_URL']})
    assert r.returncode != 0 and 'FORGE_DEMO_RUNNER=1 and FORGE_DEMO=1' in (r.stderr + r.stdout)
    r = _run('import app, demo_runner; demo_runner.install(app); print(app.EXECUTION_MODE)',
             {'DATABASE_URL': PROD['DATABASE_URL'], 'FORGE_DEMO': '1', 'FORGE_DEMO_RUNNER': '1'})
    assert r.returncode == 0 and 'demo-stub' in r.stdout, r.stderr[-400:]


def test_health_reports_execution_mode(world):
    assert world['c'].get('/api/health').get_json()['execution_mode'] == 'docker-sandbox'
