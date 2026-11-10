# runs student code in a docker sandbox. also detects compile errors (javac/csc)
# so we can show a clean message instead of just an empty output.

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import docker
import tempfile
import shutil
import functools
import contextlib
import os
import re
import time
import threading
import logging

logger = logging.getLogger(__name__)

sandbox_bp = Blueprint('sandbox', __name__)

# ─── Docker image names ────────────────────────────────────────────────────
DOCKER_IMAGES = {
    'python': 'forge-sandbox-python:latest',
    'java':   'forge-sandbox-java:latest',
    'csharp': 'forge-sandbox-csharp:latest',
}

FILE_EXTENSIONS = {
    'python': 'py',
    'java':   'java',
    'csharp': 'cs',
}

LIMITS = {
    'timeout_seconds': 10,
    'memory_bytes':    128 * 1024 * 1024,
    'cpu_period':      100_000,
    'cpu_quota':       50_000,
    'pids_limit':      64,
    'output_bytes':    65_536,
    'code_max_chars':  10_000,
}

LANGUAGE_TIMEOUTS = {
    'python': 10,
    'java':   15,
    'csharp': 60,
}

MEM_LIMITS = {
    'python': 128 * 1024 * 1024,
    'java':   256 * 1024 * 1024,
    'csharp': 512 * 1024 * 1024,
}

CAP_DROP = {
    'python': ['ALL'],
    'java':   ['ALL'],
    'csharp': ['ALL'],
}

# Docker's default seccomp profile is used. If a runtime (.NET/JVM on an old
# kernel or Docker build) fails with permission/syscall errors, set
# SANDBOX_SECCOMP_UNCONFINED=true in backend/.env as a temporary escape hatch.
_SECCOMP_UNCONFINED = os.environ.get('SANDBOX_SECCOMP_UNCONFINED', 'false').strip().lower() == 'true'
_BASE_SECURITY_OPTS = ['no-new-privileges:true'] + (['seccomp=unconfined'] if _SECCOMP_UNCONFINED else [])

SECURITY_OPTS = {lang: list(_BASE_SECURITY_OPTS) for lang in ('python', 'java', 'csharp')}

# ─── Compiler line-number offsets ─────────────────────────────────────────
# How many lines does each language's wrapper inject BEFORE the student code?
#
# Java:  Solution.java and Main.java are SEPARATE files.
#        javac errors for Solution.java already reference the student's
#        own line numbers.  Offset = 0.
#
# C#:    Solution.cs (student code) and Program.cs (wrapper) are SEPARATE
#        files too, so csc already reports the student's own line numbers.
#        Offset = 0 (checked against a real build: undefined name on
#        student line 5 is reported as Solution.cs(5,17)).
#
# Python: No wrapper; offset = 0.
COMPILE_LINE_OFFSETS = {
    'java':   0,
    'csharp': 0,
    'python': 0,
}


# ─── Concurrency cap ───────────────────────────────────────────────────────
# Nothing upstream of this limits how many Docker containers can be running
# at once -- every Run/Submit/Test called _run_in_docker directly, so e.g.
# 20 students clicking Submit in the same few seconds spawned 20 containers
# at once (each C# run alone can reserve up to 512MB RAM; see MEM_LIMITS
# above) with no ceiling, on whatever single machine is hosting this.
# SANDBOX_MAX_CONCURRENT bounds that: only this many containers run at a
# time; anyone past the limit waits in line instead of adding load. 6 is a
# conservative default for a typical student laptop (4-8 CPU cores) --
# raise it on a bigger host via the env var. A wait longer than
# SANDBOX_QUEUE_TIMEOUT_SECONDS gives up with a clear "runner is busy"
# infra error instead of hanging the request (and, for a graded Submit,
# the student's one attempt is NOT consumed -- see ExecutionInfrastructureError
# handling in app.py's create_submission).
SANDBOX_MAX_CONCURRENT        = int(os.environ.get('SANDBOX_MAX_CONCURRENT', '6'))
SANDBOX_QUEUE_TIMEOUT_SECONDS = int(os.environ.get('SANDBOX_QUEUE_TIMEOUT_SECONDS', '90'))
_sandbox_concurrency = threading.Semaphore(SANDBOX_MAX_CONCURRENT)


# ─── Rate limiting ─────────────────────────────────────────────────────────
_rate_store: dict[str, list[float]] = {}
_rate_lock = threading.Lock()


def _check_rate_limit(user_id: str) -> bool:
    now = time.time()
    with _rate_lock:
        window = [t for t in _rate_store.get(user_id, []) if now - t < 3600]
        if len(window) >= 200:
            return False
        window.append(now)
        _rate_store[user_id] = window
    return True


# ─── Lazy Docker client ────────────────────────────────────────────────────
_docker_client = None
_docker_lock   = threading.Lock()


def _get_docker_client():
    global _docker_client
    if _docker_client is None:
        with _docker_lock:
            if _docker_client is None:
                try:
                    _docker_client = docker.from_env(timeout=10)
                    _docker_client.ping()
                    logger.info("🐳 Docker client connected")
                except Exception as e:
                    logger.error(f"🐳 Docker connection failed: {e}")
                    raise RuntimeError(
                        "Docker is not running. "
                        "Please start Docker Desktop and try again."
                    )
    return _docker_client


# =============================================================================
#  compile-error detection and parsing, app.py imports these
# =============================================================================

def _parse_java_compile_error(stderr: str) -> str:
    """
    Parse raw javac stderr into a clean, student-friendly error string.

    Example javac output:
        Solution.java:5: error: cannot find symbol
                Scanner sc = new Scanner(Systemin);
                                         ^
          symbol:   variable Systemin
          location: class Solution

    Because Solution.java is the student's own file (no wrapper lines
    injected into it), the line numbers are already correct.
    """
    errors = []
    warnings = []
    seen   = set()

    pattern = re.compile(
        r'(\w[\w.]*\.java):(\d+):\s*(error|warning):\s*(.+)'
    )
    for match in pattern.finditer(stderr):
        line_no = int(match.group(2))
        kind    = match.group(3)
        msg     = match.group(4).strip()

        if msg.startswith('note:'):
            continue

        friendly = f"Line {line_no}: {msg}"
        if friendly not in seen:
            seen.add(friendly)
            (errors if kind == 'error' else warnings).append(friendly)

    # warnings only matter when there is no real error to show
    if errors or warnings:
        return '\n'.join(errors or warnings)

    # Fallback: strip /tmp paths and return cleaned text
    cleaned = re.sub(r'/tmp/\S+', '', stderr)
    cleaned = re.sub(r'\[.*?\]', '', cleaned)
    lines   = [l.strip() for l in cleaned.splitlines() if l.strip()]
    return '\n'.join(lines[:10]) or stderr.strip()


def _parse_csharp_compile_error(stderr: str, offset: int = 7) -> str:
    """
    Parse dotnet/csc stderr into a clean, student-friendly error string.
    Subtracts `offset` from raw line numbers to get student-visible lines.
    """
    errors = []
    warnings = []
    seen   = set()

    pattern = re.compile(
        r'(?:Program|Solution)\.cs\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+?)(?:\s*\[.*?\])?$',
        re.MULTILINE
    )
    for match in pattern.finditer(stderr):
        raw_line = int(match.group(1))
        col      = int(match.group(2))
        kind     = match.group(3)
        code     = match.group(4)
        msg      = match.group(5).strip()
        student_line = max(1, raw_line - offset)
        friendly = f"Line {student_line}, Col {col}: {msg} ({code})"
        if friendly not in seen:
            seen.add(friendly)
            (errors if kind == 'error' else warnings).append(friendly)

    shown = errors or warnings
    return '\n'.join(shown) if shown else stderr.strip()


def is_compile_error(result: dict, language: str) -> bool:
    """
    Return True if the sandbox result represents a compilation failure.

    Primary detection: run_java.sh / run_csharp.sh write __COMPILE_ERROR__
    as the first line of stderr when the compiler exits non-zero.

    Fallback heuristic: rc != 0, empty stdout, and compiler-error patterns
    in stderr — catches older shell scripts that don't emit the sentinel.
    """
    stderr = result.get('stderr', '')
    stdout = result.get('stdout', '')
    rc     = result.get('returncode', 0)

    if '__COMPILE_ERROR__' in stderr:
        return True

    if rc != 0 and not stdout.strip():
        if language == 'java'   and re.search(r'\.java:\d+: error:', stderr):
            return True
        if language == 'csharp' and re.search(r'\.cs\(\d+,\d+\):\s*error', stderr):
            return True

    return False


def get_compile_error_message(result: dict, language: str) -> str:
    """
    Extract and clean the compile error message from a sandbox result dict.
    Strips the __COMPILE_ERROR__ sentinel before parsing.
    """
    stderr = result.get('stderr', '')
    stderr = stderr.replace('__COMPILE_ERROR__\n', '').replace('__COMPILE_ERROR__', '')
    if language == 'csharp':
        # run_csharp.sh prints the compiler errors on stdout (dotnet build 2>&1),
        # only the sentinel goes to stderr
        stderr = (stderr + '\n' + result.get('stdout', '')).strip()

    if language == 'java':
        return _parse_java_compile_error(stderr)
    if language == 'csharp':
        return _parse_csharp_compile_error(stderr, COMPILE_LINE_OFFSETS['csharp'])

    return stderr.strip()


# =============================================================================
#  Wrapper generators  (unchanged from original)
# =============================================================================

def _generate_java_wrapper() -> str:
    return '''\
public class Main {
    public static void main(String[] args) throws Exception {
        Solution.main(args);
    }
}
'''


def _generate_csharp_wrapper() -> str:
    return '''\
using System;
using System.IO;
public class Program {
    public static void Main(string[] args) {
        string inputFile = "/tmp/sandbox/input.txt";
        if (File.Exists(inputFile)) {
            string input = File.ReadAllText(inputFile).Trim();
            Console.SetIn(new StringReader(input));
        }
        Solution.Run();
    }
}
'''


# =============================================================================
#  Source-file writer  (unchanged from original)
# =============================================================================

def _rename_entry_class(code: str, new_name: str, main_pattern: str) -> str:
    """
    Rename whichever top-level class is the program's entry point to `new_name`,
    regardless of what the student called it or whether they marked it `public`.

    The sandbox wrapper (Main.java / Program.cs) calls a hardcoded class name
    (`Solution`). The old implementation only renamed a class if its name was
    an exact match against a short hardcoded list AND it was declared with the
    literal text "public class <name>". That missed two real cases: a class
    declared without `public` (valid, idiomatic Java/C#), and a class whose
    name simply wasn't on the list. Either one left the student's class
    unrenamed, causing it to collide with (or go unreferenced by) the
    wrapper's own `Solution` call -- a compile failure scored as a wrong
    answer rather than recognized as a grading-infrastructure issue.
    """
    class_re = re.compile(r'(?:public\s+)?class\s+(\w+)')
    matches = list(class_re.finditer(code))
    if not matches:
        return code  # nothing we recognize as a class declaration; leave as-is

    target = matches[0]
    if len(matches) > 1:
        # multiple top-level classes: rename whichever one actually contains
        # the entry point, not just the first one in the file
        for i, m in enumerate(matches):
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(code)
            if re.search(main_pattern, code[start:end]):
                target = m
                break

    old_name = target.group(1)
    if old_name == new_name:
        return code

    before = code[:target.start()]
    decl = target.group(0).replace(old_name, new_name, 1)
    after = code[target.end():]
    code = before + decl + after
    # also rename other uses of the old class name as a standalone identifier
    # (e.g. constructors, static self-references) so the file stays consistent
    code = re.sub(r'\b' + re.escape(old_name) + r'\b', new_name, code)
    return code


def _write_source(tmpdir: str, code: str, language: str) -> str:
    if language == 'java':
        filename = 'Solution.java'
        code = _rename_entry_class(code, 'Solution', main_pattern=r'\bvoid\s+main\s*\(')
    elif language == 'csharp':
        filename = 'Solution.cs'
        code = _rename_entry_class(code, 'Solution', main_pattern=r'\bvoid\s+Main\s*\(')
        # Normalize whatever Main method the student wrote (public/private,
        # with/without args) into the Run() the wrapper calls.
        code = re.sub(
            r'(?:public\s+|private\s+|protected\s+|internal\s+|static\s+|async\s+)*'
            r'(?:void|int|Task(?:<int>)?)\s+Main\s*\([^)]*\)',
            'public static void Run()',
            code,
            count=1,
        )
    else:
        filename = 'solution.py'

    # The editor sends Windows line endings. A text-mode write on Windows
    # turns each \r\n into \r\r\n, which compilers and Python read as two
    # line breaks, so every error line number came out doubled. Store plain
    # \n and write the bytes as-is.
    code = code.replace('\r\n', '\n').replace('\r', '\n')
    filepath = os.path.join(tmpdir, filename)
    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(code)
    return filepath


# ─── Sandbox working directory ─────────────────────────────────────────────
# The backend talks to the HOST's Docker daemon (via /var/run/docker.sock),
# so a bind-mount source path is resolved on the host, not inside the backend
# container. A plain tempfile dir therefore shows up empty in the sandbox.
# Fix: SANDBOX_TMP_DIR points at a directory that is bind-mounted at the SAME
# absolute path on the host and in the backend container (see docker-compose.yml).
# When it is unset (local dev, backend running directly on the host) we fall
# back to the system temp dir, which is fine in that setup.
SANDBOX_TMP_DIR     = os.environ.get('SANDBOX_TMP_DIR', '').strip()
_WORKDIR_PREFIX     = 'forge-sbx-'
_STALE_AFTER_SECS   = 3600   # leftovers from a crashed worker older than this get swept
_sweep_lock         = threading.Lock()
_swept              = False


class SandboxSetupError(RuntimeError):
    """The sandbox work dir could not be prepared (misconfigured or unwritable)."""


def _sweep_stale_workdirs(base: str) -> None:
    """Remove forge-sbx-* dirs left behind by a crashed/killed worker (once per process)."""
    global _swept
    with _sweep_lock:
        if _swept:
            return
        _swept = True
    cutoff = time.time() - _STALE_AFTER_SECS
    try:
        for name in os.listdir(base):
            if not name.startswith(_WORKDIR_PREFIX):
                continue
            path = os.path.join(base, name)
            try:
                if os.path.isdir(path) and not os.path.islink(path) and os.path.getmtime(path) < cutoff:
                    shutil.rmtree(path, ignore_errors=True)
                    logger.info('Swept stale sandbox dir %s', path)
            except OSError:
                continue
    except OSError as e:
        logger.warning('Could not sweep sandbox tmp dir %s: %s', base, e)


def _prepare_workdir_base() -> str:
    """Return the directory sandbox work dirs are created in, creating it if needed."""
    if not SANDBOX_TMP_DIR:
        if os.path.exists('/.dockerenv'):
            logger.warning(
                'SANDBOX_TMP_DIR is not set but the backend is running in a container: '
                'sandbox containers will see an empty /tmp/sandbox. Mount a shared '
                'directory at the same path on host and container and set SANDBOX_TMP_DIR.'
            )
        return tempfile.gettempdir()

    base = os.path.abspath(SANDBOX_TMP_DIR)
    try:
        os.makedirs(base, exist_ok=True)
    except OSError as e:
        raise SandboxSetupError(f'Cannot create SANDBOX_TMP_DIR {base}: {e}') from e
    if not os.access(base, os.W_OK | os.X_OK):
        raise SandboxSetupError(f'SANDBOX_TMP_DIR {base} is not writable by the backend')
    _sweep_stale_workdirs(base)
    return base


@contextlib.contextmanager
def sandbox_workdir():
    """
    Yield a fresh, world-readable directory for one sandbox run and always
    remove it afterwards. mkdtemp() creates it 0700, but the sandbox images run
    as an unprivileged user, so it is opened up to 0755 (the mount is read-only
    inside the container, so this does not let the code modify it).
    """
    base = _prepare_workdir_base()
    try:
        path = tempfile.mkdtemp(prefix=_WORKDIR_PREFIX, dir=base)
        os.chmod(path, 0o755)
    except OSError as e:
        raise SandboxSetupError(f'Cannot create sandbox dir in {base}: {e}') from e
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)
        if os.path.exists(path):
            logger.warning('Sandbox dir %s could not be fully removed', path)


def make_workdir_readable(path: str) -> None:
    """Make every file in the work dir readable by the sandbox's non-root user."""
    for name in os.listdir(path):
        os.chmod(os.path.join(path, name), 0o644)


def handles_setup_errors(fn):
    """
    Turn a SandboxSetupError into the normal error-result dict, so callers
    (grading, /api/sandbox/run) never see an exception for an infra problem.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        started = time.time()
        try:
            return fn(*args, **kwargs)
        except SandboxSetupError as e:
            logger.error('Sandbox setup failed: %s', e)
            return {
                'stdout': '', 'stderr': '',
                'error': '💥 Code runner is temporarily unavailable. Please tell your instructor.',
                'returncode': -1,
                'elapsed': int((time.time() - started) * 1000),
                'timed_out': False,
            }
    return wrapper


# =============================================================================
#  Core execution function  (unchanged from original except compile-error check
#  is now handled at the call sites in app.py and run_sandbox below)
# =============================================================================

@handles_setup_errors
def _run_in_docker(code: str, language: str) -> dict:
    """
    Spin up a fresh container, inject the code, collect output, destroy it.
    Returns dict: { stdout, stderr, returncode, elapsed, timed_out }

    Callers should check is_compile_error(result, language) before treating
    stdout as program output.
    """
    started = time.time()
    if not _sandbox_concurrency.acquire(timeout=SANDBOX_QUEUE_TIMEOUT_SECONDS):
        raise SandboxSetupError(
            f'Code runner is at capacity (max {SANDBOX_MAX_CONCURRENT} concurrent runs); '
            f'this request waited {SANDBOX_QUEUE_TIMEOUT_SECONDS}s and gave up.'
        )
    try:
        return _run_in_docker_locked(code, language, started)
    finally:
        _sandbox_concurrency.release()


def _run_in_docker_locked(code: str, language: str, started: float) -> dict:
    """The actual container run, holding one of SANDBOX_MAX_CONCURRENT slots.
    Split out of _run_in_docker so that function's acquire/finally/release stays
    tiny and obviously correct no matter how this body grows."""
    client  = _get_docker_client()
    image   = DOCKER_IMAGES[language]

    with sandbox_workdir() as tmpdir:
        src_path = _write_source(tmpdir, code, language)
        filename = os.path.basename(src_path)

        if language == 'java':
            with open(os.path.join(tmpdir, 'Main.java'), 'w', encoding='utf-8') as f:
                f.write(_generate_java_wrapper())
        elif language == 'csharp':
            with open(os.path.join(tmpdir, 'Program.cs'), 'w', encoding='utf-8') as f:
                f.write(_generate_csharp_wrapper())

        make_workdir_readable(tmpdir)
        container_src = f'/tmp/sandbox/{filename}'

        try:
            container = client.containers.run(
                image=image,
                command=[container_src],
                volumes={tmpdir: {'bind': '/tmp/sandbox', 'mode': 'ro'}},
                tmpfs={
                    '/tmp':      'size=256m,mode=1777',
                    '/tmp/work': 'size=256m,mode=1777',
                },
                network_disabled=True,
                read_only=True,
                cap_drop=CAP_DROP[language],
                security_opt=SECURITY_OPTS[language],
                mem_limit=MEM_LIMITS[language],
                memswap_limit=MEM_LIMITS[language],
                cpu_period=LIMITS['cpu_period'],
                cpu_quota=LIMITS['cpu_quota'],
                pids_limit=LIMITS['pids_limit'],
                detach=True,
                remove=False,
                stdout=True,
                stderr=True,
                environment={
                    'PYTHONUNBUFFERED':                  '1',
                    'DOTNET_CLI_TELEMETRY_OPTOUT':       '1',
                    'JAVA_OPTS':                         '-XX:TieredStopAtLevel=1',
                    'HOME':                              '/dotnet-sentinel',
                    'DOTNET_CLI_HOME':                   '/dotnet-sentinel/.dotnet',
                    'NUGET_PACKAGES':                    '/dotnet-sentinel/.nuget/packages',
                    'NUGET_HTTP_CACHE_PATH':             '/tmp/work/.nuget-http-cache',
                    'NUGET_SCRATCH':                     '/tmp/work/.nuget-scratch',
                    'DOTNET_NOLOGO':                     '1',
                    'DOTNET_SKIP_FIRST_TIME_EXPERIENCE': '1',
                    'DOTNET_MULTILEVEL_LOOKUP':          '0',
                },
            )

            try:
                timeout    = LANGUAGE_TIMEOUTS.get(language, LIMITS['timeout_seconds'])
                result_obj = container.wait(timeout=timeout)
                timed_out  = False
                returncode = result_obj.get('StatusCode', -1)
            except Exception:
                try:
                    container.kill()
                except Exception:
                    pass
                timed_out  = True
                returncode = -1

            raw_stdout = b''
            raw_stderr = b''
            try:
                raw_stdout = container.logs(stdout=True,  stderr=False)
                raw_stderr = container.logs(stdout=False, stderr=True)
            except Exception:
                pass

            try:
                container.remove(force=True)
            except Exception:
                pass

            stdout = raw_stdout.decode('utf-8', errors='replace')
            stderr = raw_stderr.decode('utf-8', errors='replace')
            max_b  = LIMITS['output_bytes']

            if len(stdout) > max_b:
                stdout = stdout[:max_b] + f'\n\n⚠️ [Output truncated at {max_b} bytes]'
            if len(stderr) > max_b:
                stderr = stderr[:max_b] + f'\n\n⚠️ [Error output truncated at {max_b} bytes]'

            elapsed_ms = int((time.time() - started) * 1000)

            return {
                'stdout':       stdout,
                'stderr':       stderr,
                'returncode':   returncode,
                'elapsed':      elapsed_ms,
                'timed_out':    timed_out,
                'timeout_used': timeout,
            }

        except docker.errors.ImageNotFound:
            elapsed_ms = int((time.time() - started) * 1000)
            return {
                'stdout':     '',
                'stderr':     '',
                'error':      (
                    f'🐳 Docker image "{image}" not found.\n'
                    f'Please run build_images.bat to build the sandbox images.'
                ),
                'returncode': -1,
                'elapsed':    elapsed_ms,
                'timed_out':  False,
            }

        except RuntimeError as e:
            elapsed_ms = int((time.time() - started) * 1000)
            return {
                'stdout':     '',
                'stderr':     '',
                'error':      f'🐳 {str(e)}',
                'returncode': -1,
                'elapsed':    elapsed_ms,
                'timed_out':  False,
            }

        except Exception as e:
            elapsed_ms = int((time.time() - started) * 1000)
            logger.exception(f'Sandbox execution error: {e}')
            return {
                'stdout':     '',
                'stderr':     '',
                'error':      f'💥 Execution system error: {str(e)}',
                'returncode': -1,
                'elapsed':    elapsed_ms,
                'timed_out':  False,
            }


# =============================================================================
#  Flask endpoint
# =============================================================================

@sandbox_bp.route('/api/sandbox/run', methods=['POST'])
@jwt_required()
def run_sandbox():
    """
    POST /api/sandbox/run
    Body: { code: string, language: "python" | "java" | "csharp" }
    """
    user_id = str(get_jwt_identity())

    if not _check_rate_limit(user_id):
        return jsonify({
            'error': '⚠️ Slow down, hero! Max 200 sandbox casts per hour.',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 429

    data     = request.get_json(silent=True) or {}
    code     = data.get('code', '').strip()
    language = data.get('language', 'python').lower().strip()

    if language not in DOCKER_IMAGES:
        return jsonify({
            'error': f'🚫 Language "{language}" not supported. Use: python, java, csharp',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 400

    if not code:
        return jsonify({
            'error': '📜 Your scroll is empty! Write some code first.',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 400

    if len(code) > LIMITS['code_max_chars']:
        return jsonify({
            'error': f'📜 Scroll too long! Max {LIMITS["code_max_chars"]:,} characters.',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 400

    result = _run_in_docker(code, language)

    # if it didn't even compile, don't bother treating stdout as real output
    if is_compile_error(result, language):
        clean_msg = get_compile_error_message(result, language)
        return jsonify({
            'stdout':     '',
            'stderr':     clean_msg,
            'returncode': result.get('returncode', 1),
            'elapsed':    result.get('elapsed', 0),
            'error':      f'🔨 Compilation failed:\n{clean_msg}',
        }), 200

    # ── Timeout ────────────────────────────────────────────────────────────
    if result.get('timed_out'):
        timeout_used = result.get('timeout_used', LIMITS['timeout_seconds'])
        result['error'] = (
            f'⏱️ Time limit exceeded ({timeout_used}s). '
            f'Check for infinite loops.'
        )

    elif result.get('returncode', 0) != 0 and not result.get('error'):
        raw = result.get('stdout', '') + result.get('stderr', '')
        if raw.strip():
            cleaned = raw
            cleaned = re.sub(r'[^\s\[]*[/\\](?=Program\.cs|Main\.java|solution\.cs)', '', cleaned)
            cleaned = re.sub(r'\[/tmp/[^\]]*\]', '', cleaned)
            error_lines = []
            seen = set()

            # Python traceback
            py_lines = re.findall(r'line (\d+)', raw)
            py_err   = re.search(r'(\w+Error[^\n]*)', raw)
            if py_lines and py_err and 'File "/tmp/' in raw:
                result['stderr'] = f"Line {py_lines[-1]}: {py_err.group(1)}"
                result['stdout'] = ''
                result['error']  = f'💥 Process exited with code {result["returncode"]}'
                return jsonify({
                    'stdout':     '',
                    'stderr':     result['stderr'],
                    'returncode': result['returncode'],
                    'elapsed':    result.get('elapsed', 0),
                    'error':      result['error'],
                }), 200

            for line in cleaned.split('\n'):
                line = line.strip()
                m = re.search(
                    r'(?:Program|Solution)\.cs\((\d+),(\d+)\):\s*error\s+(\w+):\s*([^\[]+)',
                    line
                )
                if m:
                    msg = (f'Line {m.group(1)}, Col {m.group(2)}: '
                           f'{m.group(4).strip()} ({m.group(3)})')
                    if msg not in seen:
                        seen.add(msg)
                        error_lines.append(msg)
                    continue

                m2 = re.search(r'(?:Main|Solution)\.java:(\d+):\s*error:\s*(.+)', line)
                if m2:
                    error_msg = m2.group(2).strip()
                    if 'reached end of file' in error_msg or 'class, interface' in error_msg:
                        msg = 'unexpected end of file: check for missing braces or semicolons'
                    else:
                        msg = f'Line {m2.group(1)}: {error_msg}'
                    if msg not in seen:
                        seen.add(msg)
                        error_lines.append(msg)
                    continue

                m3 = re.search(r'line (\d+)', line)
                m4 = re.search(r'(\w+Error[^\n]*)', line)
                if m3 and m4:
                    msg = f'Line {m3.group(1)}: {m4.group(1)}'
                    if msg not in seen:
                        seen.add(msg)
                        error_lines.append(msg)

            result['stderr'] = '\n'.join(error_lines) if error_lines else cleaned.strip()
            result['stdout'] = ''
        result['error'] = f'💥 Process exited with code {result["returncode"]}'

    return jsonify({
        'stdout':     result.get('stdout', ''),
        'stderr':     result.get('stderr', ''),
        'returncode': result.get('returncode', -1),
        'elapsed':    result.get('elapsed', 0),
        'error':      result.get('error'),
    }), 200


# ─── Health check  (unchanged) ────────────────────────────────────────────
@sandbox_bp.route('/api/sandbox/health', methods=['GET'])
@jwt_required()
def sandbox_health():
    try:
        client = _get_docker_client()
        images_available = {}
        for lang, image_name in DOCKER_IMAGES.items():
            try:
                client.images.get(image_name)
                images_available[lang] = True
            except docker.errors.ImageNotFound:
                images_available[lang] = False

        all_ready = all(images_available.values())
        return jsonify({
            'docker_running': True,
            'images':         images_available,
            'all_ready':      all_ready,
            'limits': {
                'timeout_s':         LIMITS['timeout_seconds'],
                'memory_mb':         LIMITS['memory_bytes'] // (1024 * 1024),
                'max_runs_per_hour': 200,
            }
        }), 200

    except RuntimeError as e:
        return jsonify({
            'docker_running': False,
            'error':          str(e),
            'images':         {},
            'all_ready':      False,
        }), 503
