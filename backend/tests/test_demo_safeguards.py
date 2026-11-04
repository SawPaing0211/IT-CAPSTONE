# The simulated runner must not be switchable by accident: not by a name, not by one environment variable,
# not on a remote or real database, not in production, not in the container image.
import os, sys, subprocess, tempfile, sqlite3
import pytest

BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = os.path.dirname(BACKEND)
TMP = tempfile.mkdtemp()


def run(code, env, cwd=BACKEND):
    e = {k: v for k, v in os.environ.items() if not k.startswith('FORGE_') and k != 'DATABASE_URL'}
    e.update(env)
    return subprocess.run([sys.executable, '-c', code], cwd=cwd, env=e, capture_output=True, text=True, timeout=120)


def sqlite_url(name):
    return 'sqlite:///' + os.path.join(TMP, name)


def test_demo_refuses_a_remote_database_even_when_the_name_says_test():
    r = run('import app', {'FORGE_DEMO': '1', 'DATABASE_URL': 'mysql+pymysql://u:p@db.example.org:3306/forge_test'})
    assert r.returncode != 0 and 'not this machine' in (r.stdout + r.stderr)
    r = run('import app', {'FORGE_DEMO': '1', 'DATABASE_URL': 'mysql+pymysql://u:p@mysql:3306/forge_demo'})   # the compose service name
    assert r.returncode != 0 and 'not this machine' in (r.stdout + r.stderr)


def test_demo_refuses_a_database_whose_name_does_not_say_demo_or_test():
    r = run('import app', {'FORGE_DEMO': '1', 'DATABASE_URL': sqlite_url('forge_dev.db')})
    assert r.returncode != 0 and "does not contain 'demo' or 'test'" in (r.stdout + r.stderr)


def test_runner_flag_alone_changes_nothing():
    # a deployment that only has FORGE_DEMO_RUNNER=1 in its environment still grades with the real sandbox
    r = run("import app; print(app.EXECUTION_MODE); print(app.app.test_client().get('/api/health').get_json()['execution_mode'])",
            {'FORGE_DEMO_RUNNER': '1', 'DATABASE_URL': sqlite_url('flag_only_demo.db')})
    assert r.returncode == 0, r.stderr[-300:]
    assert r.stdout.strip().splitlines()[-2:] == ['docker-sandbox', 'docker-sandbox']


def test_even_with_both_flags_the_app_does_not_switch_itself():
    r = run('import app; print(app.EXECUTION_MODE)', {'FORGE_DEMO': '1', 'FORGE_DEMO_RUNNER': '1', 'DATABASE_URL': sqlite_url('both_flags_demo.db')})
    assert r.returncode == 0 and r.stdout.strip().splitlines()[-1] == 'docker-sandbox'


def test_install_needs_both_flags_and_refuses_production():
    code = 'import app, demo_runner; demo_runner.install(app)'
    assert run(code, {'FORGE_DEMO_RUNNER': '1', 'DATABASE_URL': sqlite_url('i1_demo.db')}).returncode != 0
    assert run(code, {'FORGE_DEMO': '1', 'DATABASE_URL': sqlite_url('i2_demo.db')}).returncode != 0
    r = run(code, {'FORGE_ENV': 'production', 'SECRET_KEY': 'k' * 40, 'JWT_SECRET_KEY': 'j' * 40, 'FORGE_DEMO': '1',
                   'FORGE_DEMO_RUNNER': '1', 'DATABASE_URL': sqlite_url('i3_demo.db')})
    assert r.returncode != 0 and 'production' in (r.stdout + r.stderr).lower()


def test_install_refuses_a_database_with_users_but_no_synthetic_marker_and_accepts_marked_or_empty():
    base = {'FORGE_DEMO': '1', 'FORGE_DEMO_RUNNER': '1', 'FORGE_AUTO_SCHEMA': '1'}
    code = 'import app, demo_runner; demo_runner.install(app); print(app.EXECUTION_MODE)'
    empty = run(code, dict(base, DATABASE_URL=sqlite_url('empty_demo.db')))
    assert empty.returncode == 0 and empty.stdout.strip().splitlines()[-1] == 'demo-stub'
    # a "real" database that merely has test in its name and holds an account
    url = sqlite_url('looks_real_test.db')
    seed = ("import app; from werkzeug.security import generate_password_hash as g\n"
            "with app.app.app_context():\n"
            "    app.db.session.add(app.User(username='real1', email='real1@example.com', role='student', password_hash=g('x'))); app.db.session.commit()")
    assert run(seed, dict(base, DATABASE_URL=url)).returncode == 0
    r = run(code, dict(base, DATABASE_URL=url))
    assert r.returncode != 0 and 'not marked as synthetic' in (r.stdout + r.stderr)
    # the marker seed_demo.py writes makes it acceptable
    mark = ("import app, demo_runner\nwith app.app.app_context():\n"
            "    app.db.session.add(app.SystemConfig(key=demo_runner.DEMO_MARKER_KEY, value=demo_runner.DEMO_MARKER_VALUE)); app.db.session.commit()")
    assert run(mark, dict(base, DATABASE_URL=url)).returncode == 0
    ok = run(code, dict(base, DATABASE_URL=url))
    assert ok.returncode == 0 and ok.stdout.strip().splitlines()[-1] == 'demo-stub'


def test_production_compose_and_image_carry_no_demo_switches():
    # docker-compose.yml was removed with the old deployment files; check it only if it comes back
    compose_path = os.path.join(REPO, 'docker-compose.yml')
    if os.path.exists(compose_path):
        compose = open(compose_path, encoding='utf-8').read()
        assert 'FORGE_ENV: production' in compose
        assert 'FORGE_DEMO' not in compose
    ignore = open(os.path.join(BACKEND, '.dockerignore'), encoding='utf-8').read().split()
    for name in ('demo_runner.py', 'seed_demo.py', '.env', 'uploads/'):
        assert name in ignore, f'{name} must stay out of the image'
    # the web app never imports the stub
    src = open(os.path.join(BACKEND, 'app.py'), encoding='utf-8').read()
    assert 'import demo_runner' not in src and 'from demo_runner' not in src


def test_production_refuses_the_auto_schema_switch():
    prod = {'FORGE_ENV': 'production', 'SECRET_KEY': 'k' * 40, 'JWT_SECRET_KEY': 'j' * 40, 'DATABASE_URL': sqlite_url('auto_schema_prod.db')}
    r = run('import app', dict(prod, FORGE_AUTO_SCHEMA='1'))
    assert r.returncode != 0 and 'FORGE_AUTO_SCHEMA' in (r.stdout + r.stderr)
    assert run('import app', prod).returncode == 0        # without it, production starts (read-only schema check)
