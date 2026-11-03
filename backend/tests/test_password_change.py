# Password change, forced change after temporary/reset passwords, token invalidation.
# sqlite; real Flask requests and real JWTs (no mocking of auth).
import os, sys, tempfile
import pytest

os.environ.setdefault('DATABASE_URL', f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'pw.db')}")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from werkzeug.security import generate_password_hash

TEMP = 'Temp1234x'


@pytest.fixture(scope='module')
def c():
    with A.app.app_context():
        for name, role in (('pw_admin', 'administrator'), ('pw_ins', 'instructor')):
            A.db.session.add(A.User(username=name, email=f'{name}@forge-test.example', role=role,
                                    password_hash=generate_password_hash('Admin1234')))
        A.db.session.commit()
    return A.app.test_client()


def login(c, ident, pw):
    r = c.post('/api/auth/login', json={'username': ident, 'password': pw})
    return r, ({'Authorization': f"Bearer {r.get_json()['access_token']}"} if r.status_code == 200 else None)


def make_student(c, sid):
    _, adm = login(c, 'pw_admin', 'Admin1234')
    r = c.post('/api/admin/users', headers=adm, json={'username': sid, 'email': '', 'password': TEMP, 'role': 'student'})
    assert r.status_code == 201, r.get_json()
    return adm


def test_new_admin_created_account_must_change_before_anything_else(c):
    make_student(c, '404000001')
    r, h = login(c, '404000001', TEMP)
    assert r.status_code == 200 and r.get_json()['must_change_password'] is True
    # everything but the allowed calls is refused by the server, whatever the client does
    for path in ('/api/problems', '/api/student/stats', '/api/student/subjects', '/api/student/submissions'):
        resp = c.get(path, headers=h)
        assert resp.status_code == 403 and resp.get_json()['error'] == 'password_change_required', path
    assert c.get('/api/auth/me', headers=h).status_code == 200
    assert c.post('/api/submissions', headers=h, json={}).status_code == 403


def test_change_flow_policy_current_password_and_new_session(c):
    h = login(c, '404000001', TEMP)[1]
    ch = lambda cur, new, hh=h: c.post('/api/auth/change-password', headers=hh, json={'current_password': cur, 'new_password': new})
    assert ch('wrong', 'Newpass123').status_code == 400                         # current must match
    assert ch(TEMP, 'short1').status_code == 400                                # too short
    assert ch(TEMP, 'onlyletters').status_code == 400                           # needs a number
    assert ch(TEMP, '12345678').status_code == 400                              # needs a letter
    assert ch(TEMP, TEMP).status_code == 400                                    # must differ
    assert ch(TEMP, '404000001').status_code == 400                             # not the username
    r = ch(TEMP, 'Newpass123')
    assert r.status_code == 200, r.get_json()
    new_h = {'Authorization': f"Bearer {r.get_json()['access_token']}"}
    assert c.get('/api/student/stats', headers=new_h).status_code != 403        # fully usable now
    # the pre-change token (same session before the change) no longer works at all
    assert c.get('/api/auth/me', headers=h).status_code == 401
    # old password dead, new password works, both identifiers
    assert login(c, '404000001', TEMP)[0].status_code == 401
    r2, _ = login(c, '404000001@student.com', 'Newpass123')
    assert r2.status_code == 200 and r2.get_json()['must_change_password'] is False


def test_other_sessions_and_refresh_tokens_end_after_a_change(c):
    make_student(c, '404000002')
    r1, h1 = login(c, '404000002', TEMP)
    rt1 = r1.get_json()['refresh_token']
    r = c.post('/api/auth/change-password', headers=h1, json={'current_password': TEMP, 'new_password': 'Fresh12345'})
    assert r.status_code == 200
    assert c.post('/api/auth/refresh', json={'refresh_token': rt1}).status_code == 401       # old refresh token dead
    assert c.post('/api/auth/refresh', json={'refresh_token': r.get_json()['refresh_token']}).status_code == 200


def test_admin_reset_forces_change_ends_sessions_and_unlocks(c):
    adm = make_student(c, '404000003')
    h = login(c, '404000003', TEMP)[1]
    c.post('/api/auth/change-password', headers=h, json={'current_password': TEMP, 'new_password': 'Chosen12345'})
    r, sh = login(c, '404000003', 'Chosen12345')
    assert r.get_json()['must_change_password'] is False
    with A.app.app_context():
        uid = A.User.query.filter_by(username='404000003').first().id
    # lock the account with wrong passwords, then the admin resets it
    for _ in range(3):
        login(c, '404000003', 'bad')
    out = c.post(f'/api/admin/users/{uid}/reset-password', headers=adm, json={'generate': True})
    assert out.status_code == 200
    temp = out.get_json()['temporary_password']
    assert len(temp) >= 12
    assert c.get('/api/auth/me', headers=sh).status_code == 401                 # session before reset ended
    r2, h2 = login(c, '404000003@student.com', temp)                            # unlocked, either identifier
    assert r2.status_code == 200 and r2.get_json()['must_change_password'] is True
    assert c.get('/api/problems', headers=h2).status_code == 403
    # admin-typed passwords obey the same policy
    assert c.post(f'/api/admin/users/{uid}/reset-password', headers=adm, json={'new_password': 'weak'}).status_code == 400


def test_policy_applies_to_admin_created_passwords_and_wrong_current_locks_out(c):
    _, adm = login(c, 'pw_admin', 'Admin1234')
    r = c.post('/api/admin/users', headers=adm, json={'username': '404000004', 'email': '', 'password': 'abc', 'role': 'student'})
    assert r.status_code == 400
    make_student(c, '404000005')
    h = login(c, '404000005', TEMP)[1]
    for _ in range(3):
        c.post('/api/auth/change-password', headers=h, json={'current_password': 'nope', 'new_password': 'Newpass123'})
    assert c.post('/api/auth/change-password', headers=h, json={'current_password': TEMP, 'new_password': 'Newpass123'}).status_code == 423


def test_existing_accounts_are_not_flagged_and_unauthenticated_calls_unaffected(c):
    # a pre-existing style account (flag default False, no token_version claim) behaves normally
    r, h = login(c, 'pw_ins', 'Admin1234')
    assert r.get_json()['must_change_password'] is False
    assert c.get('/api/auth/me', headers=h).status_code == 200
    assert c.get('/api/problems').status_code == 401


def test_passwords_never_appear_in_logs(c, caplog):
    import logging
    caplog.set_level(logging.DEBUG)
    make_student(c, '404000006')
    h = login(c, '404000006', TEMP)[1]
    c.post('/api/auth/change-password', headers=h, json={'current_password': TEMP, 'new_password': 'Secret99999'})
    text = caplog.text
    assert TEMP not in text and 'Secret99999' not in text
    with A.app.app_context():
        logs = ' '.join((l.details or '') for l in A.AuditLog.query.all())
    assert TEMP not in logs and 'Secret99999' not in logs
