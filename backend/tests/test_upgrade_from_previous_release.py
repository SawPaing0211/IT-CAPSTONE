# Previous release (git HEAD) -> current code. Starting the app must not change the schema; the explicit
# upgrade must bring the old database fully up to date (covers every column/table added since, e.g. result_details).
import os, sys, subprocess, tempfile, sqlite3, shutil
import pytest

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.dirname(BACKEND)


def _clean_env(extra):
    e = {k: v for k, v in os.environ.items() if not k.startswith('FORGE_') and k != 'DATABASE_URL'}
    e.update(extra)
    return e


def _schema(path):
    c = sqlite3.connect(path)
    out = {t: [r[1] for r in c.execute(f'pragma table_info({t})')]
           for (t,) in c.execute("select name from sqlite_master where type='table' order by 1")}
    c.close()
    return out


@pytest.fixture(scope='module')
def old_db():
    if not shutil.which('git') or not os.path.isdir(os.path.join(REPO, '.git')):
        pytest.skip('needs the git repository (previous release = HEAD)')
    work = tempfile.mkdtemp()
    tar = subprocess.run(['git', 'archive', 'HEAD', 'backend'], cwd=REPO, capture_output=True)
    if tar.returncode:
        pytest.skip('git archive failed')
    subprocess.run(['tar', '-x', '-C', work], input=tar.stdout, check=True)
    db = os.path.join(work, 'upgrade_test_old.db')
    r = subprocess.run([sys.executable, '-c', 'import app'], cwd=os.path.join(work, 'backend'),
                       env=_clean_env({'DATABASE_URL': 'sqlite:///' + db}), capture_output=True, text=True, timeout=120)
    if not os.path.exists(db):
        pytest.skip('previous release could not create its schema here: ' + r.stderr[-200:])
    return db


def test_start_is_read_only_and_explicit_upgrade_completes(old_db):
    env = _clean_env({'DATABASE_URL': 'sqlite:///' + old_db})
    before = _schema(old_db)
    # starting the current app and serving requests changes nothing
    r = subprocess.run([sys.executable, '-c',
                        "import app; c=app.app.test_client(); print(c.get('/api/health').get_json()); print(c.get('/api/problems').status_code)"],
                       cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr[-400:]
    assert _schema(old_db) == before, 'starting the application changed the schema'
    st = subprocess.run([sys.executable, 'manage_schema.py', 'status'], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
    needs = st.returncode == 3
    if needs:
        assert r.stdout.strip().splitlines()[-1] == '503', 'an outdated schema must answer 503, not guess'
    up = subprocess.run([sys.executable, 'manage_schema.py', 'upgrade', '--yes'], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=150)
    assert up.returncode == 0, up.stdout[-500:] + up.stderr[-500:]
    st2 = subprocess.run([sys.executable, 'manage_schema.py', 'status'], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=120)
    assert st2.returncode == 0, st2.stdout[-400:]
    after = _schema(old_db)
    assert 'result_details' in after['submissions'] and 'submission_slots' in after
    for t, cols in before.items():
        assert set(cols) <= set(after[t]), f'upgrade removed columns from {t}'
