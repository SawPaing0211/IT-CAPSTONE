# Server-side access to quests, test cases, hints, drafts, Run, Submit, lessons
# and class analytics. sqlite, Docker mocked.
import os, sys, tempfile
import pytest

os.environ.setdefault('DATABASE_URL', f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'acc.db')}")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash


def _u(name, role):
    u = A.User(username=name, email=f'{name}@forge-test.example', role=role, full_name=name,
               password_hash=generate_password_hash('x'))
    A.db.session.add(u); A.db.session.flush()
    return u


def _h(uid):
    return {'Authorization': f'Bearer {create_access_token(identity=str(uid))}'}


@pytest.fixture(scope='module')
def w():
    with A.app.app_context():
        adm, insA, insB = _u('acc_adm', 'administrator'), _u('acc_insA', 'instructor'), _u('acc_insB', 'instructor')
        stuA, stuB, stuX = _u('acc_stuA', 'student'), _u('acc_stuB', 'student'), _u('acc_stuX', 'student')
        subj = A.Subject(name='Acc', subject_code='ACC1', year_level=1, subject_type='lab')
        A.db.session.add(subj); A.db.session.flush()
        secA = A.SubjectSection(section_no='88001', subject_id=subj.id, is_active=True)
        secB = A.SubjectSection(section_no='88002', subject_id=subj.id, is_active=True)
        A.db.session.add_all([secA, secB]); A.db.session.flush()
        A.db.session.add_all([
            A.IrregularEnrollment(student_id=stuA.id, section_id=secA.id),
            A.IrregularEnrollment(student_id=stuB.id, section_id=secB.id),
            A.TeacherAssignment(instructor_id=insA.id, subject_id=subj.id, section_id=secA.id),
            A.TeacherAssignment(instructor_id=insB.id, subject_id=subj.id, section_id=secB.id)])
        tc = [{'input': '1', 'expected': 'SECRET', 'visible': False}, {'input': '2', 'expected': '2'}]
        pA = A.Problem(title='PA', description='d', difficulty='Easy', xp_reward=100, test_cases=tc,
                       subject_id=subj.id, created_by=insA.id, is_published=True,
                       visible_to_sections=[secA.id], hints=[{'text': 'h', 'xp_penalty': 5}])
        pDraft = A.Problem(title='PD', description='d', difficulty='Easy', xp_reward=100, test_cases=tc,
                           subject_id=subj.id, created_by=insA.id, is_published=False, visible_to_sections=[secA.id])
        les = A.Lesson(title='L', description='d', week_number=1, subject_id=subj.id, section_id=secA.id,
                       created_by=insA.id, is_published=True)
        A.db.session.add_all([pA, pDraft, les]); A.db.session.flush()
        A.db.session.commit()
        out = dict(c=A.app.test_client(), pA=pA.id, pD=pDraft.id, secA=secA.id, secB=secB.id, les=les.id,
                   h={k: _h(v.id) for k, v in dict(adm=adm, insA=insA, insB=insB, stuA=stuA, stuB=stuB, stuX=stuX).items()},
                   ids=dict(stuA=stuA.id, stuB=stuB.id))
    return out


def test_enrolled_student_sees_problem_but_not_hidden_cases(w):
    r = w['c'].get(f"/api/problems/{w['pA']}", headers=w['h']['stuA'])
    assert r.status_code == 200
    assert 'SECRET' not in r.get_data(as_text=True)


@pytest.mark.parametrize('who', ['stuB', 'stuX'])
def test_other_class_or_unenrolled_student_gets_nothing(w, who, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code', lambda *a, **k: pytest.fail('code must not run'))
    c, h, pid = w['c'], w['h'][who], w['pA']
    assert c.get(f'/api/problems/{pid}', headers=h).status_code == 404
    assert c.get(f'/api/problems/{pid}/hints/revealed', headers=h).status_code == 404
    assert c.post(f'/api/problems/{pid}/hints/0/reveal', headers=h).status_code == 404
    assert c.get(f'/api/problems/{pid}/draft', headers=h).status_code == 404
    assert c.put(f'/api/problems/{pid}/draft', headers=h, json={'code': 'x', 'language': 'python'}).status_code == 404
    assert c.post(f'/api/problems/{pid}/run', headers=h, json={'code': 'x', 'language': 'python'}).status_code == 404
    assert c.post('/api/submissions', headers=h, json={'problem_id': pid, 'code': 'x', 'language': 'python'}).status_code == 404
    with A.app.app_context():
        assert A.SubmissionSlot.query.filter_by(problem_id=pid).count() == 0      # nothing claimed
        assert A.Submission.query.filter_by(problem_id=pid).count() == 0


def test_unpublished_problem_not_available_to_students(w):
    assert w['c'].get(f"/api/problems/{w['pD']}", headers=w['h']['stuA']).status_code == 404


def test_student_cannot_read_other_students_submission_or_history(w, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code',
                        lambda code, tests, lang, raise_on_infra=False: [{'passed': True, 'message': 'Passed', 'output': '1'} for _ in tests])
    assert w['c'].post('/api/submissions', headers=w['h']['stuA'],
                       json={'problem_id': w['pA'], 'code': 'a', 'language': 'python'}).status_code == 201
    # stuB's views only ever return stuB's own records
    r = w['c'].get(f"/api/problems/{w['pA']}/my-submission", headers=w['h']['stuB']).get_json()
    assert r['has_submitted'] is False
    hist = w['c'].get('/api/student/submissions', headers=w['h']['stuB']).get_json()
    assert hist['total'] == 0
    # students cannot use the instructor/admin views
    with A.app.app_context():
        sid = A.Submission.query.filter_by(problem_id=w['pA']).first().id
    assert w['c'].get(f'/api/instructor/submissions/{sid}/code', headers=w['h']['stuA']).status_code == 403
    assert w['c'].get(f"/api/instructor/problems/{w['pA']}/submissions", headers=w['h']['stuB']).status_code == 403


def test_historical_access_survives_leaving_the_class(w):
    # stuA already submitted above; removing the enrollment must not hide the record
    with A.app.app_context():
        A.IrregularEnrollment.query.filter_by(student_id=w['ids']['stuA'], section_id=w['secA']).delete()
        A.db.session.commit()
    try:
        assert w['c'].get(f"/api/problems/{w['pA']}", headers=w['h']['stuA']).status_code == 200
        assert w['c'].get(f"/api/problems/{w['pA']}/my-submission", headers=w['h']['stuA']).get_json()['has_submitted'] is True
        assert w['c'].get('/api/student/submissions', headers=w['h']['stuA']).get_json()['total'] == 1
        # ...but NEW activity needs current enrollment
        assert w['c'].post(f"/api/problems/{w['pA']}/run", headers=w['h']['stuA'],
                           json={'code': 'x', 'language': 'python'}).status_code == 404
        assert w['c'].put(f"/api/problems/{w['pA']}/draft", headers=w['h']['stuA'],
                          json={'code': 'x', 'language': 'python'}).status_code == 404
    finally:
        with A.app.app_context():
            A.db.session.add(A.IrregularEnrollment(student_id=w['ids']['stuA'], section_id=w['secA']))
            A.db.session.commit()


def test_instructor_and_admin_access(w, monkeypatch):
    monkeypatch.setattr(A, 'evaluate_code',
                        lambda code, tests, lang, raise_on_infra=False: [{'passed': True, 'message': 'Passed', 'output': '1'} for _ in tests])
    c, pid = w['c'], w['pA']
    body = {'code': 'x', 'language': 'python'}
    assert c.post(f'/api/problems/{pid}/test', headers=w['h']['insA'], json=body).status_code == 200
    assert c.post(f'/api/problems/{pid}/test', headers=w['h']['adm'], json=body).status_code == 200
    assert c.post(f'/api/problems/{pid}/test', headers=w['h']['insB'], json=body).status_code == 404
    with A.app.app_context():
        sid = A.Submission.query.filter_by(problem_id=pid).first().id
    assert c.get(f'/api/instructor/submissions/{sid}/code', headers=w['h']['insA']).status_code == 200
    assert c.get(f'/api/instructor/submissions/{sid}/code', headers=w['h']['adm']).status_code == 200
    assert c.get(f'/api/instructor/submissions/{sid}/code', headers=w['h']['insB']).status_code == 403


def test_class_analytics_and_plagiarism_scoped_to_own_classes(w):
    c = w['c']
    assert c.get(f"/api/instructor/classes/{w['secA']}/analytics", headers=w['h']['insB']).status_code == 403
    assert c.get(f"/api/instructor/classes/{w['secA']}/analytics", headers=w['h']['insA']).status_code == 200
    assert c.get(f"/api/instructor/classes/{w['secA']}/analytics", headers=w['h']['adm']).status_code == 200
    r = c.post('/api/instructor/plagiarism/scan', headers=w['h']['insB'], json={'problem_id': w['pA'], 'class_id': w['secA']})
    assert r.status_code in (403, 404)


def test_lesson_files_follow_the_class_not_the_subject(w):
    with A.app.app_context():
        f = A.LessonFile(lesson_id=w['les'], filename='a.txt', original_filename='a.txt', storage_path='uploads/none.txt',
                         file_type='txt', file_size=1)
        A.db.session.add(f); A.db.session.commit(); fid = f.id
    url = f"/api/lessons/{w['les']}/files/{fid}/download"
    # same SUBJECT but a different class code: refused
    assert w['c'].get(url, headers=w['h']['stuB']).status_code == 403
    assert w['c'].get(url, headers=w['h']['stuX']).status_code == 403
    # enrolled in the lesson's class: passes the access check (file itself is absent on disk)
    assert w['c'].get(url, headers=w['h']['stuA']).status_code == 404
    # list endpoint no longer exposes server paths
    r = w['c'].get(f"/api/student/lessons?section_id={w['secA']}", headers=w['h']['stuA']).get_json()
    assert 'storage_path' not in str(r)
