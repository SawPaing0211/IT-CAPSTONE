# Instructor average-score figure and quest deadline validation / boundary.
import os, sys, tempfile
from datetime import datetime, timedelta
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'score_deadline_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

_n = {'i': 0}


@pytest.fixture()
def w():
    _n['i'] += 1
    k = _n['i']
    with A.app.app_context():
        ins = A.User(username=f'sdins{k}', email=f'sdins{k}@example.com', role='instructor',
                     password_hash=generate_password_hash('x'), full_name='I')
        s1 = A.User(username=f'31{k:05d}', email=f'31{k:05d}@student.com', role='student',
                    password_hash=generate_password_hash('x'), full_name='S1')
        s2 = A.User(username=f'32{k:05d}', email=f'32{k:05d}@student.com', role='student',
                    password_hash=generate_password_hash('x'), full_name='S2')
        subj = A.Subject(name=f'SD{k}', subject_code=f'SDSUB{k}', year_level=1, subject_type='lab')
        A.db.session.add_all([ins, s1, s2, subj]); A.db.session.flush()
        sec = A.SubjectSection(section_no=f'7{k:04d}', subject_id=subj.id, is_active=True)
        A.db.session.add(sec); A.db.session.flush()
        for s in (s1, s2):
            A.db.session.add(A.IrregularEnrollment(student_id=s.id, section_id=sec.id))
        A.db.session.add(A.TeacherAssignment(instructor_id=ins.id, subject_id=subj.id, section_id=sec.id))
        tc = [{'input': '1', 'expected': '1'}]
        easy = A.Problem(title=f'E{k}', description='d', difficulty='Easy', xp_reward=100, test_cases=tc,
                         subject_id=subj.id, created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
        med = A.Problem(title=f'M{k}', description='d', difficulty='Medium', xp_reward=250, test_cases=tc,
                        subject_id=subj.id, created_by=ins.id, is_published=True, visible_to_sections=[sec.id])
        A.db.session.add_all([easy, med]); A.db.session.commit()
        out = dict(ins=ins.id, s1=s1.id, s2=s2.id, subj=subj.id, sec=sec.id, easy=easy.id, med=med.id,
                   h={'Authorization': f'Bearer {create_access_token(identity=str(ins.id))}'},
                   sh={'Authorization': f'Bearer {create_access_token(identity=str(s1.id))}'})
    out['c'] = A.app.test_client()
    return out


def _sub(uid, pid, score):
    A.db.session.add(A.Submission(user_id=uid, problem_id=pid, code='x', language='python',
                                  status='accepted', score=score, passed_cases=1, total_cases=1))


def test_avg_score_is_xp_earned_over_xp_available_and_ignores_unsubmitted(w):
    with A.app.app_context():
        _sub(w['s1'], w['easy'], 100)   # full marks on a 100 XP quest
        _sub(w['s1'], w['med'], 25)     # floor XP on a 250 XP quest
        A.db.session.commit()           # s2 submitted nothing
    d = w['c'].get('/api/instructor/dashboard-stats', headers=w['h']).get_json()
    assert d['avg_score'] == 36        # (100+25)/(100+250) = 35.7 %, not the old 125/200 = 63 %
    b = d['avg_score_basis']
    assert (b['submissions'], b['students_submitted'], b['students_enrolled']) == (2, 1, 2)
    assert b['unsubmitted_students_excluded'] is True


def test_avg_score_is_never_above_100_for_high_xp_quests(w):
    with A.app.app_context():
        _sub(w['s1'], w['med'], 250); A.db.session.commit()
    assert w['c'].get('/api/instructor/dashboard-stats', headers=w['h']).get_json()['avg_score'] == 100


def test_avg_score_is_zero_with_no_submissions(w):
    d = w['c'].get('/api/instructor/dashboard-stats', headers=w['h']).get_json()
    assert d['avg_score'] == 0 and d['avg_score_basis']['submissions'] == 0


def _payload(w, **extra):
    p = {'title': 'DL', 'description': 'd', 'difficulty': 'Easy', 'subject_id': w['subj'], 'xp_reward': 100,
         'test_cases': [{'input': '1', 'expected': '1', 'is_hidden': False}], 'visible_to_sections': [w['sec']]}
    p.update(extra)
    return p


@pytest.mark.parametrize('bad', ['tomorrow', '2026-13-45', '05/11/2026 5pm', 12345, ['2026-11-05'], {'a': 1}])
def test_invalid_due_date_is_rejected_on_create_and_nothing_is_created(w, bad):
    with A.app.app_context():
        before = A.Problem.query.count()
    r = w['c'].post('/api/problems', headers=w['h'], json=_payload(w, due_date=bad))
    assert r.status_code == 400 and r.get_json()['error'] == 'invalid_due_date'
    with A.app.app_context():
        assert A.Problem.query.count() == before


def test_valid_forms_are_stored_as_utc(w):
    cases = {'2026-11-05T17:00:00+08:00': datetime(2026, 11, 5, 9, 0),
             '2026-11-05T09:00:00Z': datetime(2026, 11, 5, 9, 0),
             '2026-11-05T09:00:00': datetime(2026, 11, 5, 9, 0),      # no offset = UTC
             '2026-11-05': datetime(2026, 11, 5, 0, 0)}
    for text, want in cases.items():
        r = w['c'].post('/api/problems', headers=w['h'], json=_payload(w, title=text, due_date=text))
        assert r.status_code == 201, (text, r.get_json())
        with A.app.app_context():
            assert A.Problem.query.filter_by(title=text).first().due_date == want


def test_empty_due_date_means_no_deadline(w):
    for v in (None, '', '  '):
        r = w['c'].post('/api/problems', headers=w['h'], json=_payload(w, title=f'nd{v!r}', due_date=v))
        assert r.status_code == 201
        with A.app.app_context():
            assert A.Problem.query.filter_by(title=f'nd{v!r}').first().due_date is None


def test_invalid_due_date_on_update_keeps_the_existing_record_unchanged(w):
    keep = datetime(2030, 1, 1, 0, 0)
    with A.app.app_context():
        A.db.session.get(A.Problem, w['easy']).due_date = keep; A.db.session.commit()
    r = w['c'].put(f"/api/problems/{w['easy']}", headers=w['h'], json=_payload(w, title='CHANGED', due_date='next friday'))
    assert r.status_code == 400 and r.get_json()['error'] == 'invalid_due_date'
    with A.app.app_context():
        p = A.db.session.get(A.Problem, w['easy'])
        assert p.due_date == keep and p.title != 'CHANGED'
    # absent value leaves the stored deadline alone; a valid one replaces it
    r = w['c'].put(f"/api/problems/{w['easy']}", headers=w['h'], json=_payload(w, title='T2'))
    assert r.status_code == 200
    with A.app.app_context():
        assert A.db.session.get(A.Problem, w['easy']).due_date == keep
    r = w['c'].put(f"/api/problems/{w['easy']}", headers=w['h'], json=_payload(w, title='T3', due_date='2031-02-03T04:05:06Z'))
    assert r.status_code == 200
    with A.app.app_context():
        assert A.db.session.get(A.Problem, w['easy']).due_date == datetime(2031, 2, 3, 4, 5, 6)


def test_deadline_boundary_is_strictly_after_the_due_instant(w, monkeypatch):
    due = datetime(2026, 11, 5, 9, 0, 0)
    with A.app.app_context():
        A.db.session.get(A.Problem, w['easy']).due_date = due; A.db.session.commit()
    monkeypatch.setattr(A, 'evaluate_code', lambda code, tests, lang, raise_on_infra=False:
                        [{'passed': True, 'message': 'Passed', 'output': '1', 'kind': 'passed', 'hidden': False}])

    class Clock(datetime):
        now_value = due
        @classmethod
        def utcnow(cls):
            return cls.now_value
    monkeypatch.setattr(A, 'datetime', Clock)
    body = {'problem_id': w['easy'], 'code': 'print(1)', 'language': 'python'}
    Clock.now_value = due + timedelta(microseconds=1)
    r = w['c'].post('/api/submissions', headers=w['sh'], json=body)
    assert r.status_code == 403 and r.get_json()['error'] == 'Deadline passed'
    with A.app.app_context():
        assert A.Submission.query.filter_by(problem_id=w['easy']).count() == 0   # nothing consumed
    Clock.now_value = due   # exactly at the due instant: still accepted
    r = w['c'].post('/api/submissions', headers=w['sh'], json=body)
    assert r.status_code == 201, r.get_json()
