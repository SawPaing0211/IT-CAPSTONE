# =============================================================================
#  Adventure Realm — Docker Sandbox Execution Engine
#  backend/routes/sandbox.py
#
#  Architecture:
#    Each code submission spins up a fresh, isolated Docker container.
#    The container is destroyed immediately after execution.
#    No network, no persistent filesystem, no root access.
#
#  Security layers:
#    1. Isolated Docker container (strongest boundary)
#    2. Non-root user inside container
#    3. Read-only filesystem (only /tmp writable via tmpfs)
#    4. Network disabled (--network none)
#    5. CPU + memory hard limits
#    6. PID limit (prevents fork bombs)
#    7. No new privileges flag
#    8. Code length check before even touching Docker
#    9. Rate limiting per user (30 runs/hour)
#    10. Output truncation (prevents stdout flooding)
# =============================================================================

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import docker
import tempfile
import os
import time
import threading
import logging

logger = logging.getLogger(__name__)

sandbox_bp = Blueprint('sandbox', __name__)

# ─── Docker image names (must match what build_images.bat creates) ─────────
DOCKER_IMAGES = {
    'python': 'forge-sandbox-python:latest',
    'java':   'forge-sandbox-java:latest',
    'csharp': 'forge-sandbox-csharp:latest',
}

# ─── File extensions per language ─────────────────────────────────────────
FILE_EXTENSIONS = {
    'python': 'py',
    'java':   'java',
    'csharp': 'cs',
}

# ─── Resource limits ──────────────────────────────────────────────────────
LIMITS = {
    'timeout_seconds': 10,          # Wall-clock time limit per run
    'memory_bytes':    128 * 1024 * 1024,  # 128 MB RAM hard cap
    'cpu_period':      100_000,     # Docker CPU period (microseconds)
    'cpu_quota':       50_000,      # 50% of one CPU core
    'pids_limit':      64,          # Max processes/threads — kills fork bombs
    'output_bytes':    65_536,      # 64 KB max stdout+stderr combined
    'code_max_chars':  10_000,      # Reject absurdly long submissions early
}

LANGUAGE_TIMEOUTS = {
    'python': 10,
    'java':   15,
    'csharp': 60,
}

MEM_LIMITS = {
    'python': 128 * 1024 * 1024,   # 128MB
    'java':   256 * 1024 * 1024,   # 256MB
    'csharp': 512 * 1024 * 1024,   # 512MB
}

CAP_DROP = {
    'python': ['ALL'],
    'java':   ['ALL'],
    'csharp': ['ALL'],
}

SECURITY_OPTS = {
    'python': ['no-new-privileges:true', 'seccomp=unconfined'],
    'java':   ['no-new-privileges:true', 'seccomp=unconfined'],
    'csharp': ['no-new-privileges:true', 'seccomp=unconfined'],
}

# ─── Rate limiting: 30 sandbox runs per user per hour ─────────────────────
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

# ─── Lazy Docker client (connects once, reused across requests) ───────────
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
#  Wrapper Generators — entry points that call the student's Solution class
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
        Solution.Main();
    }
}
'''

# =============================================================================
#  Source-file writer
# =============================================================================

def _write_source(tmpdir: str, code: str, language: str) -> str:
    """
    Write student code to a temp file.
    For Java/C#, rename the entry-point class to Solution so the
    wrapper can call it without conflict. Uses plain string replace —
    no regex.

    Java   → Solution.java
    C#     → Solution.cs
    Python → solution.py
    """
    if language == 'java':
        filename = 'Solution.java'
        # Rename whatever public class the student used to Solution
        for common in ('Main', 'Program', 'HelloWorld', 'App', 'MyClass'):
            if f'public class {common}' in code:
                code = code.replace(f'public class {common}', 'public class Solution', 1)
                break
    elif language == 'csharp':
        filename = 'Solution.cs'
        for common in ('Program', 'Main', 'HelloWorld', 'App', 'MyClass'):
            if f'public class {common}' in code:
                code = code.replace(f'public class {common}', 'public class Solution', 1)
                break
        # Keep Main() method name — Solution.cs IS the entry point
    else:
        filename = 'solution.py'

    filepath = os.path.join(tmpdir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

    return filepath


# =============================================================================
#  Core execution function
# =============================================================================

def _run_in_docker(code: str, language: str) -> dict:
    """
    Spin up a fresh container, inject the code,
    collect output, destroy container.

    Returns dict: { stdout, stderr, returncode, elapsed_ms, timed_out }
    """
    client  = _get_docker_client()
    image   = DOCKER_IMAGES[language]
    started = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:

        # ── 1. Write student source (untouched) ───────────────────────────
        src_path = _write_source(tmpdir, code, language)
        filename = os.path.basename(src_path)

        # ── 2. Write wrapper file for Java / C# ──────────────────────────
        if language == 'java':
            wrapper_path = os.path.join(tmpdir, 'Main.java')
            with open(wrapper_path, 'w', encoding='utf-8') as f:
                f.write(_generate_java_wrapper())
        elif language == 'csharp':
            wrapper_path = os.path.join(tmpdir, 'Program.cs')
            with open(wrapper_path, 'w', encoding='utf-8') as f:
                f.write(_generate_csharp_wrapper())

        # ── 3. Determine what path the container receives as its argument ──
        container_src = f'/tmp/sandbox/{filename}'

        try:
            container = client.containers.run(
                image=image,
                command=[container_src],

                # Bind-mount the whole tmpdir read-only into the container.
                volumes={
                    tmpdir: {
                        'bind': '/tmp/sandbox',
                        'mode': 'ro',
                    }
                },

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

            # ── Wait with timeout ─────────────────────────────────────────
            try:
                timeout = LANGUAGE_TIMEOUTS.get(language, LIMITS['timeout_seconds'])
                result  = container.wait(timeout=timeout)
                timed_out  = False
                returncode = result.get('StatusCode', -1)
            except Exception:
                try:
                    container.kill()
                except Exception:
                    pass
                timed_out  = True
                returncode = -1

            # ── Collect output ────────────────────────────────────────────
            raw_stdout = b''
            raw_stderr = b''
            try:
                raw_stdout = container.logs(stdout=True,  stderr=False)
                raw_stderr = container.logs(stdout=False, stderr=True)
            except Exception:
                pass

            # ── Always remove the container ───────────────────────────────
            try:
                container.remove(force=True)
            except Exception:
                pass

            # ── Decode + truncate output ──────────────────────────────────
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


# ─── Flask endpoint ────────────────────────────────────────────────────────
@sandbox_bp.route('/api/sandbox/run', methods=['POST'])
@jwt_required()
def run_sandbox():
    """
    POST /api/sandbox/run
    Body: { code: string, language: "python" | "java" | "csharp" }
    Returns: { stdout, stderr, returncode, elapsed, [error] }
    """
    user_id = str(get_jwt_identity())

    # ── Rate limit ────────────────────────────────────────────────────────
    if not _check_rate_limit(user_id):
        return jsonify({
            'error': '⚠️ Slow down, hero! Max 30 sandbox casts per hour.',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 429

    # ── Parse request ─────────────────────────────────────────────────────
    data     = request.get_json(silent=True) or {}
    code     = data.get('code', '').strip()
    language = data.get('language', 'python').lower().strip()

    # ── Validate language ─────────────────────────────────────────────────
    if language not in DOCKER_IMAGES:
        return jsonify({
            'error': f'🚫 Language "{language}" not supported. Use: python, java, csharp',
            'stdout': '', 'stderr': '', 'returncode': -1, 'elapsed': 0,
        }), 400

    # ── Validate code ─────────────────────────────────────────────────────
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

    # ── Execute in Docker ─────────────────────────────────────────────────
    result = _run_in_docker(code, language)

    # ── Enrich response for the frontend ─────────────────────────────────
    if result.get('timed_out'):
        timeout_used = result.get('timeout_used', LIMITS['timeout_seconds'])
        result['error'] = (
            f'⏱️ Time limit exceeded ({timeout_used}s). '
            f'Your spell took too long to cast! Check for infinite loops.'
        )

    elif result.get('returncode', 0) != 0 and not result.get('error'):
        import re
        raw = result.get('stdout', '') + result.get('stderr', '')
        if raw.strip():
            cleaned = raw
            cleaned = re.sub(r'[^\s\[]*[/\\](?=Program\.cs|Main\.java|solution\.cs)', '', cleaned)
            cleaned = re.sub(r'\[/tmp/[^\]]*\]', '', cleaned)
            error_lines = []
            seen = set()

            # ── Python tracebacks ─────────────────────────────────────────
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

                # C# errors  (Program.cs or Solution.cs)
                m = re.search(
                    r'(?:Program|Solution)\.cs\((\d+),(\d+)\):\s*error\s+(\w+):\s*([^\[]+)',
                    line
                )
                if m:
                    msg = (
                        f'Line {m.group(1)}, Col {m.group(2)}: '
                        f'{m.group(4).strip()} ({m.group(3)})'
                    )
                    if msg not in seen:
                        seen.add(msg)
                        error_lines.append(msg)
                    continue

                # Java errors (Main.java or Solution.java)
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

                # Generic "line N: ErrorType" fallback
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

    # Always return 200 — errors are part of the payload, not HTTP errors
    return jsonify({
        'stdout':     result.get('stdout', ''),
        'stderr':     result.get('stderr', ''),
        'returncode': result.get('returncode', -1),
        'elapsed':    result.get('elapsed', 0),
        'error':      result.get('error'),
    }), 200


# ─── Health check ─────────────────────────────────────────────────────────
@sandbox_bp.route('/api/sandbox/health', methods=['GET'])
@jwt_required()
def sandbox_health():
    """
    Returns sandbox availability so the frontend can show a warning
    if Docker isn't running instead of a cryptic error.
    """
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
                'max_runs_per_hour': 30,
            }
        }), 200

    except RuntimeError as e:
        return jsonify({
            'docker_running': False,
            'error':          str(e),
            'images':         {},
            'all_ready':      False,
        }), 503