"""
REAL execution check for the grading sandbox (Python, Java, C#). Run it on a machine that has a running Docker
daemon and the three sandbox images built (see forge-sandbox/build_images.sh). It calls the application's own
evaluate_code() -- no mocks, no demo runner -- and compares what comes back with what must come back.

    cd backend
    python verify_docker_execution.py            # all cases (the timeout cases take about 10 s / 15 s / 60 s)
    python verify_docker_execution.py --quick    # skip the timeout cases (NOT sufficient as release evidence)

It refuses to run if the app is in demo-stub mode or if evaluate_code has been replaced. It writes
docker_verification_<UTC>.json next to this file: Docker version, image ids, per-case result. That file (plus
the console table) is the evidence; it contains only the small test programs below, no student data.
Exit code 0 only if every case behaved as required.
"""
import os, sys, json, time, datetime
os.environ.pop('FORGE_DEMO', None); os.environ.pop('FORGE_DEMO_RUNNER', None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import app as A
if A.EXECUTION_MODE != 'docker-sandbox' or getattr(A.evaluate_code, '__module__', None) != 'app':
    raise SystemExit('refusing: the real sandbox is not active (execution mode / evaluate_code was replaced)')
from routes.sandbox import DOCKER_IMAGES, _get_docker_client

quick = '--quick' in sys.argv
try:
    client = _get_docker_client()
    info = client.version()
except Exception as e:
    raise SystemExit(f'cannot reach a Docker daemon: {e}')
images = {}
for lang, name in DOCKER_IMAGES.items():
    try:
        images[lang] = {'image': name, 'id': client.images.get(name).id}
    except Exception as e:
        raise SystemExit(f'image for {lang} ({name}) not found: {e}. Build it with forge-sandbox/build_images.sh')

TWO = [{'input': '2 3', 'expected': '5'}]
PROGRAMS = {
    'python': {
        'correct': ('a, b = map(int, input().split())\nprint(a + b)\n', TWO, 'passed'),
        'wrong_output': ('a, b = map(int, input().split())\nprint(a - b)\n', TWO, 'wrong_output'),
        'runtime_error': ('raise Exception("boom")\n', TWO, 'runtime_error'),
        'compile_error': ('def (:\n', TWO, 'runtime_error'),
        'timeout': ('while True:\n    pass\n', TWO, 'timeout'),
    },
    'java': {
        'correct': ('import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner s = new Scanner(System.in);\n    int a = s.nextInt(), b = s.nextInt();\n    System.out.println(a + b);\n  }\n}\n', TWO, 'passed'),
        'wrong_output': ('import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner s = new Scanner(System.in);\n    int a = s.nextInt(), b = s.nextInt();\n    System.out.println(a - b);\n  }\n}\n', TWO, 'wrong_output'),
        'runtime_error': ('public class Main {\n  public static void main(String[] args) {\n    throw new RuntimeException("boom");\n  }\n}\n', TWO, 'runtime_error'),
        'compile_error': ('public class Main {\n  void x( \n}\n', TWO, 'runtime_error'),
        'timeout': ('public class Main {\n  public static void main(String[] args) {\n    while (true) { }\n  }\n}\n', TWO, 'timeout'),
    },
    'csharp': {
        'correct': ('using System;\npublic class Program {\n  public static void Main() {\n    var p = Console.ReadLine().Split(\' \');\n    Console.WriteLine(int.Parse(p[0]) + int.Parse(p[1]));\n  }\n}\n', TWO, 'passed'),
        'wrong_output': ('using System;\npublic class Program {\n  public static void Main() {\n    var p = Console.ReadLine().Split(\' \');\n    Console.WriteLine(int.Parse(p[0]) - int.Parse(p[1]));\n  }\n}\n', TWO, 'wrong_output'),
        'runtime_error': ('using System;\npublic class Program {\n  public static void Main() {\n    throw new Exception("boom");\n  }\n}\n', TWO, 'runtime_error'),
        'compile_error': ('public class Program {\n  public static void Main() {\n    int x = ;\n  }\n}\n', TWO, 'runtime_error'),
        'timeout': ('public class Program {\n  public static void Main() {\n    while (true) { }\n  }\n}\n', TWO, 'timeout'),
    },
}
rows, failed = [], 0
print(f"Docker {info.get('Version')}  |  mode={A.EXECUTION_MODE}\n")
print(f"{'language':8} {'case':14} {'required':14} {'got':14} {'seconds':>7}  result")
for lang, cases in PROGRAMS.items():
    for case, (code, tests, want) in cases.items():
        if quick and case == 'timeout':
            continue
        t0 = time.time()
        try:
            res = A.evaluate_code(code, tests, lang, raise_on_infra=True)
            got = res[0]['kind']
        except Exception as e:                       # infrastructure problem: not a pass for any case
            got = 'INFRA:' + type(e).__name__ + ':' + str(e)[:80]
        dt = time.time() - t0
        ok = got == want
        failed += (not ok)
        rows.append({'language': lang, 'case': case, 'required': want, 'got': got, 'seconds': round(dt, 1), 'ok': ok})
        print(f"{lang:8} {case:14} {want:14} {got[:14]:14} {dt:7.1f}  {'PASS' if ok else 'FAIL'}")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"docker_verification_{datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.json")
json.dump({'utc': datetime.datetime.utcnow().isoformat() + 'Z', 'docker_version': info.get('Version'), 'images': images,
           'quick_mode_not_release_evidence': quick, 'cases': rows}, open(out, 'w'), indent=1)
print('\nevidence written to', out)
print('ALL REQUIRED BEHAVIOURS OBSERVED' if not failed else f'{failed} CASE(S) FAILED')
sys.exit(1 if failed else 0)
