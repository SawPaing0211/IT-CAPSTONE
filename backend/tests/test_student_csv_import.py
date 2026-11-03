# Student CSV imports must not need (or care about) a year_level column,
# and the first-year subject guard must not touch student data.
import io, os, sys, tempfile
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'csv_test.db')
os.environ['DATABASE_URL'] = f'sqlite:///{_db}'
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash


@pytest.fixture(scope='module')
def ctx():
    with A.app.app_context():
        admin = A.User(username='admin1', email='admin1@example.com', role='administrator',
                       password_hash=generate_password_hash('Pw12345!'), full_name='Admin')
        A.db.session.add(admin)
        # other test modules share this process and may already have created the subject
        subj = A.Subject.query.filter_by(subject_code='IT115L').first()
        if not subj:
            subj = A.Subject(name='Intro Test Lab', subject_code='IT115L', year_level=1,
                             subject_type='lab', supported_languages='python')
            A.db.session.add(subj)
        A.db.session.flush()
        for no in ('29001', '29002'):
            if not A.SubjectSection.query.filter_by(section_no=no).first():
                A.db.session.add(A.SubjectSection(section_no=no, subject_id=subj.id, is_active=True))
        A.db.session.commit()
        token = create_access_token(identity=str(admin.id))
    return {'client': A.app.test_client(), 'h': {'Authorization': f'Bearer {token}'}}


def _upload(ctx, url, csv_text, extra=None):
    data = {'file': (io.BytesIO(csv_text.encode()), 'x.csv')}
    data.update(extra or {})
    return ctx['client'].post(url, headers=ctx['h'], data=data, content_type='multipart/form-data')


ENROLL = '/api/admin/enrollment/bulk-upload'
USERS = '/api/admin/users/bulk-upload'


def test_enrollment_without_year_level(ctx):
    csv = ("student_id,firstname,middlename,lastname,suffix,student_type,section_no\n"
           "2026-10001,Ana,,Cruz,,regular,29001\n")
    r = _upload(ctx, ENROLL, csv)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['summary']['created'] == 1


def test_enrollment_old_file_with_year_level_ignored(ctx):
    # any value (even junk) must be ignored, for all year levels
    csv = ("student_id,firstname,middlename,lastname,suffix,year_level,student_type,section_no\n"
           "2026-10002,Ben,,Lim,,3,regular,29001\n"
           "2026-10003,Cai,,Ong,,9,regular,29001\n"
           "2026-10004,Dee,,Poe,,,regular,29002\n")
    r = _upload(ctx, ENROLL, csv)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['summary']['created'] == 3


def test_enrollment_without_optional_middlename_suffix(ctx):
    csv = ("student_id,firstname,lastname,student_type,section_no\n"
           "2026-10005,Eli,Tan,regular,29001\n")
    r = _upload(ctx, ENROLL, csv)
    assert r.status_code == 200, r.get_json()


def test_enrollment_irregular_multi_row_without_year(ctx):
    csv = ("student_id,firstname,lastname,student_type,section_no\n"
           "2026-10006,Fay,Uy,irregular,29001\n"
           "2026-10006,Fay,Uy,irregular,29002\n")
    r = _upload(ctx, ENROLL, csv)
    assert r.status_code == 200, r.get_json()
    with A.app.app_context():
        u = A.User.query.filter_by(username='2026-10006').first()
        assert A.IrregularEnrollment.query.filter_by(student_id=u.id).count() == 2


def test_enrollment_still_requires_real_columns(ctx):
    r = _upload(ctx, ENROLL, "student_id,firstname,lastname,student_type\n2026-1,A,B,regular\n")
    assert r.status_code == 400 and 'section_no' in r.get_json()['missing']


def test_users_bulk_without_year_level(ctx):
    csv = "student_id,firstname,lastname\n2026001,Gus,Ang\n"
    r = _upload(ctx, USERS, csv, {'role_type': 'student'})
    assert r.status_code in (200, 201, 207), r.get_json()
    assert 'year_level' not in str(r.get_json().get('missing', ''))


def test_users_bulk_old_file_with_year_level_ignored(ctx):
    csv = "student_id,firstname,lastname,year_level\n2026002,Hal,Bay,4\n2026003,Ian,Cho,99\n"
    r = _upload(ctx, USERS, csv, {'role_type': 'student'})
    body = r.get_json()
    assert r.status_code in (200, 201, 207), body
    assert not body.get('errors')


def test_no_student_year_field_on_user():
    assert not hasattr(A.User, 'year_level')
    assert set(A.User.role.type.enums) == {'student', 'instructor', 'administrator'}
    assert hasattr(A.User, 'level')   # XP level is kept


def test_subject_scope_guard(ctx):
    c, h = ctx['client'], ctx['h']
    r = c.post('/api/admin/subjects', headers=h, json={'name': 'Y2 Subj', 'subject_code': 'ZZ201', 'year_level': 2})
    assert r.status_code == 400 and 'first-year' in r.get_json()['error'].lower()
    r = c.post('/api/admin/subjects', headers=h, json={'name': 'Y1 Subj', 'subject_code': 'ZZ101', 'year_level': 1})
    assert r.status_code in (200, 201), r.get_json()
    r = c.post('/api/admin/subjects', headers=h, json={'name': 'Blank Subj', 'subject_code': 'ZZ102'})
    assert r.status_code in (200, 201)
    with A.app.app_context():
        assert A.Subject.query.filter_by(subject_code='ZZ102').first().year_level == 1


def test_login_lock_message_has_no_contact_details(ctx):
    with A.app.app_context():
        u = A.User(username='locky', email='l@example.com', role='student',
                   password_hash=generate_password_hash('Right123!'))
        A.db.session.add(u); A.db.session.commit()
    c = ctx['client']
    for _ in range(3):
        r = c.post('/api/auth/login', json={'username': 'locky', 'password': 'bad'})
    assert r.status_code == 423
    body = r.get_json()
    assert 'contact' not in body and '@' not in str(body)
    assert 'system administrator' in body['message']


# ── accounts, enrollment, permissions, XP, seed ──────────────────────────────
def _token(role, name):
    with A.app.app_context():
        u = A.User.query.filter_by(username=name).first()
        if not u:
            u = A.User(username=name, email=f'{name}@forge-test.example', role=role,
                       password_hash=generate_password_hash('Pw12345!'), full_name=name)
            A.db.session.add(u); A.db.session.commit()
        return create_access_token(identity=str(u.id))


def test_single_student_create_edit_list_without_year(ctx):
    c, h = ctx['client'], ctx['h']
    with A.app.app_context():
        sec_id = A.SubjectSection.query.filter_by(section_no='29001').first().id
    r = c.post('/api/admin/users', headers=h, json={
        'username': '2026-20001', 'email': '2026-20001@student.com', 'password': 'Pw12345!',
        'role': 'student', 'full_name': 'Solo Student', 'section_ids': [sec_id]})
    assert r.status_code in (200, 201), r.get_json()
    listing = c.get('/api/admin/users', headers=h).get_json()
    users = listing if isinstance(listing, list) else listing.get('users', [])
    mine = [u for u in users if u.get('username') == '2026-20001']
    assert mine and 'year_level' not in mine[0]
    uid = mine[0]['id']
    r = c.put(f'/api/admin/users/{uid}', headers=h, json={'full_name': 'Solo Edited'})
    assert r.status_code == 200, r.get_json()
    with A.app.app_context():
        assert A.IrregularEnrollment.query.filter_by(student_id=uid, section_id=sec_id).count() == 1


def test_any_student_can_be_enrolled_in_first_year_subject(ctx):
    # the CSV carries no year, so students "of any year" enrol identically
    with A.app.app_context():
        sec = A.SubjectSection.query.filter_by(section_no='29002').first()
        subj = A.db.session.get(A.Subject, sec.subject_id)
        assert subj.year_level == 1
        regs = A.User.query.filter(A.User.username.in_(['2026-10002', '2026-10003'])).all()
        assert len(regs) == 2


def test_permissions_unchanged(ctx):
    c = ctx['client']
    stu = {'Authorization': f"Bearer {_token('student', 'stu_x')}"}
    ins = {'Authorization': f"Bearer {_token('instructor', 'ins_x')}"}
    csv = "student_id,firstname,lastname,student_type,section_no\n2026-9,A,B,regular,29001\n"
    for hdr in (stu, ins):
        r = c.post(ENROLL, headers=hdr, data={'file': (io.BytesIO(csv.encode()), 'x.csv')},
                   content_type='multipart/form-data')
        assert r.status_code == 403, r.status_code
        assert c.post('/api/admin/subjects', headers=hdr, json={'name': 'X'}).status_code == 403
    assert c.post(ENROLL, data={}, content_type='multipart/form-data').status_code == 401


def test_xp_and_level_untouched_by_import(ctx):
    with A.app.app_context():
        u = A.User.query.filter_by(username='2026-10001').first()
        assert (u.xp, u.level) == (0, 1)
    c = ctx['client']
    with A.app.app_context():
        u = A.User.query.filter_by(username='2026-20001').first()
        u.xp, u.level = 250, 3; A.db.session.commit()
    me = c.get('/api/auth/me', headers={'Authorization': f"Bearer {_token('student','2026-20001')}"}).get_json()
    assert (me['xp'], me['level']) == (250, 3)


def test_subject_update_guard_keeps_legacy_rows_editable(ctx):
    c, h = ctx['client'], ctx['h']
    with A.app.app_context():
        legacy = A.Subject(name='Legacy Y2', subject_code='LEG201', year_level=2, subject_type='lab')
        A.db.session.add(legacy); A.db.session.commit()
        lid = legacy.id
    # editing other fields while leaving curriculum year as-is is allowed
    r = c.put(f'/api/admin/subjects/{lid}', headers=h, json={'name': 'Legacy Y2 renamed', 'year_level': 2})
    assert r.status_code == 200, r.get_json()
    # moving a subject to a non-first-year value is rejected
    r = c.put(f'/api/admin/subjects/{lid}', headers=h, json={'year_level': 3})
    assert r.status_code == 400
    # nothing was deleted or deactivated
    with A.app.app_context():
        s = A.db.session.get(A.Subject, lid)
        assert s.year_level == 2 and s.is_active is True


def test_seed_only_adds_first_year_and_reports_rest(ctx):
    with A.app.app_context():
        res = A.seed_it_subjects()
        assert res['out_of_scope'] == 8 and res['total'] == 16
        assert A.Subject.query.filter_by(subject_code='IT215').first() is None
        assert A.Subject.query.filter_by(subject_code='IT116').first().year_level == 1
        # existing rows (e.g. the IT115L created by the fixture) are left alone
        assert A.Subject.query.filter_by(subject_code='IT115L').count() == 1
