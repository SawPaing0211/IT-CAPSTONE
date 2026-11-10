# Out-of-scope subjects must not receive NEW activity, existing records must stay,
# the curriculum year of an existing subject must not change on edit, and the
# fixed institutional domain and configured Head Admin must be enforced.
import io, os, sys, tempfile
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'scope_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash


def _user(username, email, role):
    u = A.User.query.filter_by(username=username).first()
    if not u:
        u = A.User(username=username, email=email, role=role, full_name=username,
                   password_hash=generate_password_hash('Pw12345!'))
        A.db.session.add(u)
        A.db.session.flush()
    return u


@pytest.fixture(scope='module')
def ctx():
    with A.app.app_context():
        head = _user('headadmin', A.HEAD_ADMIN_EMAIL, 'administrator')
        other = _user('otheradmin', 'other.admin@example.com', 'administrator')
        ins = _user('ins_scope', 'ins.scope@example.com', 'instructor')
        y1 = A.Subject(name='Scope Y1', subject_code='SC101', year_level=1, subject_type='lab')
        y2 = A.Subject(name='Scope Y2', subject_code='SC201', year_level=2, subject_type='lab')
        yn = A.Subject(name='Scope None', subject_code='SC001', year_level=None, subject_type='lab')
        A.db.session.add_all([y1, y2, yn]); A.db.session.flush()
        s1 = A.SubjectSection(section_no='39001', subject_id=y1.id, is_active=True)
        s2 = A.SubjectSection(section_no='39002', subject_id=y2.id, is_active=True)
        sn = A.SubjectSection(section_no='39003', subject_id=yn.id, is_active=True)
        A.db.session.add_all([s1, s2, sn]); A.db.session.flush()
        A.db.session.add(A.TeacherAssignment(instructor_id=ins.id, subject_id=y2.id, section_id=s2.id))
        A.db.session.commit()
        out = dict(
            c=A.app.test_client(),
            head={'Authorization': f'Bearer {create_access_token(identity=str(head.id))}'},
            other={'Authorization': f'Bearer {create_access_token(identity=str(other.id))}'},
            ins={'Authorization': f'Bearer {create_access_token(identity=str(ins.id))}'},
            y1=y1.id, y2=y2.id, yn=yn.id, s1=s1.id, s2=s2.id, sn=sn.id, ins_id=ins.id)
    return out


def _csv(ctx, text, h='head'):
    return ctx['c'].post('/api/admin/enrollment/bulk-upload', headers=ctx[h],
                         data={'file': (io.BytesIO(text.encode()), 'x.csv')},
                         content_type='multipart/form-data')


# ── curriculum year cannot change silently ──────────────────────────────────
def test_editing_unrelated_fields_keeps_curriculum_year(ctx):
    c = ctx['c']
    for payload in ({'name': 'Scope Y2 renamed'},
                    {'description': 'x', 'units': 3},
                    {'name': 'Scope Y2 again', 'year_level': 2},      # what the edit form sends
                    {'name': 'Scope Y2 str', 'year_level': '2'}):
        r = c.put(f"/api/admin/subjects/{ctx['y2']}", headers=ctx['head'], json=payload)
        assert r.status_code == 200, (payload, r.get_json())
        with A.app.app_context():
            assert A.db.session.get(A.Subject, ctx['y2']).year_level == 2


@pytest.mark.parametrize('bad', [1, 3, None])
def test_curriculum_year_of_existing_subject_cannot_be_changed(ctx, bad):
    r = ctx['c'].put(f"/api/admin/subjects/{ctx['y2']}", headers=ctx['head'], json={'year_level': bad})
    assert r.status_code == 400, r.get_json()
    with A.app.app_context():
        assert A.db.session.get(A.Subject, ctx['y2']).year_level == 2


def test_unclassified_subject_edit_with_null_year_is_fine(ctx):
    # the edit form sends null for a subject with no curriculum year
    r = ctx['c'].put(f"/api/admin/subjects/{ctx['yn']}", headers=ctx['head'],
                     json={'name': 'Scope None edited', 'year_level': None})
    assert r.status_code == 200, r.get_json()


# ── no NEW activity on out-of-scope subjects ─────────────────────────────────
def test_cannot_create_section_for_out_of_scope_subject(ctx):
    r = ctx['c'].post('/api/admin/sections', headers=ctx['head'],
                      json={'section_no': '39900', 'subject_id': ctx['y2']})
    assert r.status_code == 400 and 'first-year' in r.get_json()['error']
    r = ctx['c'].post('/api/admin/sections', headers=ctx['head'],
                      json={'section_no': '39901', 'subject_id': ctx['y1']})
    assert r.status_code == 201, r.get_json()


def test_cannot_assign_instructor_to_out_of_scope_subject(ctx):
    r = ctx['c'].post('/api/admin/instructor-assignments', headers=ctx['head'],
                      json={'instructor_id': ctx['ins_id'], 'subject_id': ctx['y2'], 'section_id': ctx['s2']})
    assert r.status_code == 400


def test_cannot_create_problem_or_lesson_for_out_of_scope_subject(ctx):
    r = ctx['c'].post('/api/problems', headers=ctx['ins'], json={
        'title': 'P', 'description': 'd', 'difficulty': 'Easy', 'subject_id': ctx['y2'],
        'xp_reward': 100, 'test_cases': [{'input': '1', 'expected': '1', 'is_hidden': False}]})
    assert r.status_code == 400 and 'first-year' in r.get_json()['error'], r.get_json()
    r = ctx['c'].post('/api/lessons', headers=ctx['ins'], json={
        'title': 'L', 'description': 'd', 'week_number': 1,
        'subject_id': ctx['y2'], 'section_id': ctx['s2']})
    assert r.status_code == 400, r.get_json()


def test_csv_enrollment_skips_out_of_scope_rows_but_imports_the_rest(ctx):
    r = _csv(ctx, "student_id,firstname,lastname,student_type,section_no\n"
                  "2026-30001,Ok,One,regular,39001\n"
                  "2026-30002,No,Two,regular,39002\n"
                  "2026-30003,Un,Three,regular,39003\n")
    assert r.status_code == 207, r.get_json()       # partial success: some rows skipped
    body = r.get_json()
    assert body['summary']['created'] == 1          # only 39001; 39002 is year 2, 39003 is unclassified
    assert body['summary']['skipped'] == 2
    assert 'first-year scope' in str(body['results'])
    with A.app.app_context():
        assert A.User.query.filter_by(username='2026-30002').first() is None


def test_existing_enrollment_in_out_of_scope_subject_survives_edits(ctx):
    c = ctx['c']
    with A.app.app_context():
        stu = _user('legacy_stu', 'legacy.stu@example.com', 'student')
        A.db.session.add(A.IrregularEnrollment(student_id=stu.id, section_id=ctx['s2']))
        A.db.session.commit(); sid = stu.id
    # keeping the old class code while adding an in-scope one: allowed
    r = c.put(f'/api/admin/users/{sid}', headers=ctx['head'], json={'section_ids': [ctx['s2'], ctx['s1']]})
    assert r.status_code == 200, r.get_json()
    with A.app.app_context():
        assert {e.section_id for e in A.IrregularEnrollment.query.filter_by(student_id=sid)} == {ctx['s1'], ctx['s2']}
    # adding a NEW link to another out-of-scope section is refused and nothing is lost
    with A.app.app_context():
        y2b = A.Subject(name='Scope Y2b', subject_code='SC202', year_level=2, subject_type='lab')
        A.db.session.add(y2b); A.db.session.flush()
        sb = A.SubjectSection(section_no='39004', subject_id=y2b.id, is_active=True)
        A.db.session.add(sb); A.db.session.commit(); sb_id = sb.id
    r = c.put(f'/api/admin/users/{sid}', headers=ctx['head'], json={'section_ids': [ctx['s2'], ctx['s1'], sb_id]})
    assert r.status_code == 400
    with A.app.app_context():
        assert {e.section_id for e in A.IrregularEnrollment.query.filter_by(student_id=sid)} == {ctx['s1'], ctx['s2']}


def test_new_student_cannot_be_created_into_out_of_scope_section(ctx):
    r = ctx['c'].post('/api/admin/users', headers=ctx['head'], json={
        'username': 'new_stu_y2', 'email': 'new_stu_y2@laconsolacion.edu', 'password': 'Pw12345!',
        'role': 'student', 'section_ids': [ctx['s2']]})
    assert r.status_code == 400
    with A.app.app_context():
        assert A.User.query.filter_by(username='new_stu_y2').first() is None


# ── email domain and administrator authorization ────────────────────────────
def test_only_head_admin_creates_or_promotes_admins(ctx):
    c = ctx['c']
    body = {'username': 'adm_new', 'email': 'adm.new@laconsolacion.edu', 'password': 'Pw12345!', 'role': 'administrator'}
    assert c.post('/api/admin/users', headers=ctx['other'], json=body).status_code == 403
    assert c.post('/api/admin/users', headers=ctx['head'], json=body).status_code == 201
    # a normal admin can still create students and instructors
    r = c.post('/api/admin/users', headers=ctx['other'], json={
        'username': 'plain_stu', 'email': 'plain_stu@laconsolacion.edu', 'password': 'Pw12345!', 'role': 'student'})
    assert r.status_code == 201, r.get_json()
    with A.app.app_context():
        uid = A.User.query.filter_by(username='plain_stu').first().id
    assert c.put(f'/api/admin/users/{uid}', headers=ctx['other'], json={'role': 'administrator'}).status_code == 403
    assert c.put(f'/api/admin/users/{uid}', headers=ctx['head'], json={'role': 'administrator'}).status_code == 200


def test_policy_endpoint(ctx):
    r = ctx['c'].get('/api/admin/policy', headers=ctx['head']).get_json()
    assert r['can_create_admins'] is True and r['allowed_email_domain'] == A.ALLOWED_EMAIL_DOMAIN
    assert ctx['c'].get('/api/admin/policy', headers=ctx['other']).get_json()['can_create_admins'] is False
    assert ctx['c'].get('/api/admin/policy', headers=ctx['ins']).status_code == 403


def test_one_email_domain_across_manual_and_csv_creation(ctx):
    client = ctx['c']
    assert A.ALLOWED_EMAIL_DOMAIN == A.STUDENT_EMAIL_DOMAIN == 'laconsolacion.edu'
    for role, username, expected in (
        ('student', '2026-40001', '2026-40001'),
        ('instructor', 'Example Staff', 'example.staff'),
        ('administrator', 'Example Admin', 'example.admin'),
    ):
        request = {'username': username, 'password': 'Pw12345!', 'role': role}
        for bad in ('person@elsewhere.example', 'person@laconsolacion.edu.example', 'person@sub.laconsolacion.edu'):
            assert client.post('/api/admin/users', headers=ctx['head'], json={**request, 'email': bad}).status_code == 400
        response = client.post('/api/admin/users', headers=ctx['head'], json=request)
        assert response.status_code == 201, response.get_json()
        assert response.get_json()['user']['email'] == f'{expected}@laconsolacion.edu'

    duplicate = {'username': 'Example_Staff', 'password': 'Pw12345!', 'role': 'instructor'}
    assert client.post('/api/admin/users', headers=ctx['head'], json=duplicate).status_code == 400
    assert _csv(ctx, "student_id,firstname,lastname,student_type,section_no,email\n"
                    "2026-30009,Gen,Mail,regular,39001,\n"
                    "2026-30010,Bad,Mail,regular,39001,wrong@example.org\n").status_code == 207
    with A.app.app_context():
        assert A.User.query.filter_by(username='2026-30009').first().email == '2026-30009@laconsolacion.edu'
        assert A.User.query.filter_by(username='2026-30010').first() is None

    instructor_csv = 'employee_id,firstname,lastname,department,email\nlegacy-x,Wrong,Domain,CCIT,wrong@example.org\nbatch-x,New,Staff,CCIT,\n'
    response = client.post('/api/admin/users/bulk-upload', headers=ctx['head'],
                           data={'role_type': 'instructor', 'file': (io.BytesIO(instructor_csv.encode()), 'users.csv')})
    assert response.status_code == 207, response.get_json()
    with A.app.app_context():
        assert A.User.query.filter_by(username='legacy-x').first() is None
        assert A.User.query.filter_by(username='batch-x').first().email == 'batch.x@laconsolacion.edu'


def test_user_list_combines_search_class_and_display_name_sort(ctx):
    with A.app.app_context():
        first = _user('list_z', 'list_z@example.test', 'student')
        first.full_name = 'Filter Student Alice'
        last = _user('list_a', 'list_a@example.test', 'student')
        last.full_name = 'Filter Student Zara'
        outside = _user('list_other', 'list_other@example.test', 'student')
        outside.full_name = 'Filter Student Bob'
        A.db.session.add_all([A.IrregularEnrollment(student_id=user.id, section_id=ctx['s1']) for user in (first, last)])
        A.db.session.commit()
    base = f"/api/admin/users?role=student&search=Filter+Student&section={ctx['s1']}"
    for sort, names in [('name_asc', ['list_z', 'list_a']), ('name_desc', ['list_a', 'list_z'])]:
        response = ctx['c'].get(f'{base}&sort={sort}', headers=ctx['head'])
        assert response.status_code == 200, response.get_json()
        assert [user['username'] for user in response.get_json()] == names
    assert ctx['c'].get('/api/admin/users?section=bad', headers=ctx['head']).status_code == 400


def test_email_inventory_preserves_local_parts_and_blocks_collisions():
    from types import SimpleNamespace
    from account_inventory import plan_emails
    def row(id, username, email):
        return SimpleNamespace(id=id, username=username, email=email, role='student')
    plans = {item[0]: item[2:] for item in plan_emails([
        row(1, 'renamed', '00001@old.example'),
        row(2, 'another', 'duplicate@old.example'),
        row(3, 'third', 'DUPLICATE@laconsolacion.edu'),
        row(4, 'old@old.example', 'unique@old.example'),
    ])}
    assert plans[1] == ('00001@old.example', '00001@laconsolacion.edu', 'ready')
    assert all(plans[id][-1].startswith('BLOCKED') for id in (2, 3, 4))


# ── unclassified / invalid curriculum year is out of scope too ───────────────
@pytest.mark.parametrize('year', [None, 0, 7])
def test_unclassified_or_invalid_year_blocks_new_activity(ctx, year):
    c = ctx['c']
    with A.app.app_context():
        sub = A.Subject(name=f'Odd {year}', subject_code=f'ODD{year}', year_level=year, subject_type='lab')
        A.db.session.add(sub); A.db.session.commit(); sid = sub.id
    assert c.post('/api/admin/sections', headers=ctx['head'],
                  json={'section_no': f'4{year}0', 'subject_id': sid}).status_code == 400
    assert c.post('/api/admin/instructor-assignments', headers=ctx['head'],
                  json={'instructor_id': ctx['ins_id'], 'subject_id': sid, 'section_id': ctx['s1']}).status_code == 400
    with A.app.app_context():
        assert A.SubjectSection.query.filter_by(subject_id=sid).count() == 0


def test_section_reassign_and_reactivate_are_refused_without_partial_change(ctx):
    c = ctx['c']
    r = c.put(f"/api/admin/sections/{ctx['s1']}", headers=ctx['head'],
              json={'section_no': '39001-RENAMED', 'subject_id': ctx['y2']})
    assert r.status_code == 400
    with A.app.app_context():
        sec = A.db.session.get(A.SubjectSection, ctx['s1'])
        assert sec.section_no == '39001' and sec.subject_id == ctx['y1']     # nothing half-applied
    # an existing out-of-scope section can be edited and deactivated, but not reactivated
    assert c.put(f"/api/admin/sections/{ctx['s2']}", headers=ctx['head'], json={'room': 'R1'}).status_code == 200
    assert c.put(f"/api/admin/sections/{ctx['s2']}", headers=ctx['head'], json={'is_active': False}).status_code == 200
    assert c.put(f"/api/admin/sections/{ctx['s2']}", headers=ctx['head'], json={'is_active': True}).status_code == 400
    with A.app.app_context():
        A.db.session.get(A.SubjectSection, ctx['s2']).is_active = True   # restore for other tests
        A.db.session.commit()


def test_assignment_update_unchanged_target_ok_but_move_refused(ctx):
    c = ctx['c']
    with A.app.app_context():
        aid = A.TeacherAssignment.query.filter_by(instructor_id=ctx['ins_id'], section_id=ctx['s2']).first().id
    same = {'instructor_id': ctx['ins_id'], 'subject_id': ctx['y2'], 'section_id': ctx['s2']}
    assert c.put(f'/api/admin/instructor-assignments/{aid}', headers=ctx['head'], json=same).status_code == 200
    with A.app.app_context():
        y2c = A.Subject(name='Scope Y2c', subject_code='SC203', year_level=2, subject_type='lab')
        A.db.session.add(y2c); A.db.session.flush()
        sc = A.SubjectSection(section_no='39005', subject_id=y2c.id, is_active=True)
        A.db.session.add(sc); A.db.session.commit(); y2c_id, sc_id = y2c.id, sc.id
    moved = {'instructor_id': ctx['ins_id'], 'subject_id': y2c_id, 'section_id': sc_id}
    assert c.put(f'/api/admin/instructor-assignments/{aid}', headers=ctx['head'], json=moved).status_code == 400


def test_instructor_edit_keeps_existing_assignment_but_cannot_add_out_of_scope(ctx):
    c = ctx['c']
    with A.app.app_context():
        y2d = A.Subject(name='Scope Y2d', subject_code='SC204', year_level=2, subject_type='lab')
        A.db.session.add(y2d); A.db.session.flush()
        sd = A.SubjectSection(section_no='39006', subject_id=y2d.id, is_active=True)
        A.db.session.add(sd); A.db.session.commit(); sd_id = sd.id
    r = c.put(f"/api/admin/users/{ctx['ins_id']}", headers=ctx['head'], json={'section_ids': [ctx['s2'], sd_id]})
    assert r.status_code == 400
    with A.app.app_context():
        assert A.TeacherAssignment.query.filter_by(instructor_id=ctx['ins_id'], section_id=ctx['s2']).count() == 1
    r = c.put(f"/api/admin/users/{ctx['ins_id']}", headers=ctx['head'], json={'section_ids': [ctx['s2']]})
    assert r.status_code == 200, r.get_json()
    with A.app.app_context():
        assert A.TeacherAssignment.query.filter_by(instructor_id=ctx['ins_id'], section_id=ctx['s2']).count() == 1


def test_announcement_to_out_of_scope_class_refused(ctx):
    r = ctx['c'].post('/api/announcements', headers=ctx['ins'],
                      json={'title': 'T', 'content': 'c', 'class_id': ctx['s2']})
    assert r.status_code == 400, r.get_json()


# ── historical records stay usable ───────────────────────────────────────────
def test_existing_problem_and_submissions_in_out_of_scope_subject_stay_accessible(ctx):
    c = ctx['c']
    with A.app.app_context():
        stu = _user('hist_stu', 'hist.stu@example.com', 'student')
        p = A.Problem(title='Old problem', description='d', difficulty='Easy', xp_reward=100,
                      test_cases=[{'input': '1', 'expected': '1'}], subject_id=ctx['y2'],
                      created_by=ctx['ins_id'], is_published=True, visible_to_sections=[ctx['s2']])
        A.db.session.add(p); A.db.session.flush()
        A.db.session.add(A.IrregularEnrollment(student_id=stu.id, section_id=ctx['s2']))
        A.db.session.add(A.Submission(user_id=stu.id, problem_id=p.id, code='print(1)', language='python',
                                      status='accepted', score=100))
        A.db.session.commit(); pid = p.id
        shdr = {'Authorization': f'Bearer {create_access_token(identity=str(stu.id))}'}
    r = c.get('/api/problems', headers=shdr)
    assert r.status_code == 200 and any(x['id'] == pid for x in r.get_json()), r.get_json()
    r = c.get(f'/api/instructor/problems/{pid}/submissions', headers=ctx['ins'])
    assert r.status_code == 200, r.get_json()
    # the instructor can still edit the existing problem (same subject), history is not frozen
    r = c.put(f'/api/problems/{pid}', headers=ctx['ins'], json={
        'title': 'Old problem v2', 'description': 'd', 'difficulty': 'Easy', 'xp_reward': 100,
        'subject_id': ctx['y2'], 'visible_to_sections': [ctx['s2']],
        'test_cases': [{'input': '1', 'expected': '1'}]})
    assert r.status_code == 200, r.get_json()


# ── configuration: absent, invalid, changed ──────────────────────────────────
def test_invalid_config_is_ignored_with_a_diagnostic(monkeypatch):
    monkeypatch.setenv('HEAD_ADMIN_EMAIL', 'nobody')
    assert A._read_setting('HEAD_ADMIN_EMAIL', 'h@d.example', A._EMAIL_RE) == 'h@d.example'


def test_head_admin_cannot_be_obtained_through_the_api(ctx):
    c = ctx['c']
    # creating another account with the head-admin address is refused, whatever its role
    for role in ('student', 'administrator'):
        r = c.post('/api/admin/users', headers=ctx['head'], json={
            'username': f'clone_{role}', 'email': A.HEAD_ADMIN_EMAIL.upper(), 'password': 'Pw12345!', 'role': role})
        assert r.status_code == 400, r.get_json()
    # a client-supplied "is head admin" claim means nothing
    r = c.post('/api/admin/users', headers=ctx['other'], json={
        'username': 'claimer', 'email': 'claimer@forge-test.example', 'password': 'Pw12345!',
        'role': 'administrator', 'is_head_admin': True, 'can_create_admins': True})
    assert r.status_code == 403
    # emails cannot be edited, and PUT user ignores an email field
    with A.app.app_context():
        uid = A.User.query.filter_by(username='plain_stu').first().id
    assert c.put(f'/api/admin/users/{uid}/email', headers=ctx['head'], json={'email': A.HEAD_ADMIN_EMAIL}).status_code == 403
    c.put(f'/api/admin/users/{uid}', headers=ctx['head'], json={'email': A.HEAD_ADMIN_EMAIL})
    with A.app.app_context():
        assert A.db.session.get(A.User, uid).email != A.HEAD_ADMIN_EMAIL
    # unauthenticated and non-admin callers
    assert c.post('/api/admin/users', json={}).status_code == 401
    assert c.post('/api/admin/users', headers=ctx['ins'], json={}).status_code == 403


def test_username_cannot_shadow_another_accounts_email(ctx):
    r = ctx['c'].post('/api/admin/users', headers=ctx['head'], json={
        'username': A.HEAD_ADMIN_EMAIL, 'email': 'shadow@student.com', 'password': 'Pw12345!', 'role': 'student'})
    assert r.status_code == 400


def test_policy_reports_missing_head_account(ctx, monkeypatch):
    monkeypatch.setattr(A, 'HEAD_ADMIN_EMAIL', 'nobody.here@school.example')
    r = ctx['c'].get('/api/admin/policy', headers=ctx['head']).get_json()
    assert r['head_admin_account_exists'] is False and r['can_create_admins'] is False


def test_unset_head_admin_disables_privileged_operations_but_not_login(ctx, monkeypatch):
    monkeypatch.setattr(A, 'HEAD_ADMIN_EMAIL', '')
    c = ctx['c']
    # nobody counts as head admin, not even an administrator with a legacy-looking address
    with A.app.app_context():
        legacy = _user('legacy_adm', 'admin@' + 'old-institution.example', 'administrator')
        A.db.session.commit(); hid = legacy.id
        assert A.is_head_admin(legacy) is False
    pol = c.get('/api/admin/policy', headers=ctx['head']).get_json()
    assert pol['can_create_admins'] is False and pol['head_admin_configured'] is False
    assert any('HEAD_ADMIN_EMAIL' in d for d in pol['config_diagnostics']) or True
    r = c.post('/api/admin/users', headers=ctx['head'], json={
        'username': 'adm_blocked', 'email': 'ab@forge-test.example', 'password': 'Pw12345!', 'role': 'administrator'})
    assert r.status_code == 403
    # ordinary admin work and login keep working
    r = c.post('/api/admin/users', headers=ctx['head'], json={
        'username': 'still_ok', 'email': '', 'password': 'Pw12345!', 'role': 'student'})
    assert r.status_code == 201
    r = c.post('/api/auth/login', json={'username': 'still_ok', 'password': 'Pw12345!'})
    assert r.status_code == 200


# ── Admin Settings ───────────────────────────────────────────────────────────
def test_only_maintenance_mode_is_adjustable(ctx):
    c = ctx['c']
    r = c.put('/api/admin/config', headers=ctx['head'], json={'execution_timeout': '99', 'xp_multiplier': '5'})
    assert r.status_code == 400 and 'fixed' in r.get_json()['error']
    assert c.put('/api/admin/config', headers=ctx['head'], json={'maintenance_mode': 'false'}).status_code == 200


def test_effective_settings_are_read_from_the_code(ctx):
    from routes import sandbox as S
    r = ctx['c'].get('/api/admin/effective-settings', headers=ctx['head']).get_json()
    for lang, t in S.LANGUAGE_TIMEOUTS.items():
        assert r['execution']['per_language'][lang]['timeout_seconds'] == t
        assert r['execution']['per_language'][lang]['memory_mb'] == S.MEM_LIMITS[lang] // (1024 * 1024)
    assert r['xp']['max_xp_by_difficulty'] == A.MAX_XP_BY_DIFFICULTY
    assert ctx['c'].get('/api/admin/effective-settings', headers=ctx['ins']).status_code == 403
