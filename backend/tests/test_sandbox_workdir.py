# Tests for the shared sandbox work-dir helper (no Docker needed).
import os, sys, stat, time
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from routes import sandbox as sb


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    monkeypatch.setattr(sb, '_swept', False)


def test_uses_shared_dir_and_cleans_up(tmp_path, monkeypatch):
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', str(tmp_path / 'shared'))
    with sb.sandbox_workdir() as d:
        assert os.path.dirname(d) == str(tmp_path / 'shared')
        assert os.path.basename(d).startswith('forge-sbx-')
        assert stat.S_IMODE(os.stat(d).st_mode) == 0o755
        open(os.path.join(d, 'x.py'), 'w').write('print(1)')
        sb.make_workdir_readable(d)
        assert stat.S_IMODE(os.stat(os.path.join(d, 'x.py')).st_mode) == 0o644
    assert not os.path.exists(d)


def test_cleanup_on_exception(tmp_path, monkeypatch):
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', str(tmp_path))
    with pytest.raises(ValueError):
        with sb.sandbox_workdir() as d:
            raise ValueError('boom')
    assert not os.path.exists(d)


def test_fallback_to_system_tmp(monkeypatch):
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', '')
    with sb.sandbox_workdir() as d:
        assert os.path.isdir(d)
    assert not os.path.exists(d)


def test_unwritable_base_raises(tmp_path, monkeypatch):
    f = tmp_path / 'afile'
    f.write_text('x')
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', str(f / 'sub'))  # parent is a file
    with pytest.raises(sb.SandboxSetupError):
        with sb.sandbox_workdir():
            pass


def test_stale_sweep_only_old_prefixed(tmp_path, monkeypatch):
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', str(tmp_path))
    old = tmp_path / 'forge-sbx-old'; old.mkdir()
    fresh = tmp_path / 'forge-sbx-new'; fresh.mkdir()
    other = tmp_path / 'unrelated'; other.mkdir()
    t = time.time() - 7200
    os.utime(old, (t, t)); os.utime(other, (t, t))
    with sb.sandbox_workdir():
        pass
    assert not old.exists()
    assert fresh.exists() and other.exists()


def test_decorator_converts_setup_error(monkeypatch):
    @sb.handles_setup_errors
    def f():
        raise sb.SandboxSetupError('nope')
    r = f()
    assert r['returncode'] == -1 and 'error' in r and r['timed_out'] is False
    # other exceptions are not swallowed
    @sb.handles_setup_errors
    def g():
        raise KeyError('x')
    with pytest.raises(KeyError):
        g()


def test_run_returns_error_dict_when_setup_fails(tmp_path, monkeypatch):
    f = tmp_path / 'afile'; f.write_text('x')
    monkeypatch.setattr(sb, 'SANDBOX_TMP_DIR', str(f / 'sub'))
    monkeypatch.setattr(sb, '_get_docker_client', lambda: object())
    r = sb._run_in_docker('print(1)', 'python')
    assert r['returncode'] == -1 and r['error']


def test_source_is_written_with_plain_newlines(tmp_path):
    # editor sends \r\n; it must not reach the compiler/python as \r\r\n
    path = sb._write_source(str(tmp_path), 'n = int(input())\r\nprint(n)\r\n', 'python')
    data = open(path, 'rb').read()
    assert b'\r' not in data
    assert data == b'n = int(input())\nprint(n)\n'
