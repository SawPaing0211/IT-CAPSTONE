# Student ID / generated @laconsolacion.edu identifier: both resolve to one account,
# one password, one lockout counter. All roles use the same institution domain.
import os, sys, tempfile
import pytest

os.environ.setdefault('DATABASE_URL', f"sqlite:///{os.path.join(tempfile.mkdtemp(), 'ident.db')}")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app as A
from werkzeug.security import generate_password_hash

PW = 'Pw12345!'


def _mk(username, email, role='student'):
    u = A.User(username=username, email=email, role=role, full_name=username,
               password_hash=generate_password_hash(PW))
    A.db.session.add(u); A.db.session.commit()
    return u.id


@pytest.fixture(scope='module')
def c():
    with A.app.app_context():
        _mk('202600123', '202600123@laconsolacion.edu')
        _mk('legacy01', 'legacy01@old-domain.example')       # legacy-style account
        _mk('202600777', 'someone.else@example.org')         # ID whose stored email is not generated
        _mk('202600888', '202600888@laconsolacion.edu')
        _mk('amb@laconsolacion.edu', 'amb2@example.org')           # username shaped like an email
        _mk('staff1', 'staff1@laconsolacion.edu', 'instructor')
        _mk('staff2', 'staff2@example.org', 'instructor')
    return A.app.test_client()


def login(c, ident, pw=PW):
    return c.post('/api/auth/login', json={'username': ident, 'password': pw})


def test_generated_identifier_helpers():
    assert A.generated_student_email('202600123') == '202600123@laconsolacion.edu'
    assert A.generated_student_email(' 0000456 ') == '0000456@laconsolacion.edu'      # leading zeros kept
    assert A.valid_student_id('0000456') and not A.valid_student_id('12 3') and not A.valid_student_id('a@b')


@pytest.mark.parametrize('ident', ['202600123', ' 202600123 ', '202600123@laconsolacion.edu',
                                   '202600123@LACONSOLACION.EDU', '  202600123@Laconsolacion.edu '])
def test_both_identifiers_reach_the_same_account(c, ident):
    r = login(c, ident)
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['user']['username'] == '202600123'


def test_student_id_reaches_account_even_if_stored_email_differs(c):
    # Neither an inferred alias nor a legacy domain can authenticate.
    assert login(c, '202600777').get_json()['user']['username'] == '202600777'
    assert login(c, '202600777@laconsolacion.edu').status_code == 401
    assert login(c, 'someone.else@example.org').status_code == 401


def test_legacy_email_rejected_but_username_still_works(c):
    assert login(c, 'LEGACY01@old-domain.example').status_code == 401
    assert login(c, 'legacy01').status_code == 200


def test_wrong_password_rejected_either_way(c):
    assert login(c, '202600888', 'nope').status_code == 401
    assert login(c, '202600888@laconsolacion.edu', 'nope').status_code == 401


def test_lockout_is_shared_between_identifiers(c):
    with A.app.app_context():
        _mk('202609999', '202609999@laconsolacion.edu')
    assert login(c, '202609999', 'bad').status_code == 401
    assert login(c, '202609999@laconsolacion.edu', 'bad').status_code == 401
    assert login(c, '202609999', 'bad').status_code == 423
    # now locked for BOTH identifiers, even with the right password
    assert login(c, '202609999@laconsolacion.edu').status_code == 423
    assert login(c, '202609999').status_code == 423


def test_ambiguous_identifier_is_refused(c):
    # One account has this stored email; another has the same legacy username.
    with A.app.app_context():
        _mk('amb', 'amb@laconsolacion.edu')
    r = login(c, 'amb@laconsolacion.edu')
    assert r.status_code == 401
    assert login(c, 'amb').status_code == 200          # the unambiguous ID still works


def test_unknown_and_empty_identifiers(c):
    assert login(c, '999999999').status_code == 401
    assert login(c, '999999999@laconsolacion.edu').status_code == 401
    assert c.post('/api/auth/login', json={'username': '  ', 'password': PW}).status_code == 400


def test_staff_login_uses_the_same_domain(c):
    assert login(c, 'staff1').status_code == 200
    assert login(c, 'staff1@laconsolacion.edu').status_code == 200
    assert login(c, 'staff2@example.org').status_code == 401
    assert login(c, 'staff2@laconsolacion.edu').status_code == 401
    assert login(c, 'staff2').status_code == 200
