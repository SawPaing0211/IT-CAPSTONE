# The 3-wrong-password lockout does not apply to the head administrator.
import os, sys, tempfile
import pytest

_db = os.path.join(tempfile.mkdtemp(), 'head_lockout_test.db')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{_db}')
os.environ.pop('FORGE_ENV', None)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app as A
from werkzeug.security import generate_password_hash

PW = 'Testing123!'
_n = {'i': 0}


@pytest.fixture()
def accounts(monkeypatch):
    _n['i'] += 1; k = _n['i']
    with A.app.app_context():
        head = A.User(username=f'hl_head{k}', email=f'hl_head{k}@example.test', role='administrator',
                      password_hash=generate_password_hash(PW))
        other = A.User(username=f'hl_admin{k}', email=f'hl_admin{k}@example.test', role='administrator',
                       password_hash=generate_password_hash(PW))
        A.db.session.add_all([head, other]); A.db.session.commit()
        head_id = head.id
    monkeypatch.setattr(A, 'HEAD_ADMIN_USER_ID', head_id)
    monkeypatch.setattr(A, '_head_id_setting', str(head_id))
    A.rate_limit_store.clear()
    c = A.app.test_client(); c.head, c.other = f'hl_head{k}', f'hl_admin{k}'
    return c


def _login(c, name, pw):
    return c.post('/api/auth/login', json={'username': name, 'password': pw})


def test_head_admin_is_not_locked_after_wrong_passwords(accounts):
    for _ in range(5):
        assert _login(accounts, accounts.head, 'wrong').status_code == 401
    assert _login(accounts, accounts.head, PW).status_code == 200
    with A.app.app_context():
        u = A.User.query.filter_by(username=accounts.head).first()
        assert (u.login_attempts or 0) == 0 and u.locked_until is None


def test_a_previously_locked_head_admin_can_sign_in(accounts):
    from datetime import datetime, timedelta
    with A.app.app_context():
        u = A.User.query.filter_by(username=accounts.head).first()
        u.login_attempts = 3; u.locked_until = datetime.utcnow() + timedelta(minutes=15); A.db.session.commit()
    assert _login(accounts, accounts.head, PW).status_code == 200


def test_head_admin_guessing_is_throttled_not_locked(accounts):
    codes = [_login(accounts, accounts.head, 'wrong').status_code for _ in range(12)]
    assert codes[:10] == [401] * 10 and 429 in codes[10:]


def test_other_administrators_are_still_locked_after_three(accounts):
    assert _login(accounts, accounts.other, 'bad').status_code == 401
    assert _login(accounts, accounts.other, 'bad').status_code == 401
    assert _login(accounts, accounts.other, 'bad').status_code == 423
    assert _login(accounts, accounts.other, PW).status_code == 423
