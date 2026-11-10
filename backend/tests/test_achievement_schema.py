# Effective-uniqueness detection, explicit upgrade, fail-safe on duplicate-bearing schemas, read-only audit.
# Each case runs the app in a SUBPROCESS against its own throwaway SQLite file whose user_achievements table has
# been rebuilt in the shape under test (SQLite checks the logic of detection/upgrade; MySQL DDL behaviour is
# covered separately by mysql_achievement_integrity_check.py).
import os, sys, json, sqlite3, subprocess, hashlib, tempfile
import pytest

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE_DDL = ("CREATE TABLE user_achievements (id INTEGER NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, "
            "achievement_id INTEGER NOT NULL, earned_at DATETIME, progress INTEGER, "
            "FOREIGN KEY(user_id) REFERENCES users (id), FOREIGN KEY(achievement_id) REFERENCES achievements (id))")


def env_for(path, auto=False):
    e = {k: v for k, v in os.environ.items() if k not in ('FORGE_AUTO_SCHEMA', 'ALLOWED_EMAIL_DOMAIN', 'FORGE_ENV', 'DATABASE_URL')}
    e.update(DATABASE_URL=f'sqlite:///{path}', HEAD_ADMIN_EMAIL='head.admin@forge-test.example', STUDENT_EMAIL_DOMAIN='student.com')
    if auto:
        e['FORGE_AUTO_SCHEMA'] = '1'
    return e


def py(code, path, auto=False):
    r = subprocess.run([sys.executable, '-W', 'ignore', '-c', f"import sys; sys.path.insert(0, {BACKEND!r})\n" + code],
                       cwd=BACKEND, env=env_for(path, auto), capture_output=True, text=True, timeout=120)
    return r.returncode, r.stdout + r.stderr


def cli(path, *args, stdin=None):
    r = subprocess.run([sys.executable, '-W', 'ignore', os.path.join(BACKEND, 'manage_schema.py'), *args],
                       cwd=BACKEND, env=env_for(path), capture_output=True, text=True, timeout=120, input=stdin)
    return r.returncode, r.stdout + r.stderr


def json_block(out):
    i = out.index('\n{\n') + 1          # the report is the pretty-printed object; startup lines may precede it
    return json.loads(out[i:out.rindex('}') + 1])


def file_hash(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def rows(path):
    c = sqlite3.connect(path)
    try:
        return c.execute('SELECT id,user_id,achievement_id,earned_at,progress FROM user_achievements ORDER BY id').fetchall()
    finally:
        c.close()


@pytest.fixture()
def legacy(tmp_path):
    """factory(extra_sql=[...], data=bool) -> path of a fully built DB whose user_achievements is rebuilt as a legacy table."""
    def make(extra=(), dups=False, ddl=BASE_DDL):
        path = str(tmp_path / 'forge_test_schema.db')
        if os.path.exists(path):
            os.remove(path)
        rc, out = py("import app", path, auto=True); assert rc == 0, out
        c = sqlite3.connect(path)
        c.execute('DROP TABLE user_achievements'); c.execute(ddl)
        for sql in extra:
            c.execute(sql)
        c.execute("INSERT INTO users (id, username, email, role, password_hash, xp, level) VALUES (501,'s1','s1@student.com','student','x',777,3), (502,'s2','s2@student.com','student','x',50,1)")
        sandbox = c.execute("SELECT id FROM achievements WHERE requirement_type='sandbox_runs'").fetchone()[0]     # unsupported definition
        fs = c.execute("SELECT id FROM achievements WHERE name='First Steps'").fetchone()[0]
        pn = c.execute("SELECT id FROM achievements WHERE name='Python Novice'").fetchone()[0]
        data = [(501, sandbox, '2026-09-01 08:00:00', 0), (502, fs, '2026-09-02 08:00:00', 1)]
        if dups:
            data += [(501, fs, '2026-10-22 16:00:00', 1), (501, fs, '2026-10-22 15:59:59', 3), (501, fs, None, 2),
                     (502, pn, '2026-09-05 08:00:00', 5), (502, pn, '2026-09-05 08:00:00', 5)]
        for u, a, t, p in data:
            c.execute('INSERT INTO user_achievements (user_id, achievement_id, earned_at, progress) VALUES (?,?,?,?)', (u, a, t, p))
        c.commit(); c.close()
        return path
    return make


def status(path):
    rc, out = py("import json, app as A; print('S=' + json.dumps(A.schema_status()))", path)
    assert rc == 0, out
    return json.loads([l for l in out.splitlines() if l.startswith('S=')][0][2:])


# ---------------------------------------------------------------- A8 detection
CASES = [
    ('no uniqueness at all',                       [], False),
    ('plain (non-unique) composite index',         ['CREATE INDEX ix_pair ON user_achievements (user_id, achievement_id)'], False),
    ('unique on user_id only',                     ['CREATE UNIQUE INDEX u1 ON user_achievements (user_id)'], False),
    ('two separate unique columns',                ['CREATE UNIQUE INDEX u1 ON user_achievements (user_id)', 'CREATE UNIQUE INDEX u2 ON user_achievements (achievement_id)'], False),
    ('unique over three columns',                  ['CREATE UNIQUE INDEX u3 ON user_achievements (user_id, achievement_id, progress)'], False),
    ('partial unique index (filtered)',            ['CREATE UNIQUE INDEX up ON user_achievements (user_id, achievement_id) WHERE progress > 0'], False),
    ('unique pair, any name, reversed columns',    ['CREATE UNIQUE INDEX whatever_name ON user_achievements (achievement_id, user_id)'], True),
    ('unique pair as the canonical name',          ['CREATE UNIQUE INDEX uq_user_achievement ON user_achievements (user_id, achievement_id)'], True),
]


@pytest.mark.parametrize('label,extra,ok', CASES, ids=[c[0] for c in CASES])
def test_a8_effective_uniqueness_detection_is_read_only(legacy, label, extra, ok):
    path = legacy(extra)
    before = file_hash(path)
    st = status(path)
    assert st['up_to_date'] is ok, (label, st)
    assert (not st['missing_constraints']) is ok
    assert file_hash(path) == before                        # status / app start changed nothing (byte-identical file)


def test_a8_outdated_constraint_blocks_the_api_with_503_and_changes_nothing(legacy):
    path = legacy([])
    before = file_hash(path)
    rc, out = py("import app as A; c = A.app.test_client(); r = c.get('/api/student/achievements'); print('R=', r.status_code, r.get_json())", path)
    assert rc == 0 and "R= 503" in out and 'schema_upgrade_required' in out
    assert file_hash(path) == before


# ---------------------------------------------------------------- A9 clean upgrade
def test_a9_clean_legacy_schema_upgrades_explicitly_preserves_rows_and_is_idempotent(legacy):
    path = legacy([])
    before_rows = rows(path); assert len(before_rows) == 2
    rc, out = cli(path, 'status')
    assert rc == 3 and 'user_achievements' in out and 'BLOCKER' not in out
    rc, out = cli(path, 'upgrade', '--yes')
    assert rc == 0, out
    assert rows(path) == before_rows                         # ids, timestamps, progress identical
    assert status(path)['up_to_date'] is True
    rc, out = cli(path, 'upgrade', '--yes')
    assert rc == 0 and 'Nothing to upgrade' in out
    rc, out = cli(path, 'audit-achievements')
    a = json_block(out)
    assert rc == 0 and a['unique_pair_effective'] is True and a['duplicate_pairs'] == 0 and a['total_rows'] == 2
    assert a['historical_awards_of_unsupported_definitions'] == {'rows': 1, 'pairs': 1}   # unsupported historical award survives
    c = sqlite3.connect(path)
    try:
        with pytest.raises(sqlite3.IntegrityError):
            c.execute('INSERT INTO user_achievements (user_id, achievement_id) VALUES (502, (SELECT achievement_id FROM user_achievements WHERE user_id=502))')
    finally:
        c.close()


# ---------------------------------------------------------------- A9 / A11 duplicate-bearing
def test_a9_duplicate_bearing_schema_fails_safely_with_no_cleanup(legacy):
    path = legacy([], dups=True)
    before_rows = rows(path); assert len(before_rows) == 7
    rc, out = cli(path, 'status')
    assert rc == 3 and 'BLOCKER' in out and '2 duplicate' in out        # (501, First Steps) x3 and (502, Python Novice) x2
    rc, out = cli(path, 'upgrade', '--yes')
    assert rc != 0 and ('BLOCKED' in out or 'BLOCKER' in out)
    assert rows(path) == before_rows                                    # not one row deleted, merged or rewritten
    st = status(path)
    assert st['up_to_date'] is False and st['missing_constraints'] == {'user_achievements': ['UNIQUE(user_id, achievement_id)']}
    # the app keeps answering "upgrade required" rather than serving over an unprotected table
    rc, out = py("import app as A; r = A.app.test_client().get('/api/student/achievements'); print('R=', r.status_code)", path)
    assert 'R= 503' in out


def test_a11_audit_is_aggregate_by_default_read_only_and_reports_no_xp_inference(legacy, tmp_path):
    path = legacy([], dups=True)
    before = file_hash(path)
    rc, out = cli(path, 'audit-achievements')
    a = json_block(out)
    assert rc == 4
    assert (a['total_rows'], a['distinct_pairs'], a['duplicate_pairs'], a['excess_rows'], a['users_with_duplicates']) == (7, 4, 2, 3, 2)
    assert a['copies_histogram'] == {'2': 1, '3': 1}
    assert a['pairs_with_different_earned_at'] == 1 and a['pairs_with_different_progress'] == 1
    assert a['rows_with_null_earned_at'] == 1 and a['pairs_where_every_row_has_null_earned_at'] == 0
    assert a['historical_awards_of_unsupported_definitions'] == {'rows': 1, 'pairs': 1}
    assert a['design_preview'] == {'canonical_entitlements_would_be': 4, 'original_rows_retained_unchanged': 7, 'pairs_needing_a_tie_break_on_id': 1}
    assert '"user_id"' not in out and '501' not in out and '502' not in out    # no identifiers in the default report
    assert not any('xp' in k and 'level' not in k for k in a)                  # no XP figures inferred
    assert file_hash(path) == before                                            # read-only: byte-identical
    detail = str(tmp_path / 'detail.json')
    rc, out = cli(path, 'audit-achievements', '--detail', detail)
    assert os.path.exists(detail), (rc, out[-800:])
    d = json.load(open(detail))
    assert len(d) == 2 and {x['user_id'] for x in d} == {501, 502} and sum(len(x['rows']) for x in d) == 5
    assert file_hash(path) == before


def test_a11_historical_duplicates_are_served_as_one_award_with_the_earliest_recorded_time(legacy):
    path = legacy([], dups=True)
    before_rows = rows(path)
    code = """
import app as A, json
from flask_jwt_extended import create_access_token
A.SCHEMA_STATE['up_to_date'] = True          # the 503 gate is tested elsewhere; this checks the serving logic over historical duplicates
with A.app.app_context():
    h = {'Authorization': 'Bearer ' + create_access_token(identity='501')}
c = A.app.test_client()
r = c.get('/api/student/achievements', headers=h)
js = r.get_json()
print('OUT=' + json.dumps({'status': r.status_code, 'earned': {a['name']: [a['earned_at'], a['just_earned']] for a in js if a['is_earned']}}))
"""
    rc, out = py(code, path)
    res = json.loads([l for l in out.splitlines() if l.startswith('OUT=')][0][4:])
    assert res['status'] == 200
    assert res['earned']['First Steps'] == ['2026-10-22T15:59:59Z', False]           # earliest RECORDED time of 3 rows (one NULL)
    assert rows(path) == before_rows                                                  # still all 7 rows, untouched
    c = sqlite3.connect(path)
    try:
        assert c.execute('SELECT xp, level FROM users WHERE id=501').fetchone() == (777, 3)   # no inferred XP repair
    finally:
        c.close()
